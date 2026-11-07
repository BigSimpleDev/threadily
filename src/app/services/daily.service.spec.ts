import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  DailyService, dayNumberAt, msToNextDay, streakAfterLoss, streakAfterWin, streakOnDay, streak_state, daily_result
} from './daily.service';
import { LocalstoreService } from './localstore.service';
import { DAILY_RESULTS_KEPT, DAILY_STREAK_REWARDS, LOCAL_STORAGE_KEYS } from '../entities/constants';

const EPOCH = '2026-11-07';
const at = (y: number, m: number, d: number, h = 0, min = 0, s = 0, ms = 0) =>
  new Date(y, m - 1, d, h, min, s, ms).getTime();

describe('dayNumberAt', () => {
  it('is 1 on the epoch, all day long', () => {
    expect(dayNumberAt(at(2026, 11, 7, 0, 0), EPOCH)).toBe(1);
    expect(dayNumberAt(at(2026, 11, 7, 23, 59, 59, 999), EPOCH)).toBe(1);
  });

  it('ticks over exactly at local midnight', () => {
    expect(dayNumberAt(at(2026, 11, 7, 23, 59, 59, 999), EPOCH)).toBe(1);
    expect(dayNumberAt(at(2026, 11, 8, 0, 0, 0, 0), EPOCH)).toBe(2);
  });

  it('counts one per calendar day across DST changes (no skip, no repeat)', () => {
    // US spring-forward (Mar 14 2027) and fall-back (Nov 7 2027); in any
    // other zone these are just ordinary days, which must also hold.
    for (const [y, m, d] of [[2027, 3, 13], [2027, 11, 6], [2027, 3, 27], [2027, 10, 30]]) {
      const a = dayNumberAt(at(y, m, d, 12), EPOCH);
      expect(dayNumberAt(at(y, m, d + 1, 0, 30), EPOCH)).toBe(a + 1);
      expect(dayNumberAt(at(y, m, d + 1, 23, 30), EPOCH)).toBe(a + 1);
      expect(dayNumberAt(at(y, m, d + 2, 0, 30), EPOCH)).toBe(a + 2);
    }
  });

  it('runs a year in 365 steps and is ≤ 0 before the epoch', () => {
    expect(dayNumberAt(at(2027, 11, 7, 9), EPOCH)).toBe(366);
    expect(dayNumberAt(at(2026, 11, 6, 23), EPOCH)).toBe(0);
  });

  it('msToNextDay counts down to local midnight', () => {
    expect(msToNextDay(at(2026, 11, 7, 23, 59, 0))).toBe(60_000);
  });
});

describe('streak rules', () => {
  const zero: streak_state = { current: 0, best: 0, lastWon: 0 };

  it('win, win → 2', () => {
    const s = streakAfterWin(streakAfterWin(zero, 5), 6);
    expect(s).toEqual({ current: 2, best: 2, lastWon: 6 });
  });

  it('win, skip, win → resets to 0 on the missed day, then 1', () => {
    let s = streakAfterWin(zero, 5);
    expect(streakOnDay(s, 6).current).toBe(1); // yesterday's win still stands
    s = streakOnDay(s, 7);
    expect(s.current).toBe(0);
    s = streakAfterWin(s, 7);
    expect(s).toEqual({ current: 1, best: 1, lastWon: 7 });
  });

  it('a loss drops to 0 but keeps best', () => {
    const s = streakAfterLoss(streakAfterWin(streakAfterWin(zero, 1), 2));
    expect(s.current).toBe(0);
    expect(s.best).toBe(2);
    expect(streakAfterWin(s, 3).current).toBe(1);
  });
});

describe('DailyService', () => {
  let svc: DailyService;
  let lstore: LocalstoreService;
  let http: HttpTestingController;

  const won = (day: number): daily_result =>
    ({ day, status: 'won', attempts: ['hit'], heartsLeft: 3, hints: 0, adContinues: 0 });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    svc = TestBed.inject(DailyService);
    lstore = TestBed.inject(LocalstoreService);
    http = TestBed.inject(HttpTestingController);
    lstore.setPlayerInfo();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('records a win, persists the streak, and treats the day as final', () => {
    svc.record(won(10));
    expect(svc.streak()).toEqual({ current: 1, best: 1, lastWon: 10 });
    expect(lstore.get(LOCAL_STORAGE_KEYS.DailyLastWon)).toBe('10');
    expect(svc.record({ ...won(10), status: 'lost' })).toBe(0);
    expect(svc.resultFor(10)!.status).toBe('won');
  });

  it('pays the milestone coins when the streak reaches one', () => {
    svc.record(won(1));
    svc.record(won(2));
    expect(lstore.coins()).toBe(0);
    expect(svc.record(won(3))).toBe(DAILY_STREAK_REWARDS[3]);
    expect(lstore.coins()).toBe(DAILY_STREAK_REWARDS[3]);
  });

  it('keeps only the last DAILY_RESULTS_KEPT days', () => {
    svc.record(won(1));
    svc.record(won(1 + DAILY_RESULTS_KEPT));
    expect(svc.results().map(r => r.day)).toEqual([1 + DAILY_RESULTS_KEPT]);
  });

  it('clears a broken streak on load', () => {
    lstore.set(LOCAL_STORAGE_KEYS.DailyStreak, '4');
    lstore.set(LOCAL_STORAGE_KEYS.DailyStreakBest, '4');
    lstore.set(LOCAL_STORAGE_KEYS.DailyLastWon, `${svc.today() - 2}`);
    svc.refresh();
    expect(svc.streak().current).toBe(0);
    expect(svc.streak().best).toBe(4);
    expect(lstore.get(LOCAL_STORAGE_KEYS.DailyStreak)).toBe('0');
  });

  it('wraps past the end of the schedule with a warning', () => {
    const warn = spyOn(console, 'warn');
    expect(svc.puzzleIdFor([7, 8, 9], 2)).toBe(8);
    expect(warn).not.toHaveBeenCalled();
    expect(svc.puzzleIdFor([7, 8, 9], 5)).toBe(8);
    expect(warn).toHaveBeenCalled();
    expect(svc.puzzleIdFor([7, 8, 9], 0)).toBeNull();
  });

  it('resolves a day to its pack and index', () => {
    let ref: any;
    svc.refFor(2).subscribe(r => ref = r);
    http.expectOne('assets/daily/schedule.json').flush([150, 102]);
    http.expectOne('assets/puzzles/2.json').flush({
      pack: 2,
      puzzles: [{ id: 101, rating: 1, categories: [] }, { id: 102, rating: 3, categories: [] }]
    });
    expect(ref.pack).toBe(2);
    expect(ref.index).toBe(1);
    expect(ref.puzzle.id).toBe(102);
  });
});
