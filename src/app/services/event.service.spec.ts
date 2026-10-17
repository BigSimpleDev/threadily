import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EventService } from './event.service';
import { GachaService } from './gacha.service';
import { LocalstoreService } from './localstore.service';
import { event_config, EVENT_COLORS } from '../entities/constants';
import { trinket } from '../entities/entities';

const OCT: event_config = {
  id: 'oct', name: 'Oct', icon: '', blurb: '', packs: [101],
  start: { month: 10, day: 1 }, end: { month: 11, day: 1 }, startYear: 2025,
  legendaryTrinketId: 'oct-12', colors: EVENT_COLORS.halloween
};
const DEC: event_config = {
  ...OCT, id: 'dec', packs: [103],
  start: { month: 12, day: 1 }, end: { month: 1, day: 1 },
  legendaryTrinketId: 'dec-12'
};
const day = (m: number, d: number) => new Date(2026, m - 1, d, 12);

describe('EventService', () => {
  let svc: EventService;
  let lstore: LocalstoreService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    svc = TestBed.inject(EventService);
    lstore = TestBed.inject(LocalstoreService);
    http = TestBed.inject(HttpTestingController);
    svc.events = [OCT, DEC];
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('opens on the start day and closes on the (exclusive) end day', () => {
    expect(svc.isLive(OCT, day(9, 30))).toBeFalse();
    expect(svc.isLive(OCT, day(10, 1))).toBeTrue();
    expect(svc.isLive(OCT, day(10, 31))).toBeTrue();
    expect(svc.isLive(OCT, day(11, 1))).toBeFalse();
  });

  it('handles a window that wraps the new year', () => {
    expect(svc.isLive(DEC, day(11, 30))).toBeFalse();
    expect(svc.isLive(DEC, day(12, 1))).toBeTrue();
    expect(svc.isLive(DEC, day(12, 31))).toBeTrue();
    expect(svc.isLive(DEC, day(1, 1))).toBeFalse();
    expect(svc.isLive(DEC, day(6, 1))).toBeFalse();
  });

  it('blocks event packs outside their window but never main packs', () => {
    expect(svc.isPackBlocked(101, day(10, 15))).toBeFalse();
    expect(svc.isPackBlocked(101, day(7, 4))).toBeTrue();
    expect(svc.isPackBlocked(3, day(7, 4))).toBeFalse();
  });

  it('withholds only live events\' legendaries', () => {
    expect(svc.lockedTrinketIds(day(10, 15))).toEqual(['oct-12']);
    expect(svc.lockedTrinketIds(day(12, 15))).toEqual(['dec-12']);
    expect(svc.lockedTrinketIds(day(7, 4))).toEqual([]);
  });

  it('stays dark before its first run, then repeats every year', () => {
    const NOV: event_config = {
      ...OCT, id: 'nov', packs: [102], legendaryTrinketId: 'nov-12',
      start: { month: 11, day: 1 }, end: { month: 12, day: 1 }, startYear: 2026
    };
    expect(svc.isLive(NOV, new Date(2025, 10, 15))).toBeFalse();
    expect(svc.isLive(NOV, day(11, 1))).toBeTrue();
    expect(svc.isLive(NOV, new Date(2027, 10, 15))).toBeTrue();

    // A wrapping window's January tail from the year before doesn't count.
    const DEC26 = { ...DEC, startYear: 2026 };
    expect(svc.isLive(DEC26, day(1, 1))).toBeFalse();
    expect(svc.isLive(DEC26, day(12, 1))).toBeTrue();
    expect(svc.isLive(DEC26, new Date(2027, 0, 15))).toBeFalse();
  });

  it('hides an event trinket set until its first run opens, then keeps it', () => {
    svc.events = [OCT, { ...DEC, startYear: 2026 }];
    expect(svc.isTrinketReleased('dec-03', day(11, 30))).toBeFalse();
    expect(svc.isTrinketReleased('dec-12', day(11, 30))).toBeFalse();
    expect(svc.isTrinketReleased('dec-03', day(12, 1))).toBeTrue();
    expect(svc.isTrinketReleased('dec-03', new Date(2027, 6, 4))).toBeTrue();
    expect(svc.isTrinketReleased('oct-03', day(7, 4))).toBeTrue();
    expect(svc.isTrinketReleased('cozy-01', day(7, 4))).toBeTrue();
  });

  function flushPack(ids: number[]) {
    http.expectOne('assets/puzzles/101.json').flush({
      pack: 101,
      puzzles: ids.map(id => ({ id, rating: 1, categories: [] }))
    });
  }

  it('awards the legendary once, only after every event puzzle is solved', () => {
    lstore.markSolved(10001);
    let got: string | null | undefined;
    svc.claimIfComplete(OCT).subscribe(id => got = id);
    flushPack([10001, 10002]);
    expect(got).toBeNull();
    expect(lstore.ownsTrinket('oct-12')).toBeFalse();

    lstore.markSolved(10002);
    svc.claimIfComplete(OCT).subscribe(id => got = id); // pack is cached now
    expect(got).toBe('oct-12');
    expect(lstore.ownsTrinket('oct-12')).toBeTrue();

    svc.claimIfComplete(OCT).subscribe(id => got = id);
    expect(got).toBeNull();
  });

  it('drops unreleased event sets from the loaded catalog', () => {
    const gacha = TestBed.inject(GachaService);
    spyOn(svc, 'isTrinketReleased').and.callFake(id => !id.startsWith('dec-'));
    gacha.loadCatalog().subscribe();
    http.expectOne('assets/trinkets/catalog.json').flush([
      { id: 'a-01', name: 'A', rarity: 'common', set: 'S', img: 'a.png' },
      { id: 'dec-01', name: 'D', rarity: 'common', set: 'D', img: 'd.png' }
    ]);
    expect(gacha.catalog().map(t => t.id)).toEqual(['a-01']);
  });

  it('keeps a live event legendary out of gacha rolls', () => {
    const gacha = TestBed.inject(GachaService);
    const items: trinket[] = [
      { id: 'a', name: 'A', rarity: 'common', set: 'S', img: 'a.png' },
      { id: 'oct-12', name: 'L', rarity: 'legendary', set: 'S', img: 'l.png' }
    ];
    gacha.catalog.set(items);
    spyOn(svc, 'lockedTrinketIds').and.returnValue(['oct-12']);
    expect(gacha.rollableCatalog().map(t => t.id)).toEqual(['a']);
  });
});
