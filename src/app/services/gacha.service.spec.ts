import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GachaService } from './gacha.service';
import { LocalstoreService } from './localstore.service';
import { trinket } from '../entities/entities';
import { ROLL_COST, DUPLICATE_REFUND } from '../entities/constants';

const CATALOG: trinket[] = [
  { id: 'c1', name: 'C1', rarity: 'common', set: 'A', img: 'c1.png' },
  { id: 'c2', name: 'C2', rarity: 'common', set: 'A', img: 'c2.png' },
  { id: 'c3', name: 'C3', rarity: 'common', set: 'B', img: 'c3.png' },
  { id: 'r1', name: 'R1', rarity: 'rare', set: 'B', img: 'r1.png' },
  { id: 'e1', name: 'E1', rarity: 'epic', set: 'C', img: 'e1.png' },
  { id: 'l1', name: 'L1', rarity: 'legendary', set: 'C', img: 'l1.png' }
];

describe('GachaService', () => {
  let svc: GachaService;
  let lstore: LocalstoreService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    svc = TestBed.inject(GachaService);
    lstore = TestBed.inject(LocalstoreService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function loadCatalog(items = CATALOG) {
    svc.loadCatalog().subscribe();
    http.expectOne('assets/trinkets/catalog.json').flush(items);
  }

  describe('loadCatalog', () => {
    it('populates the catalog signal', () => {
      loadCatalog();
      expect(svc.catalog().length).toBe(CATALOG.length);
    });

    it('tolerates a null body', () => {
      svc.loadCatalog().subscribe();
      http.expectOne('assets/trinkets/catalog.json').flush(null);
      expect(svc.catalog()).toEqual([]);
    });
  });

  describe('roll', () => {
    it('always returns a catalog trinket', () => {
      loadCatalog();
      for (let i = 0; i < 50; i++) {
        expect(CATALOG).toContain(svc.roll());
      }
    });

    it('prefers an unowned trinket in the chosen tier (no forced duplicate)', () => {
      loadCatalog();
      lstore.addTrinket('c1');
      lstore.addTrinket('c3');
      // Force rarity -> common (first weighted pick) and disable the "allow dupe" branch.
      const seq = [0, 0.99];
      spyOn(Math, 'random').and.callFake(() => seq.shift() ?? 0.99);
      expect(svc.roll().id).toBe('c2');
    });

    it('falls back to the owned pool once every tier item is owned', () => {
      loadCatalog();
      CATALOG.filter(t => t.rarity === 'common').forEach(t => lstore.addTrinket(t.id));
      const seq = [0, 0.99];
      spyOn(Math, 'random').and.callFake(() => seq.shift() ?? 0);
      const r = svc.roll();
      expect(['c1', 'c2', 'c3']).toContain(r.id);
    });
  });

  describe('rollAndAward', () => {
    it('returns null when the catalog is empty', () => {
      expect(svc.rollAndAward()).toBeNull();
    });

    it('returns null and spends nothing when the player cannot afford a roll', () => {
      loadCatalog();
      lstore.addCoins(ROLL_COST - 1);
      expect(svc.rollAndAward()).toBeNull();
      expect(lstore.coins()).toBe(ROLL_COST - 1);
    });

    it('spends coins, awards a new trinket, and marks it owned', () => {
      loadCatalog();
      lstore.addCoins(ROLL_COST);
      spyOn(Math, 'random').and.returnValue(0.5);
      const res = svc.rollAndAward()!;
      expect(res).not.toBeNull();
      expect(lstore.coins()).toBe(0);
      expect(res.duplicate).toBeFalse();
      expect(lstore.ownsTrinket(res.trinket.id)).toBeTrue();
    });

    it('flags a duplicate and does not re-add it', () => {
      loadCatalog([{ id: 'only', name: 'O', rarity: 'common', set: 'A', img: 'o.png' }]);
      lstore.addTrinket('only');
      lstore.addCoins(ROLL_COST);
      const res = svc.rollAndAward()!;
      expect(res.trinket.id).toBe('only');
      expect(res.duplicate).toBeTrue();
      expect(lstore.ownedTrinkets()).toEqual(['only']);
    });
  });

  describe('rollBatch', () => {
    it('performs up to N rolls and stops when coins run out', () => {
      loadCatalog();
      lstore.addCoins(ROLL_COST * 3);
      spyOn(Math, 'random').and.returnValue(0.5);
      const results = svc.rollBatch(5);
      expect(results.length).toBe(3);
      expect(lstore.coins()).toBe(0);
    });
  });

  describe('redeemDuplicate', () => {
    it('grants the duplicate refund', () => {
      svc.redeemDuplicate();
      expect(lstore.coins()).toBe(DUPLICATE_REFUND);
    });
  });
});
