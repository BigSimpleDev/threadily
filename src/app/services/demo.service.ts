import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LOCAL_STORAGE_KEYS, MAX_PACK } from '../entities/constants';
import { pack_data, puzzle } from '../entities/entities';
import { isFull } from '../game/board';
import { LocalstoreService } from './localstore.service';
import type { GameComponent } from '../game/game.component';

/*
 * Demo mode for the marketing video generator (bigsimplesite repo,
 * marketing/automation). Only runs in the `demo` build (environment.demo);
 * in every other build each method returns immediately. Same contract as
 * Decryptly's and Trivily's DemoService.
 *
 * Solves the board the way a player taps it: tap a category row, tap its tiles
 * from the pool, Lock In. An optional scripted mistake (e.g. a red-herring tile)
 * is locked in first and costs a heart ("One away…" when one tile is off).
 *
 * Console lines the runner reads:
 *   DEMO_PUZZLE <pack>/<index>   DEMO_START <same>   DEMO_DONE   DEMO_ERROR <message>
 */

export interface DemoPlay {
  /** Pack number and 0-based index (same as /play/:pack/:index). */
  pack?: number;
  index?: number;
  /** Lock-in order: each entry is one category's tiles. Omit for authored order. */
  placements?: string[][];
  /** Tiles to lock into `row` (a category name; default: the row most of them belong to) before group `beforeGroup`. */
  mistake?: { tiles: string[]; row?: string; beforeGroup: number };
  pauses?: { at: number; ms: number }[];
  holdMs: number;
  random?: boolean;
  exclude?: string[];
}

export interface DemoScenario {
  game: string;
  scenarioId: string;
  appearance: 'light' | 'dark';
  gapMs: [number, number];
  showTouches: boolean;
  play: DemoPlay;
}

// Boards that fit a 7–20 s video: 12 or 16 tiles.
export const DEMO_TILE_COUNTS = [12, 16];

/** Puzzles in one pack that suit a video: right size, no rights-holder warning, not played. */
export function demoCandidates(pd: pack_data, exclude: string[]): number[] {
  return pd.puzzles
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => {
      const tiles = p.categories.reduce((n, c) => n + c.tiles.length, 0);
      return !p.warning && DEMO_TILE_COUNTS.includes(tiles) && !exclude.includes(`${pd.pack}/${i}`);
    })
    .map(({ i }) => i);
}

/** Which category the scripted wrong guess goes into. */
export function mistakeRow(p: puzzle, tiles: string[], row?: string): number {
  if (row) {
    const i = p.categories.findIndex(c => c.name.toLowerCase() === row.toLowerCase());
    if (i < 0) throw new Error(`mistake.row "${row}" is not a category of this puzzle`);
    return i;
  }
  let best = 0, bestCount = -1;
  p.categories.forEach((c, i) => {
    const n = tiles.filter(t => c.tiles.includes(t)).length;
    if (n > bestCount) { best = i; bestCount = n; }
  });
  return best;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

@Injectable({ providedIn: 'root' })
export class DemoService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private lstore = inject(LocalstoreService);

  readonly enabled = (environment as { demo?: boolean }).demo === true;

  private scenario?: DemoScenario;
  private onAttach?: (g: GameComponent) => void;

  /** Called once from AppComponent. No-op outside demo builds. */
  start(): void {
    if (!this.enabled) return;
    this.run().catch(e => this.log('ERROR', e instanceof Error ? e.message : String(e)));
  }

  /** GameComponent calls this when a board starts. No-op outside demo builds. */
  attach(game: GameComponent): void {
    if (!this.enabled) return;
    this.onAttach?.(game);
  }

  private log(kind: 'PUZZLE' | 'START' | 'DONE' | 'ERROR', msg = '') {
    console.log(`DEMO_${kind}${msg ? ' ' + msg : ''}`);
  }

  private async run() {
    const s = await firstValueFrom(this.http.get<DemoScenario>('assets/demo/scenario.json'))
      .catch(() => { throw new Error('assets/demo/scenario.json missing or unreadable'); });
    this.scenario = s;
    this.seed(s);

    const { pack, index } = s.play.random
      ? await this.pickRandom(s.play.exclude ?? [])
      : { pack: s.play.pack, index: s.play.index };
    if (typeof pack !== 'number' || typeof index !== 'number') throw new Error('play.pack and play.index are required');
    const key = `${pack}/${index}`;
    this.log('PUZZLE', key);

    const attached = new Promise<GameComponent>(res => (this.onAttach = res));
    await this.router.navigate(['/play', pack, index], { replaceUrl: true });
    const game = await Promise.race([
      attached,
      sleep(15000).then(() => { throw new Error(`puzzle ${key} did not open`); }),
    ]);
    await sleep(900); // page transition + layout settle

    this.log('START', key);
    await this.solve(game, s.play);
    for (let i = 0; i < 30 && !game.won(); i++) await sleep(100);
    if (!game.won()) throw new Error('solve finished but the puzzle is not won');
    await sleep(s.play.holdMs);
    this.log('DONE');
  }

  /** Fresh install state: ad-free, tutorial seen, some coins, chosen theme. Energy starts full on a clean install. */
  private seed(s: DemoScenario) {
    const dark = s.appearance === 'dark';
    localStorage.setItem(LOCAL_STORAGE_KEYS.AdFree, 'true');
    localStorage.setItem(LOCAL_STORAGE_KEYS.TutorialSeen, 'true');
    localStorage.setItem(LOCAL_STORAGE_KEYS.Coins, '240');
    localStorage.setItem(LOCAL_STORAGE_KEYS.DarkMode, dark ? 'true' : 'false');
    this.lstore.setPlayerInfo();
    this.lstore.setDarkMode(dark);
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined);
    }
  }

  private async pickRandom(exclude: string[]): Promise<{ pack: number; index: number }> {
    for (let tries = 0; tries < 30; tries++) {
      const pack = 1 + Math.floor(Math.random() * MAX_PACK);
      const pd = await firstValueFrom(this.http.get<pack_data>(`assets/puzzles/${pack}.json`)).catch(() => null);
      const ok = pd ? demoCandidates(pd, exclude) : [];
      if (ok.length) return { pack, index: ok[Math.floor(Math.random() * ok.length)] };
    }
    throw new Error('no unplayed 12- or 16-tile puzzle found in 30 tries');
  }

  private async solve(game: GameComponent, play: DemoPlay) {
    const p = game.puzzle();
    if (!p || !game.board()) throw new Error('board not ready');
    const groups = play.placements ?? p.categories.map(c => [...c.tiles]);
    const pauses = new Map((play.pauses ?? []).map(x => [x.at, x.ms]));

    await sleep(700); // a beat to read the board
    for (let g = 0; g < groups.length && !game.won(); g++) {
      const pause = pauses.get(g);
      if (pause) await sleep(pause);
      if (play.mistake && play.mistake.beforeGroup === g) {
        await this.fillAndLock(game, mistakeRow(p, play.mistake.tiles, play.mistake.row), play.mistake.tiles);
        await sleep(1100); // the red row holds 750 ms, then the toast reads
      }
      const ci = p.categories.findIndex(c => groups[g].every(t => c.tiles.includes(t)));
      if (ci < 0) throw new Error(`placements[${g}] is not one category: ${groups[g].join(', ')}`);
      await this.fillAndLock(game, ci, groups[g]);
      await sleep(450); // let the lock celebrate
    }
  }

  /** Tap the row, tap each tile into it, then Lock In. */
  private async fillAndLock(game: GameComponent, ci: number, tiles: string[]) {
    const b = game.board();
    if (!b || b.categories[ci].locked) return;
    if (game.activeCat() !== ci) {
      this.touch(this.catEl(ci));
      game.tapCategory(ci);
      await this.gap();
    }
    for (const t of tiles) {
      const now = game.board()!;
      if (now.categories[ci].slots.includes(t) || isFull(now.categories[ci])) continue;
      if (!now.pool.includes(t)) throw new Error(`tile "${t}" is not in the pool`);
      this.touch(this.poolTileEl(t));
      game.tapPoolTile(t);
      await this.gap();
    }
    await sleep(250);
    this.touch(this.catEl(ci)?.querySelector('.thr-lock-btn') ?? null);
    game.lock(ci, new MouseEvent('click'));
    await this.gap();
  }

  private catEl(ci: number): Element | null {
    return document.querySelectorAll('.thr-cats .thr-cat')[ci] ?? null;
  }

  private poolTileEl(tile: string): Element | null {
    return Array.from(document.querySelectorAll('.thr-pool .thr-tile'))
      .find(el => el.textContent?.trim() === tile) ?? null;
  }

  private gap() {
    const [lo, hi] = this.scenario?.gapMs ?? [180, 450];
    return sleep(lo + Math.random() * (hi - lo));
  }

  /** Soft dot where a finger would land. */
  private touch(el: Element | null) {
    if (!el || this.scenario?.showTouches === false) return;
    const r = el.getBoundingClientRect();
    const size = 46;
    const dot = document.createElement('div');
    Object.assign(dot.style, {
      position: 'fixed', left: `${r.left + r.width / 2 - size / 2}px`, top: `${r.top + r.height / 2 - size / 2}px`,
      width: `${size}px`, height: `${size}px`, borderRadius: '50%', pointerEvents: 'none', zIndex: '100000',
      background: 'rgba(255,255,255,0.55)', boxShadow: '0 0 0 2px rgba(0,0,0,0.25)',
    });
    document.body.appendChild(dot);
    const anim = dot.animate(
      [{ transform: 'scale(0.7)', opacity: 0.95 }, { transform: 'scale(1.2)', opacity: 0 }],
      { duration: 450, easing: 'ease-out' });
    anim.onfinish = () => dot.remove();
  }
}
