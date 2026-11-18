import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from 'src/environments/environment';
import { DemoService, demoCandidates, mistakeRow } from './demo.service';
import { pack_data, puzzle } from '../entities/entities';

describe('DemoService', () => {
  let service: DemoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    service = TestBed.inject(DemoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    httpMock.verify();
  });

  describe('outside the demo build', () => {
    it('is disabled because environment.demo is false', () => {
      expect((environment as { demo?: boolean }).demo).toBeFalse();
      expect(service.enabled).toBeFalse();
    });

    it('start() makes no requests, navigates nowhere and writes no storage', () => {
      const nav = spyOn(TestBed.inject(Router), 'navigate');
      service.start();
      httpMock.expectNone(() => true);
      expect(nav).not.toHaveBeenCalled();
      expect(localStorage.length).toBe(0);
    });

    it('attach() is a no-op', () => {
      expect(() => service.attach({} as never)).not.toThrow();
    });
  });

  const board = (id: number, groups: number, perGroup = 4, warning?: string): puzzle => ({
    id, rating: 3, warning,
    categories: Array.from({ length: groups }, (_, g) => ({
      name: `Cat ${g}`, tiles: Array.from({ length: perGroup }, (_, t) => `T${g}${t}`)
    }))
  });

  it('demoCandidates() keeps unplayed 12- and 16-tile boards without a warning', () => {
    const pd: pack_data = { pack: 4, puzzles: [board(1, 2), board(2, 3), board(3, 4), board(4, 4, 4, 'MLB'), board(5, 5)] };
    expect(demoCandidates(pd, [])).toEqual([1, 2]);
    expect(demoCandidates(pd, ['4/1'])).toEqual([2]);
  });

  it('mistakeRow() picks the named row, else the row most tiles belong to', () => {
    const p = board(1, 4);
    expect(mistakeRow(p, ['T10', 'T11', 'T12', 'T00'])).toBe(1);
    expect(mistakeRow(p, ['T10', 'T11', 'T12', 'T00'], 'cat 2')).toBe(2);
    expect(() => mistakeRow(p, ['T10'], 'Nope')).toThrowError(/not a category/);
  });
});
