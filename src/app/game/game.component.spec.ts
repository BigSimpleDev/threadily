import { TestBed, ComponentFixture, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { BehaviorSubject } from 'rxjs';

import { GameComponent } from './game.component';
import { LocalstoreService } from '../services/localstore.service';
import { EnergyService } from '../services/energy.service';
import { AdService } from '../services/ad.service';
import { pack_data } from '../entities/entities';
import { COINS_FIRST_CLEAR, HINT_COST, STARTING_HEARTS, AD_HEARTS_GRANT, ENERGY_PER_GAME, LOCAL_STORAGE_KEYS } from '../entities/constants';

const PACK: pack_data = {
  pack: 1,
  puzzles: [
    {
      id: 1, rating: 1, title: 'Two Rows',
      categories: [
        { name: 'A', tiles: ['a1', 'a2', 'a3', 'a4'] },
        { name: 'B', tiles: ['b1', 'b2', 'b3', 'b4'] }
      ]
    },
    {
      id: 2, rating: 2,
      categories: [
        { name: 'C', tiles: ['c1', 'c2', 'c3', 'c4'] },
        { name: 'D', tiles: ['d1', 'd2', 'd3', 'd4'] }
      ]
    }
  ]
};

describe('GameComponent', () => {
  let fixture: ComponentFixture<GameComponent>;
  let c: GameComponent;
  let http: HttpTestingController;
  let lstore: LocalstoreService;
  let params: BehaviorSubject<ParamMap>;
  let routerSpy: jasmine.SpyObj<Router>;
  let energyStub: any;
  let adStub: any;
  let alertStub: any;
  let toastStub: any;
  let alertRole: string;

  const ev = { stopPropagation: () => {} } as Event;

  beforeEach(() => {
    localStorage.clear();
    alertRole = 'confirm';
    params = new BehaviorSubject(convertToParamMap({ pack: '1', index: '0' }));
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));
    energyStub = {
      spendForGame: jasmine.createSpy('spendForGame').and.returnValue(true),
      grantFromAd: jasmine.createSpy('grantFromAd'),
      canWatchAdForEnergy: () => true,
      adsLeftToday: () => 5,
      adMaxPerDay: 5,
      adGrant: 5,
      energy: () => 0,
      timeToAfford: () => '59:00'
    };
    adStub = {
      maybeShowInterstitial: jasmine.createSpy('maybeShowInterstitial').and.returnValue(Promise.resolve()),
      showRewarded: jasmine.createSpy('showRewarded').and.returnValue(Promise.resolve(true))
    };
    alertStub = {
      create: jasmine.createSpy('alert.create').and.callFake(() => Promise.resolve({
        present: () => Promise.resolve(),
        onDidDismiss: () => Promise.resolve({ role: alertRole })
      }))
    };
    toastStub = {
      create: jasmine.createSpy('toast.create').and.returnValue(Promise.resolve({ present: () => Promise.resolve() }))
    };

    TestBed.configureTestingModule({
      imports: [GameComponent, HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: EnergyService, useValue: energyStub },
        { provide: AdService, useValue: adStub },
        { provide: AlertController, useValue: alertStub },
        { provide: ToastController, useValue: toastStub }
      ]
    });
    TestBed.overrideComponent(GameComponent, { set: { template: '<div></div>', imports: [] } });
    http = TestBed.inject(HttpTestingController);
    lstore = TestBed.inject(LocalstoreService);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function boot() {
    fixture = TestBed.createComponent(GameComponent);
    c = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne('assets/puzzles/1.json').flush(PACK);
    tick();
  }

  // Place a category's tiles via the active-row flow and lock it.
  function fillAndLock(ci: number, tiles: string[]) {
    c.tapCategory(ci);
    if (c.activeCat() !== ci) c.tapCategory(ci);
    tiles.forEach(t => c.tapPoolTile(t));
    c.lock(ci, ev);
  }

  it('charges energy once, records the continue pointer, and deals a fresh board', fakeAsync(() => {
    boot();
    expect(energyStub.spendForGame).toHaveBeenCalledOnceWith(ENERGY_PER_GAME);
    expect(adStub.maybeShowInterstitial).toHaveBeenCalled();
    expect(lstore.currentPack()).toBe(1);
    expect(lstore.currentPuzzle()).toBe(0);
    expect(c.board()!.hearts).toBe(STARTING_HEARTS);
    expect(c.board()!.pool.length).toBe(8);
  }));

  it('blocks the start and prompts when out of energy', fakeAsync(() => {
    energyStub.spendForGame.and.returnValue(false);
    boot();
    expect(c.board()).toBeNull();
    expect(alertStub.create).toHaveBeenCalledWith(jasmine.objectContaining({ header: 'Out of energy' }));
  }));

  it('tap tile then tap category places it; tapping a placed tile returns it', fakeAsync(() => {
    boot();
    c.tapPoolTile('a1');
    expect(c.selectedTile()).toBe('a1');
    c.tapCategory(1);
    expect(c.board()!.categories[1].slots).toEqual(['a1']);
    c.tapPlacedTile('a1', ev);
    expect(c.board()!.pool).toContain('a1');
  }));

  it('winning awards first-clear coins and marks the puzzle solved', fakeAsync(() => {
    boot();
    fillAndLock(0, PACK.puzzles[0].categories[0].tiles);
    fillAndLock(1, PACK.puzzles[0].categories[1].tiles);
    tick(700);
    expect(c.won()).toBeTrue();
    expect(c.firstClear()).toBeTrue();
    expect(lstore.coins()).toBe(COINS_FIRST_CLEAR);
    expect(lstore.isSolved(1)).toBeTrue();
  }));

  it('replaying a solved puzzle pays the reduced replay amount', fakeAsync(() => {
    lstore.markSolved(1);
    boot();
    fillAndLock(0, PACK.puzzles[0].categories[0].tiles);
    fillAndLock(1, PACK.puzzles[0].categories[1].tiles);
    tick(700);
    expect(c.firstClear()).toBeFalse();
    expect(lstore.coins()).toBe(1);
  }));

  it('three misses open the out-of-hearts modal; an ad adds 3 hearts and keeps the board', fakeAsync(() => {
    boot();
    fillAndLock(0, ['a1', 'a2', 'b1', 'b2']);
    fillAndLock(0, ['a1', 'a2', 'a3', 'b1']);
    expect(toastStub.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'One away…' }));
    fillAndLock(0, ['a1', 'b2', 'b3', 'b4']);
    tick(500);
    expect(c.board()!.hearts).toBe(0);
    expect(c.outOfHearts()).toBeTrue();

    // While out of hearts the board ignores input.
    const before = c.board();
    c.tapPoolTile('a1');
    expect(c.selectedTile()).toBeNull();
    expect(c.board()).toBe(before);

    c.watchAdForHearts();
    tick();
    expect(adStub.showRewarded).toHaveBeenCalled();
    expect(c.board()!.hearts).toBe(AD_HEARTS_GRANT);
    expect(c.outOfHearts()).toBeFalse();
    expect(c.mistakes()).toBe(3);
    flush();
  }));

  it('an unfinished ad grants nothing', fakeAsync(() => {
    adStub.showRewarded.and.returnValue(Promise.resolve(false));
    boot();
    fillAndLock(0, ['a1', 'a2', 'b1', 'b2']);
    fillAndLock(0, ['a1', 'b1', 'b3', 'b4']);
    fillAndLock(0, ['a1', 'b2', 'b3', 'b4']);
    tick(500);
    c.watchAdForHearts();
    tick();
    expect(c.board()!.hearts).toBe(0);
    expect(c.outOfHearts()).toBeTrue();
    flush();
  }));

  it('a repeated wrong guess costs no heart', fakeAsync(() => {
    boot();
    fillAndLock(0, ['a1', 'a2', 'a3', 'b1']);
    fillAndLock(0, ['a1', 'a2', 'a3', 'b1']);
    expect(c.board()!.hearts).toBe(STARTING_HEARTS - 1);
    expect(toastStub.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'Already guessed' }));
    flush();
  }));

  it('a hint spends coins and pins one correct tile', fakeAsync(() => {
    lstore.addCoins(HINT_COST);
    boot();
    c.buyHint();
    tick();
    expect(lstore.coins()).toBe(0);
    const pinned = c.board()!.categories.flatMap(cat => cat.pinned);
    expect(pinned.length).toBe(1);
  }));

  it('a cancelled hint spends nothing', fakeAsync(() => {
    alertRole = 'cancel';
    lstore.addCoins(HINT_COST);
    boot();
    c.buyHint();
    tick();
    expect(lstore.coins()).toBe(HINT_COST);
    expect(c.board()!.categories.flatMap(cat => cat.pinned).length).toBe(0);
  }));

  it('a hint without enough coins only explains the cost', fakeAsync(() => {
    boot();
    c.buyHint();
    tick();
    expect(alertStub.create).not.toHaveBeenCalled();
    expect(toastStub.create).toHaveBeenCalled();
  }));

  it('Next puzzle navigates to the following puzzle; new params restart the board', fakeAsync(() => {
    boot();
    c.nextPuzzle();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/play', 1, 1], { replaceUrl: true });
    params.next(convertToParamMap({ pack: '1', index: '1' }));
    tick();
    expect(c.puzzle()!.id).toBe(2);
    expect(energyStub.spendForGame).toHaveBeenCalledTimes(2);
  }));

  it('practice boards (pack 0) cost no energy and pay nothing', fakeAsync(() => {
    params.next(convertToParamMap({ pack: '0', index: '0' }));
    fixture = TestBed.createComponent(GameComponent);
    c = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    expect(energyStub.spendForGame).not.toHaveBeenCalled();
    expect(c.practice()).toBeTrue();
    expect(c.board()).not.toBeNull();
  }));

  describe('first-launch tutorial (pack 1 #1)', () => {
    it('advances on a real placement and a real lock, then on Next, then finishes', fakeAsync(() => {
      boot();
      expect(c.tutorial()).toBe(0);
      c.tapPoolTile('a1');
      c.tapCategory(0);
      expect(c.tutorial()).toBe(1);
      fillAndLock(0, ['a2', 'a3', 'a4']);
      expect(c.tutorial()).toBe(2);
      c.tutorialNext();
      expect(c.tutorial()).toBe(3);
      c.tutorialNext();
      expect(c.tutorial()).toBe(-1);
      expect(lstore.get(LOCAL_STORAGE_KEYS.TutorialSeen)).toBe('true');
      flush();
    }));

    it('stays off once seen, and on other puzzles', fakeAsync(() => {
      lstore.set(LOCAL_STORAGE_KEYS.TutorialSeen, 'true');
      boot();
      expect(c.tutorial()).toBe(-1);
    }));

    it('winning marks it seen even if skipped mid-way', fakeAsync(() => {
      boot();
      fillAndLock(0, PACK.puzzles[0].categories[0].tiles);
      fillAndLock(1, PACK.puzzles[0].categories[1].tiles);
      tick(700);
      expect(c.tutorial()).toBe(-1);
      expect(lstore.get(LOCAL_STORAGE_KEYS.TutorialSeen)).toBe('true');
    }));
  });
});
