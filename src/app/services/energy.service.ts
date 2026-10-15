import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalstoreService } from './localstore.service';
import {
  LOCAL_STORAGE_KEYS,
  ENERGY_MAX,
  ENERGY_PER_GAME,
  ENERGY_PER_EVENT_GAME,
  ENERGY_REFILL_INTERVAL_MS,
  AD_ENERGY_GRANT,
  AD_ENERGY_MAX_PER_DAY
} from '../entities/constants';

// Rewarded-ad energy grants counted for one local calendar day.
interface ad_day {
  date: string;
  count: number;
}

// Local-time YYYY-MM-DD, so the ad cap resets at the player's own midnight.
export function localDay(t: number): string {
  const d = new Date(t);
  const mm = `${d.getMonth() + 1}`.padStart(2, '0');
  const dd = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

@Injectable({ providedIn: 'root' })
export class EnergyService {
  private lstore = inject(LocalstoreService);

  // Current energy and the timestamp from which the next refill increment is
  // measured. `now` ticks every second so countdown UI recomputes reactively
  // (and the daily ad cap rolls over at midnight without a reload).
  energy = signal<number>(ENERGY_MAX);
  private lastRefillTs = signal<number>(Date.now());
  private now = signal<number>(Date.now());

  readonly max = ENERGY_MAX;
  readonly perGame = ENERGY_PER_GAME;
  readonly perEventGame = ENERGY_PER_EVENT_GAME;
  readonly adGrant = AD_ENERGY_GRANT;
  readonly adMaxPerDay = AD_ENERGY_MAX_PER_DAY;

  private adDay = signal<ad_day>({ date: '', count: 0 });

  adsWatchedToday = computed(() =>
    this.adDay().date === localDay(this.now()) ? this.adDay().count : 0
  );

  adsLeftToday = computed(() => Math.max(0, AD_ENERGY_MAX_PER_DAY - this.adsWatchedToday()));

  canWatchAdForEnergy = computed(() =>
    this.lstore.energyOverride() || this.adsWatchedToday() < AD_ENERGY_MAX_PER_DAY
  );

  private ticker: ReturnType<typeof setInterval> | null = null;

  // ms until the next single point of energy arrives (0 when already full).
  msToNextPoint = computed(() => {
    if (this.energy() >= ENERGY_MAX) return 0;
    const elapsed = this.now() - this.lastRefillTs();
    const rem = ENERGY_REFILL_INTERVAL_MS - (elapsed % ENERGY_REFILL_INTERVAL_MS);
    return Math.max(0, rem);
  });

  // "M:SS" until the next point, or '' when full / overridden.
  countdown = computed(() => {
    if (this.lstore.energyOverride()) return '';
    const ms = this.msToNextPoint();
    return ms > 0 ? formatDuration(ms) : '';
  });

  // Whether the player has enough to start (always true when overridden).
  canStart = computed(() => this.lstore.energyOverride() || this.energy() >= ENERGY_PER_GAME);

  // True while the dev override is active — UI shows an unlimited symbol.
  overridden = computed(() => this.lstore.energyOverride());

  // Load persisted state, apply any offline refill, and start the ticker.
  init() {
    const storedAd = this.lstore.get(LOCAL_STORAGE_KEYS.EnergyAdDaily);
    if (storedAd) {
      try {
        const parsed = JSON.parse(storedAd);
        if (parsed && typeof parsed.date === 'string' && typeof parsed.count === 'number') {
          this.adDay.set({ date: parsed.date, count: parsed.count });
        }
      } catch { /* corrupt value — ignore */ }
    }

    const storedEnergy = this.lstore.get(LOCAL_STORAGE_KEYS.Energy);
    const storedTs = this.lstore.get(LOCAL_STORAGE_KEYS.EnergyTs);
    if (storedEnergy === null || storedEnergy === undefined) {
      // First run — start full.
      this.energy.set(ENERGY_MAX);
      this.lastRefillTs.set(Date.now());
      this.persist();
    } else {
      this.energy.set(Math.max(0, Math.min(ENERGY_MAX, +storedEnergy || 0)));
      this.lastRefillTs.set(storedTs ? +storedTs : Date.now());
      this.applyRefill();
    }
    if (!this.ticker) {
      this.ticker = setInterval(() => {
        this.now.set(Date.now());
        this.applyRefill();
      }, 1000);
    }
  }

  // Credit whole refill intervals elapsed since lastRefillTs, capped at max.
  private applyRefill() {
    if (this.energy() >= ENERGY_MAX) {
      // At cap: keep the timestamp current so it doesn't bank while full.
      this.lastRefillTs.set(Date.now());
      this.persist();
      return;
    }
    const elapsed = Date.now() - this.lastRefillTs();
    const gained = Math.floor(elapsed / ENERGY_REFILL_INTERVAL_MS);
    if (gained <= 0) return;
    const next = Math.min(ENERGY_MAX, this.energy() + gained);
    this.energy.set(next);
    // Advance the anchor by the consumed intervals (not to "now") so partial
    // progress toward the next point is preserved.
    this.lastRefillTs.set(this.lastRefillTs() + gained * ENERGY_REFILL_INTERVAL_MS);
    this.persist();
  }

  // Spend one puzzle's worth. Returns false (no change) if insufficient.
  // With the dev override on, play is free — nothing is deducted.
  spendForGame(cost: number = ENERGY_PER_GAME): boolean {
    if (this.lstore.energyOverride()) return true;
    this.applyRefill();
    if (this.energy() < cost) return false;
    // Leaving the cap: anchor the refill clock from now.
    if (this.energy() >= ENERGY_MAX) this.lastRefillTs.set(Date.now());
    this.energy.set(this.energy() - cost);
    this.persist();
    return true;
  }

  // Time until the passive refill reaches `cost` ('' when already affordable).
  timeToAfford(cost: number = ENERGY_PER_GAME): string {
    const short = cost - this.energy();
    if (short <= 0 || this.lstore.energyOverride()) return '';
    const ms = this.msToNextPoint() + (short - 1) * ENERGY_REFILL_INTERVAL_MS;
    return formatDuration(ms);
  }

  // Rewarded-ad top-up: +AD_ENERGY_GRANT (capped at max) and one more of
  // today's AD_ENERGY_MAX_PER_DAY. Callers check canWatchAdForEnergy() first.
  grantFromAd() {
    this.energy.set(Math.min(ENERGY_MAX, this.energy() + AD_ENERGY_GRANT));
    const today = localDay(Date.now());
    this.now.set(Date.now());
    const prev = this.adDay();
    this.adDay.set({ date: today, count: (prev.date === today ? prev.count : 0) + 1 });
    this.persist();
  }

  private persist() {
    this.lstore.set(LOCAL_STORAGE_KEYS.Energy, `${this.energy()}`);
    this.lstore.set(LOCAL_STORAGE_KEYS.EnergyTs, `${this.lastRefillTs()}`);
    this.lstore.set(LOCAL_STORAGE_KEYS.EnergyAdDaily, JSON.stringify(this.adDay()));
  }
}
