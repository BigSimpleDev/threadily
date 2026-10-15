import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, concatMap, from, map, Observable, of, shareReplay, take, tap, filter, defaultIfEmpty, forkJoin } from 'rxjs';
import { pack_data, puzzle } from '../entities/entities';
import { MAX_PACK } from '../entities/constants';

// Where a puzzle lives: its pack file and position in that pack (route params).
export interface puzzle_ref {
  pack: number;
  index: number;
  puzzle: puzzle;
}

export interface pack_summary {
  pack: number;
  total: number;
  solved: number;
  // Rating counts, index 1–5.
  byRating: number[];
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private httpClient = inject(HttpClient);

  // Pack files are static assets, so each is fetched once per session.
  private cache = new Map<number, Observable<pack_data | null>>();

  current_pack = signal<number>(1);
  current_puzzles = signal<puzzle[]>([]);

  // One pack file (100 puzzles). Emits null when the file doesn't exist.
  getPack(pack: number): Observable<pack_data | null> {
    let req = this.cache.get(pack);
    if (!req) {
      req = this.httpClient.get<pack_data>(`assets/puzzles/${pack}.json`).pipe(
        catchError(() => of(null)),
        shareReplay(1)
      );
      this.cache.set(pack, req);
    }
    return req;
  }

  // Fetch a pack, expose its puzzles, and make it the active pack.
  loadPack(pack: number): Observable<puzzle[]> {
    return this.getPack(pack).pipe(
      map(pd => pd?.puzzles ?? []),
      tap(puzzles => {
        this.current_puzzles.set(puzzles);
        this.current_pack.set(pack);
      })
    );
  }

  // "Continue": the first unsolved puzzle in authored order across every main
  // pack, loading packs one at a time and stopping at the first hit. Emits null
  // once everything is solved.
  nextUnsolved(isSolved: (id: number) => boolean, maxPack = MAX_PACK): Observable<puzzle_ref | null> {
    const packs = Array.from({ length: maxPack }, (_, i) => i + 1);
    return from(packs).pipe(
      concatMap(pack => this.getPack(pack).pipe(
        map(pd => {
          const index = (pd?.puzzles ?? []).findIndex(p => !isSolved(p.id));
          return index < 0 ? null : { pack, index, puzzle: pd!.puzzles[index] };
        })
      )),
      filter((r): r is puzzle_ref => r !== null),
      take(1),
      defaultIfEmpty(null)
    );
  }

  // The puzzle after (pack, index) in authored order, crossing into the next
  // main pack at the end of one. Null after the very last puzzle.
  nextAfter(pack: number, index: number, maxPack = MAX_PACK): Observable<puzzle_ref | null> {
    return this.getPack(pack).pipe(
      concatMap(pd => {
        const next = pd?.puzzles[index + 1];
        if (next) return of({ pack, index: index + 1, puzzle: next });
        if (pack + 1 > maxPack) return of(null);
        return this.getPack(pack + 1).pipe(
          map(np => np?.puzzles[0] ? { pack: pack + 1, index: 0, puzzle: np.puzzles[0] } : null)
        );
      })
    );
  }

  summarize(pack: number, isSolved: (id: number) => boolean): Observable<pack_summary | null> {
    return this.getPack(pack).pipe(
      map(pd => {
        if (!pd) return null;
        const byRating = [0, 0, 0, 0, 0, 0];
        pd.puzzles.forEach(p => byRating[p.rating]++);
        return {
          pack,
          total: pd.puzzles.length,
          solved: pd.puzzles.filter(p => isSolved(p.id)).length,
          byRating
        };
      })
    );
  }

  summarizeAll(isSolved: (id: number) => boolean, maxPack = MAX_PACK): Observable<pack_summary[]> {
    const packs = Array.from({ length: maxPack }, (_, i) => i + 1);
    return forkJoin(packs.map(p => this.summarize(p, isSolved))).pipe(
      map(list => list.filter((s): s is pack_summary => s !== null))
    );
  }
}
