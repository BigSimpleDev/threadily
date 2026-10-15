import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { EnergyService, localDay } from './energy.service';
import { LocalstoreService } from './localstore.service';
import {
  ENERGY_MAX, ENERGY_PER_GAME, ENERGY_PER_EVENT_GAME, AD_ENERGY_GRANT,
  AD_ENERGY_MAX_PER_DAY, ENERGY_REFILL_INTERVAL_MS, LOCAL_STORAGE_KEYS
} from '../entities/constants';

describe('EnergyService', () => {
  let svc: EnergyService;
  let lstore: LocalstoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    lstore = TestBed.inject(LocalstoreService);
    svc = TestBed.inject(EnergyService);
  });

  afterEach(() => localStorage.clear());

  describe('spendForGame', () => {
    it('charges the cheaper event rate when one is passed', () => {
      svc.energy.set(ENERGY_MAX);
      expect(svc.spendForGame(ENERGY_PER_EVENT_GAME)).toBeTrue();
      expect(svc.energy()).toBe(ENERGY_MAX - ENERGY_PER_EVENT_GAME);
      expect(ENERGY_PER_EVENT_GAME).toBeLessThan(ENERGY_PER_GAME);
    });

    it('refuses an event theme the player cannot afford', () => {
      svc.energy.set(ENERGY_PER_EVENT_GAME - 1);
      expect(svc.spendForGame(ENERGY_PER_EVENT_GAME)).toBeFalse();
      expect(svc.energy()).toBe(ENERGY_PER_EVENT_GAME - 1);
    });

    it('deducts a game worth of energy when affordable', () => {
      svc.energy.set(ENERGY_MAX);
      expect(svc.spendForGame()).toBeTrue();
      expect(svc.energy()).toBe(ENERGY_MAX - ENERGY_PER_GAME);
    });

    it('refuses and changes nothing when short', () => {
      svc.energy.set(ENERGY_PER_GAME - 1);
      expect(svc.spendForGame()).toBeFalse();
      expect(svc.energy()).toBe(ENERGY_PER_GAME - 1);
    });

    it('is free (no deduction) with the dev override on', () => {
      lstore.setEnergyOverride(true);
      svc.energy.set(3);
      expect(svc.spendForGame()).toBeTrue();
      expect(svc.energy()).toBe(3);
      expect(svc.canStart()).toBeTrue();
    });
  });

  describe('grantFromAd + daily cap', () => {
    it('adds a grant, capped at the ceiling', () => {
      svc.energy.set(ENERGY_MAX - 2);
      svc.grantFromAd();
      expect(svc.energy()).toBe(ENERGY_MAX);
    });

    it('adds the full grant when there is room', () => {
      svc.energy.set(10);
      svc.grantFromAd();
      expect(svc.energy()).toBe(10 + AD_ENERGY_GRANT);
    });

    it('stops allowing ad energy after the daily cap', () => {
      svc.energy.set(0);
      for (let i = 0; i < AD_ENERGY_MAX_PER_DAY; i++) svc.grantFromAd();
      expect(svc.adsWatchedToday()).toBe(AD_ENERGY_MAX_PER_DAY);
      expect(svc.adsLeftToday()).toBe(0);
      expect(svc.canWatchAdForEnergy()).toBeFalse();
    });

    it('counts down the ads left today', () => {
      svc.grantFromAd();
      svc.grantFromAd();
      expect(svc.adsLeftToday()).toBe(AD_ENERGY_MAX_PER_DAY - 2);
    });

    it('persists the day and count under bsd.thr.energy_ad_daily', () => {
      svc.grantFromAd();
      const stored = JSON.parse(lstore.get(LOCAL_STORAGE_KEYS.EnergyAdDaily));
      expect(stored).toEqual({ date: localDay(Date.now()), count: 1 });
    });

    it('resets at local midnight', fakeAsync(() => {
      // Five ads watched "yesterday" — none count today.
      const yesterday = localDay(Date.now() - 24 * 60 * 60 * 1000);
      lstore.set(LOCAL_STORAGE_KEYS.EnergyAdDaily, JSON.stringify({ date: yesterday, count: AD_ENERGY_MAX_PER_DAY }));
      svc.init();
      expect(svc.adsWatchedToday()).toBe(0);
      expect(svc.canWatchAdForEnergy()).toBeTrue();
      svc.grantFromAd();
      expect(JSON.parse(lstore.get(LOCAL_STORAGE_KEYS.EnergyAdDaily))).toEqual({ date: localDay(Date.now()), count: 1 });
      discardPeriodicTasks();
    }));

    it('rolls over while the app stays open across midnight', fakeAsync(() => {
      // fakeAsync owns Date here: tick the 1s ticker forward past the next
      // local midnight and the cap must lift without a reload.
      svc.init();
      for (let i = 0; i < AD_ENERGY_MAX_PER_DAY; i++) svc.grantFromAd();
      expect(svc.canWatchAdForEnergy()).toBeFalse();
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      tick(midnight - now.getTime() + 2000);
      expect(svc.adsWatchedToday()).toBe(0);
      expect(svc.canWatchAdForEnergy()).toBeTrue();
      discardPeriodicTasks();
    }));

    it('the override bypasses the daily cap', () => {
      lstore.setEnergyOverride(true);
      svc.energy.set(0);
      for (let i = 0; i < AD_ENERGY_MAX_PER_DAY + 2; i++) svc.grantFromAd();
      expect(svc.canWatchAdForEnergy()).toBeTrue();
    });
  });

  describe('timeToAfford', () => {
    it('is empty when already affordable', () => {
      svc.energy.set(ENERGY_PER_GAME);
      expect(svc.timeToAfford()).toBe('');
    });

    it('estimates the wait for the shortfall', () => {
      svc.energy.set(ENERGY_PER_GAME - 3);
      // 3 points short at 6 min each: just under 18 minutes.
      expect(svc.timeToAfford()).toMatch(/^1[78]:\d{2}$/);
    });
  });

  describe('init + offline refill', () => {
    it('starts full on first run', fakeAsync(() => {
      svc.init();
      expect(svc.energy()).toBe(ENERGY_MAX);
      discardPeriodicTasks();
    }));

    it('credits whole refill intervals elapsed while away', fakeAsync(() => {
      lstore.set(LOCAL_STORAGE_KEYS.Energy, '20');
      lstore.set(LOCAL_STORAGE_KEYS.EnergyTs, `${Date.now() - ENERGY_REFILL_INTERVAL_MS * 3 - 5}`);
      svc.init();
      expect(svc.energy()).toBe(23);
      discardPeriodicTasks();
    }));

    it('clamps a corrupt stored value into range', fakeAsync(() => {
      lstore.set(LOCAL_STORAGE_KEYS.Energy, '99999');
      lstore.set(LOCAL_STORAGE_KEYS.EnergyTs, `${Date.now()}`);
      svc.init();
      expect(svc.energy()).toBe(ENERGY_MAX);
      discardPeriodicTasks();
    }));
  });

  describe('countdown', () => {
    it('is empty while full', () => {
      svc.energy.set(ENERGY_MAX);
      expect(svc.countdown()).toBe('');
    });

    it('is empty when overridden even if not full', () => {
      lstore.setEnergyOverride(true);
      svc.energy.set(1);
      expect(svc.countdown()).toBe('');
    });

    it('formats MM:SS while refilling', () => {
      svc.energy.set(5);
      expect(svc.countdown()).toMatch(/^\d+:\d{2}$/);
    });
  });
});
