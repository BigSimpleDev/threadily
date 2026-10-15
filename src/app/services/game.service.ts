import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay, tap } from 'rxjs';
import { pack_data, puzzle } from '../entities/entities';

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
}
