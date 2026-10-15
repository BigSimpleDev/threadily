import { Injectable, computed, inject, signal } from '@angular/core';
import { LocalstoreService } from './localstore.service';
import {
  LOCAL_STORAGE_KEYS,
  ENERGY_MAX,
  ENERGY_PER_GAME,
  ENERGY_PER_EVENT_GAME,
  ENERGY_REFILL_INTERVAL_MS,
  AD_ENERGY_GRANT,
  AD_ENERGY_MAX_PER_HOUR,
  ENERGY_AD_WINDOW_MS
} from '../entities/constants';

@Injectable({ providedIn: 'root' })
export class EnergyService {
  private lstore = inject(LocalstoreService);

  // Current energy and the timestamp from which the next refill increment is
  // measured. `now` ticks every second so countdown UI recomputes reactively.
  energy = signal<number>(ENERGY_MAX);
  private lastRefillTs = signal<number>(Date.now());
  private now = signal<number>(Date.now());

  readonly max = ENERGY_MAX;
  readonly perGame = ENERGY_PER_GAME;
  readonly perEventGame = ENERGY_PER_EVENT_GAME;
  readonly adGrant = AD_ENERGY_GRANT;
  readonly adMaxPerHour = AD_ENERGY_MAX_PER_HOUR;

  // Timestamps of rewarded-ad energy grants, used to cap them to
  // AD_ENERGY_MAX_PER_HOUR within a rolling hour.
  private adTimestamps = signal<number[]>([]);

  adsWatchedThisHour = computed(() => {
    const cutoff = this.now() - ENERGY_AD_WINDOW_MS;
    return this.adTimestamps().filter(t => t > cutoff).length;
  });

  canWatchAdForEnergy = computed(() =>
    this.lstore.energyOverride() || this.adsWatchedThisHour() < AD_ENERGY_MAX_PER_HOUR
  );

  private ticker: ReturnType<typeof setInterval> | null = null;

  // ms until the next single point of energy arrives (0 when already full).
  msToNextPoint = computed(() => {
    if (this.energy() >= ENERGY_MAX) return 0;
    const elapsed = this.now() - this.lastRefillTs();
    const rem = ENERGY_REFILL_INTERVAL_MS - (elapsed % ENERGY_REFILL_INTERVAL_MS);
    return Math.max(0, rem);
  });

  // "MM:SS" until the next point, or '' when full / overridden.
  countdown = computed(() => {
    if (this.lstore.energyOverride()) return '';
    const ms = this.msToNextPoint();
    if (ms <= 0) return '';
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  });

  // Whether the player has enough to start (always true when overridden).
  canStart = computed(() => this.lstore.energyOverride() || this.energy() >= ENERGY_PER_GAME);

  // True while the dev override is active — UI shows an unlimited symbol.
  overridden = computed(() => this.lstore.energyOverride());

  // Load persisted state, apply any offline refill, and start the ticker.
  init() {
    const storedAdTs = this.lstore.get(LOCAL_STORAGE_KEYS.EnergyAdTimestamps);
    if (storedAdTs) {
      try {
        const parsed = JSON.parse(storedAdTs);
        if (Array.isArray(parsed)) this.adTimestamps.set(parsed.filter((t: unknown) => typeof t === 'number'));
      } catch { /* corrupt/legacy value — ignore */ }
    }

    const storedEnergy = this.lstore.get(LOCAL_STORAGE_KEYS.Energy);
    const storedTs = this.lstore.get(LOCAL_STORAGE_KEYS.EnergyTs);
    if (storedEnergy === null || storedEnergy === undefined) {
      // First run — start full.
      this.energy.set(ENERGY_MAX);
      this.lastRefillTs.set(Date.now());
      this.persist();
    } else {
      this.energy.set(Math.max(0, Math.min(ENERGY_MAX, +storedEnergy)));
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

  // Spend one game's worth. Returns false (no change) if insufficient.
  // With the dev override on, play is free — nothing is deducted.
  // `cost` defaults to a main-progression theme; event themes pass the cheaper
  // ENERGY_PER_EVENT_GAME instead.
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

  // Rewarded-ad top-up. Adds AD_ENERGY_GRANT energy (capped) and records the
  // grant so canWatchAdForEnergy can enforce the rolling-hour limit. Callers
  // should check canWatchAdForEnergy() before showing the ad.
  grantFromAd() {
    this.energy.set(Math.min(ENERGY_MAX, this.energy() + AD_ENERGY_GRANT));
    const cutoff = Date.now() - ENERGY_AD_WINDOW_MS;
    this.adTimestamps.set([...this.adTimestamps().filter(t => t > cutoff), Date.now()]);
    this.persist();
  }

  private persist() {
    this.lstore.set(LOCAL_STORAGE_KEYS.Energy, `${this.energy()}`);
    this.lstore.set(LOCAL_STORAGE_KEYS.EnergyTs, `${this.lastRefillTs()}`);
    this.lstore.set(LOCAL_STORAGE_KEYS.EnergyAdTimestamps, JSON.stringify(this.adTimestamps()));
  }
}
