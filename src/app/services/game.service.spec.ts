import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GameService } from './game.service';
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
