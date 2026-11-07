import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, switchMap } from 'rxjs';
import {
  DAILY_EPOCH, DAILY_RESULTS_KEPT, DAILY_STREAK_REWARDS, LOCAL_STORAGE_KEYS, PUZZLES_PER_PACK
} from '../entities/constants';
import { puzzle } from '../entities/entities';
import { LocalstoreService } from './localstore.service';
import { GameService } from './game.service';
import { formatDuration } from './energy.service';
import { share_result } from './share.service';

const DAY_MS = 86400000;

export interface daily_result extends share_result {
  day: number;
}

export interface streak_state {
  current: number;
  best: number;
  // Day number of the most recent daily win (0 = never).
  lastWon: number;
}

export interface daily_ref {
  day: number;
  pack: number;
  index: number;
  puzzle: puzzle;
}

// Daily number for a moment: whole local calendar days since DAILY_EPOCH, with
// the epoch itself = 1. Local Y/M/D go through Date.UTC so a 23- or 25-hour
// DST day still counts as exactly one day. Before the epoch this is ≤ 0.
export function dayNumberAt(t: number, epoch: string = DAILY_EPOCH): number {
  const d = new Date(t);
  const [y, m, dd] = epoch.split('-').map(Number);
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(y, m - 1, dd)) / DAY_MS) + 1;
}

// ms from t to the next local midnight, when the next daily unlocks.
export function msToNextDay(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - t;
}

// Streak rules, shared with Trivily / Decryptly: a win the day after the last
// win extends the streak, any other win restarts it at 1, a loss or a missed
// day drops it to 0.
export function streakAfterWin(s: streak_state, day: number): streak_state {
  const current = s.lastWon === day - 1 ? s.current + 1 : 1;
  return { current, best: Math.max(s.best, current), lastWon: day };
}

export function streakAfterLoss(s: streak_state): streak_state {
  return { ...s, current: 0 };
}

// Lazy missed-day check: once a full day has passed without a win, the streak
// is gone. Yesterday's win still stands until today ends.
export function streakOnDay(s: streak_state, today: number): streak_state {
  return s.current > 0 && s.lastWon < today - 1 ? { ...s, current: 0 } : s;
}

@Injectable({ providedIn: 'root' })
export class DailyService {
  private http = inject(HttpClient);
  private lstore = inject(LocalstoreService);
  private gameSvc = inject(GameService);

  private now = signal(Date.now());
  private ticker: ReturnType<typeof setInterval> | null = null;

  today = computed(() => dayNumberAt(this.now()));
  // "H:MM:SS" until the next daily.
  countdown = computed(() => formatDuration(msToNextDay(this.now())));

  results = signal<daily_result[]>([]);
  streak = signal<streak_state>({ current: 0, best: 0, lastWon: 0 });
  todayResult = computed(() => this.results().find(r => r.day === this.today()) ?? null);

  private schedule$?: Observable<number[]>;

  // Load persisted state, apply any missed day, and tick the clock each second
  // so the countdown runs and the card rolls over at midnight.
  init() {
    this.load();
    if (!this.ticker) {
      this.ticker = setInterval(() => {
        const before = this.today();
        this.now.set(Date.now());
        if (this.today() !== before) this.refresh();
      }, 1000);
    }
  }

  // Re-read storage and drop a streak that a missed day has broken.
  refresh() {
    this.now.set(Date.now());
    this.load();
  }

  private load() {
    let results: daily_result[] = [];
    try {
      const parsed = JSON.parse(this.lstore.get(LOCAL_STORAGE_KEYS.DailyResults) ?? '[]');
      if (Array.isArray(parsed)) results = parsed;
    } catch { /* corrupt — start clean */ }
    this.results.set(results);
    const stored: streak_state = {
      current: +(this.lstore.get(LOCAL_STORAGE_KEYS.DailyStreak) ?? 0) || 0,
      best: +(this.lstore.get(LOCAL_STORAGE_KEYS.DailyStreakBest) ?? 0) || 0,
      lastWon: +(this.lstore.get(LOCAL_STORAGE_KEYS.DailyLastWon) ?? 0) || 0
    };
    const s = streakOnDay(stored, this.today());
    if (s !== stored) this.saveStreak(s);
    else this.streak.set(s);
  }

  resultFor(day: number): daily_result | null {
    return this.results().find(r => r.day === day) ?? null;
  }

  // The puzzle id scheduled for `day`. Past the end of the file the schedule
  // wraps — a stopgap until `npm run daily` extends it.
  puzzleIdFor(schedule: number[], day: number): number | null {
    if (!schedule.length || day < 1) return null;
    if (day > schedule.length) console.warn(`Daily #${day} is past the schedule (${schedule.length} days); wrapping. Run npm run daily.`);
    return schedule[(day - 1) % schedule.length];
  }

  private schedule(): Observable<number[]> {
    this.schedule$ ??= this.http.get<number[]>('assets/daily/schedule.json').pipe(
      catchError(() => of([])),
      shareReplay(1)
    );
    return this.schedule$;
  }

  // Where `day`'s puzzle lives. Null before the epoch or if it can't be found.
  refFor(day: number): Observable<daily_ref | null> {
    return this.schedule().pipe(
      switchMap(s => {
        const id = this.puzzleIdFor(s, day);
        if (id === null) return of(null);
        const pack = Math.ceil(id / PUZZLES_PER_PACK);
        return this.gameSvc.getPack(pack).pipe(map(pd => {
          const index = pd?.puzzles.findIndex(p => p.id === id) ?? -1;
          return index < 0 ? null : { day, pack, index, puzzle: pd!.puzzles[index] };
        }));
      })
    );
  }

  // Save a finished daily and move the streak. Returns the streak-milestone
  // coins earned (already added), 0 if none. A day already recorded is final.
  record(result: daily_result): number {
    if (this.resultFor(result.day)) return 0;
    const keepFrom = result.day - DAILY_RESULTS_KEPT + 1;
    const results = [...this.results().filter(r => r.day >= keepFrom), result].sort((a, b) => a.day - b.day);
    this.results.set(results);
    this.lstore.set(LOCAL_STORAGE_KEYS.DailyResults, JSON.stringify(results));

    if (result.status === 'lost') {
      this.saveStreak(streakAfterLoss(this.streak()));
      return 0;
    }
    const s = streakAfterWin(this.streak(), result.day);
    this.saveStreak(s);
    const reward = DAILY_STREAK_REWARDS[s.current] ?? 0;
    if (reward) this.lstore.addCoins(reward);
    return reward;
  }

  private saveStreak(s: streak_state) {
    this.streak.set(s);
    this.lstore.set(LOCAL_STORAGE_KEYS.DailyStreak, `${s.current}`);
    this.lstore.set(LOCAL_STORAGE_KEYS.DailyStreakBest, `${s.best}`);
    this.lstore.set(LOCAL_STORAGE_KEYS.DailyLastWon, `${s.lastWon}`);
  }
}
