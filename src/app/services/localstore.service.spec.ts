import { TestBed } from '@angular/core/testing';
import { LocalstoreService } from './localstore.service';
import { LOCAL_STORAGE_KEYS } from '../entities/constants';
import { trinket } from '../entities/entities';

describe('LocalstoreService', () => {
  let svc: LocalstoreService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({});
    svc = TestBed.inject(LocalstoreService);
  });

  afterEach(() => localStorage.clear());

  describe('setPlayerInfo', () => {
    it('defaults to pack 1 / puzzle 0 when nothing is stored', () => {
      svc.setPlayerInfo();
      expect(svc.currentPack()).toBe(1);
      expect(svc.currentPuzzle()).toBe(0);
      expect(svc.solved()).toEqual([]);
      expect(svc.coins()).toBe(0);
      expect(svc.ownedTrinkets()).toEqual([]);
    });

    it('reads persisted values', () => {
      svc.set(LOCAL_STORAGE_KEYS.CurrentPack, '3');
      svc.set(LOCAL_STORAGE_KEYS.CurrentPuzzle, '4');
      svc.set(LOCAL_STORAGE_KEYS.Coins, '120');
      svc.set(LOCAL_STORAGE_KEYS.Solved, JSON.stringify([1, 5]));

      svc.setPlayerInfo();

      expect(svc.currentPack()).toBe(3);
      expect(svc.currentPuzzle()).toBe(4);
      expect(svc.coins()).toBe(120);
      expect(svc.solved()).toEqual([1, 5]);
    });

    it('survives corrupt JSON', () => {
      svc.set(LOCAL_STORAGE_KEYS.Solved, '{nope');
      svc.set(LOCAL_STORAGE_KEYS.FeaturedTrinket, '{nope');
      svc.setPlayerInfo();
      expect(svc.solved()).toEqual([]);
      expect(svc.featuredTrinket()).toBeNull();
    });
  });

  describe('progress', () => {
    it('marks puzzles solved once, sorted, and persists', () => {
      svc.markSolved(7);
      svc.markSolved(2);
      svc.markSolved(7);
      expect(svc.solved()).toEqual([2, 7]);
      expect(svc.isSolved(2)).toBeTrue();
      expect(svc.isSolved(3)).toBeFalse();
      expect(JSON.parse(svc.get(LOCAL_STORAGE_KEYS.Solved))).toEqual([2, 7]);
    });

    it('setCurrent persists the continue pointer', () => {
      svc.setCurrent(2, 14);
      expect(svc.currentPack()).toBe(2);
      expect(svc.currentPuzzle()).toBe(14);
      expect(svc.get(LOCAL_STORAGE_KEYS.CurrentPack)).toBe('2');
      expect(svc.get(LOCAL_STORAGE_KEYS.CurrentPuzzle)).toBe('14');
    });
  });

  describe('coins', () => {
    it('adds and persists coins', () => {
      svc.addCoins(30);
      svc.addCoins(5);
      expect(svc.coins()).toBe(35);
      expect(svc.get(LOCAL_STORAGE_KEYS.Coins)).toBe('35');
    });

    it('spends coins only when affordable', () => {
      svc.addCoins(20);
      expect(svc.spendCoins(25)).toBeFalse();
      expect(svc.coins()).toBe(20);
      expect(svc.spendCoins(15)).toBeTrue();
      expect(svc.coins()).toBe(5);
    });
  });

  describe('trinkets', () => {
    const t: trinket = { id: 'x-1', name: 'X', rarity: 'common', set: 'S', img: 'i.png' };

    it('adds without duplicates', () => {
      svc.addTrinket('x-1');
      svc.addTrinket('x-1');
      expect(svc.ownedTrinkets()).toEqual(['x-1']);
      expect(svc.ownsTrinket('x-1')).toBeTrue();
      expect(svc.ownsTrinket('x-2')).toBeFalse();
    });

    it('sets and clears the featured trinket', () => {
      svc.setFeaturedTrinket(t);
      expect(svc.featuredTrinket()).toEqual(t);
      expect(svc.get(LOCAL_STORAGE_KEYS.FeaturedTrinket)).toBeTruthy();
      svc.setFeaturedTrinket(null);
      expect(svc.featuredTrinket()).toBeNull();
      expect(svc.get(LOCAL_STORAGE_KEYS.FeaturedTrinket)).toBeNull();
    });
  });

  describe('toggles', () => {
    it('dark mode toggles the root class and persists', () => {
      svc.setDarkMode(true);
      expect(svc.darkMode()).toBeTrue();
      expect(document.documentElement.classList.contains('dark')).toBeTrue();
      svc.toggleDarkMode();
      expect(svc.darkMode()).toBeFalse();
      expect(document.documentElement.classList.contains('dark')).toBeFalse();
      expect(svc.get(LOCAL_STORAGE_KEYS.DarkMode)).toBe('false');
    });

    it('energy override toggles and persists', () => {
      expect(svc.energyOverride()).toBeFalse();
      svc.toggleEnergyOverride();
      expect(svc.energyOverride()).toBeTrue();
      expect(svc.get(LOCAL_STORAGE_KEYS.EnergyOverride)).toBe('true');
    });

    it('ad-free mirrors and persists', () => {
      svc.setAdFree(true);
      expect(svc.adFree()).toBeTrue();
      expect(svc.get(LOCAL_STORAGE_KEYS.AdFree)).toBe('true');
    });
  });
});
