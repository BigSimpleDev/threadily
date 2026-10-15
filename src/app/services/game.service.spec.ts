import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GameService, pack_summary, puzzle_ref } from './game.service';
import { pack_data } from '../entities/entities';

const PACK: pack_data = {
  pack: 1,
  puzzles: [
    {
      id: 1, rating: 1,
      categories: [
        { name: 'A', tiles: ['a1', 'a2', 'a3', 'a4'] },
        { name: 'B', tiles: ['b1', 'b2', 'b3', 'b4'] }
      ]
    }
  ]
};

describe('GameService', () => {
  let svc: GameService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    svc = TestBed.inject(GameService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a pack and makes it current', () => {
    let got = 0;
    svc.loadPack(1).subscribe(p => (got = p.length));
    http.expectOne('assets/puzzles/1.json').flush(PACK);
    expect(got).toBe(1);
    expect(svc.current_pack()).toBe(1);
    expect(svc.current_puzzles()[0].id).toBe(1);
  });

  it('fetches each pack only once', () => {
    svc.getPack(1).subscribe();
    http.expectOne('assets/puzzles/1.json').flush(PACK);
    svc.getPack(1).subscribe();
    http.expectNone('assets/puzzles/1.json');
  });

  it('emits null for a missing pack', () => {
    let got: pack_data | null | undefined;
    svc.getPack(99).subscribe(p => (got = p));
    http.expectOne('assets/puzzles/99.json').flush('nope', { status: 404, statusText: 'Not Found' });
    expect(got).toBeNull();
  });
});

describe('GameService progress helpers', () => {
  let svc: GameService;
  let http: HttpTestingController;

  const pack = (n: number, count: number): pack_data => ({
    pack: n,
    puzzles: Array.from({ length: count }, (_, i) => ({
      id: (n - 1) * 100 + i + 1,
      rating: (i % 5) + 1,
      categories: [{ name: 'A', tiles: ['a', 'b', 'c', 'd'] }, { name: 'B', tiles: ['e', 'f', 'g', 'h'] }]
    }))
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    svc = TestBed.inject(GameService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('nextUnsolved finds the first unsolved puzzle in order', () => {
    let got: puzzle_ref | null | undefined;
    svc.nextUnsolved(id => id <= 2, 2).subscribe(r => (got = r));
    http.expectOne('assets/puzzles/1.json').flush(pack(1, 3));
    expect(got?.pack).toBe(1);
    expect(got?.index).toBe(2);
    expect(got?.puzzle.id).toBe(3);
  });

  it('nextUnsolved crosses into the next pack and stops loading once found', () => {
    let got: puzzle_ref | null | undefined;
    svc.nextUnsolved(id => id <= 3, 3).subscribe(r => (got = r));
    http.expectOne('assets/puzzles/1.json').flush(pack(1, 3));
    http.expectOne('assets/puzzles/2.json').flush(pack(2, 3));
    http.expectNone('assets/puzzles/3.json');
    expect(got?.pack).toBe(2);
    expect(got?.index).toBe(0);
  });

  it('nextUnsolved emits null when everything is solved', () => {
    let got: puzzle_ref | null | undefined;
    svc.nextUnsolved(() => true, 1).subscribe(r => (got = r));
    http.expectOne('assets/puzzles/1.json').flush(pack(1, 3));
    expect(got).toBeNull();
  });

  it('nextAfter moves within a pack, then to the next pack, then null', () => {
    let a: puzzle_ref | null | undefined;
    svc.nextAfter(1, 0, 2).subscribe(r => (a = r));
    http.expectOne('assets/puzzles/1.json').flush(pack(1, 2));
    expect(a?.index).toBe(1);

    let b: puzzle_ref | null | undefined;
    svc.nextAfter(1, 1, 2).subscribe(r => (b = r));
    http.expectOne('assets/puzzles/2.json').flush(pack(2, 2));
    expect(b?.pack).toBe(2);
    expect(b?.index).toBe(0);

    let c: puzzle_ref | null | undefined = undefined;
    svc.nextAfter(2, 1, 2).subscribe(r => (c = r));
    expect(c).toBeNull();
  });

  it('summarize counts solved puzzles and ratings', () => {
    let got: pack_summary | null | undefined;
    svc.summarize(1, id => id === 1 || id === 4).subscribe(r => (got = r));
    http.expectOne('assets/puzzles/1.json').flush(pack(1, 5));
    expect(got?.total).toBe(5);
    expect(got?.solved).toBe(2);
    expect(got?.byRating).toEqual([0, 1, 1, 1, 1, 1]);
  });
});
