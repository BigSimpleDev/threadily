import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { EnergyService } from './energy.service';
import { LocalstoreService } from './localstore.service';
import {
  ENERGY_MAX, ENERGY_PER_GAME, ENERGY_PER_EVENT_GAME, AD_ENERGY_GRANT,
  AD_ENERGY_MAX_PER_HOUR, ENERGY_REFILL_INTERVAL_MS, LOCAL_STORAGE_KEYS
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

  describe('grantFromAd + rolling-hour cap', () => {
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

    it('stops allowing ad energy after the hourly cap', () => {
      svc.energy.set(0);
      for (let i = 0; i < AD_ENERGY_MAX_PER_HOUR; i++) svc.grantFromAd();
      expect(svc.adsWatchedThisHour()).toBe(AD_ENERGY_MAX_PER_HOUR);
      expect(svc.canWatchAdForEnergy()).toBeFalse();
    });

    it('the override bypasses the hourly cap', () => {
      lstore.setEnergyOverride(true);
      svc.energy.set(0);
      for (let i = 0; i < AD_ENERGY_MAX_PER_HOUR + 2; i++) svc.grantFromAd();
      expect(svc.canWatchAdForEnergy()).toBeTrue();
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
