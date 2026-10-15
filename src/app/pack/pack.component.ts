import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon } from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmark } from 'ionicons/icons';
import { GameService } from '../services/game.service';
import { LocalstoreService } from '../services/localstore.service';
import { puzzle, trinket } from '../entities/entities';
import { EventService } from '../services/event.service';
import { GachaService } from '../services/gacha.service';
import { ENERGY_PER_EVENT_GAME, event_config, LOCAL_STORAGE_KEYS } from '../entities/constants';

type sort_mode = 'order' | 'easy' | 'hard';

interface cell {
  index: number;
  puzzle: puzzle;
}

/** Numbered grid of one pack's puzzles with ratings, solved state, and a star filter. */
@Component({
  selector: 'app-pack',
  templateUrl: './pack.component.html',
  styleUrls: ['./pack.component.scss'],
  standalone: true,
  imports: [IonHeader, IonContent, IonIcon]
})
export class PackComponent implements ViewWillEnter {
  private aRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private gameSvc = inject(GameService);
  public lstoreSvc = inject(LocalstoreService);
  private eventSvc = inject(EventService);
  private gachaSvc = inject(GachaService);

  readonly starOptions = [1, 2, 3, 4, 5];
  readonly eventCost = ENERGY_PER_EVENT_GAME;
  readonly sortLabels: Record<sort_mode, string> = { order: 'In order', easy: 'Easiest first', hard: 'Hardest first' };

  pack = signal(1);
  puzzles = signal<puzzle[]>([]);
  // 0 = every rating; 1–5 = only that rating. Remembered across visits.
  starFilter = signal(this.loadFilter());
  sort = signal<sort_mode>('order');

  // Set when this pack is a seasonal event's: header, palette and reward.
  event = computed(() => this.eventSvc.eventForPack(this.pack()));
  eventStyle = computed(() => { const e = this.event(); return e ? this.eventSvc.paletteVars(e) : {}; });
  legendary = signal<trinket | null>(null);
  legendaryOwned = computed(() => {
    const l = this.legendary();
    return !!l && this.lstoreSvc.ownedTrinkets().includes(l.id);
  });

  solvedCount = computed(() => {
    const solved = this.lstoreSvc.solved();
    return this.puzzles().filter(p => solved.includes(p.id)).length;
  });

  cells = computed<cell[]>(() => {
    const f = this.starFilter();
    const list = this.puzzles()
      .map((puzzle, index) => ({ index, puzzle }))
      .filter(c => f === 0 || c.puzzle.rating === f);
    const s = this.sort();
    if (s === 'easy') list.sort((a, b) => a.puzzle.rating - b.puzzle.rating || a.index - b.index);
    if (s === 'hard') list.sort((a, b) => b.puzzle.rating - a.puzzle.rating || a.index - b.index);
    return list;
  });

  constructor() {
    addIcons({ arrowBackOutline, checkmark });
  }

  ionViewWillEnter() {
    this.lstoreSvc.setPlayerInfo();
    this.pack.set(+this.aRoute.snapshot.params['pack'] || 1);
    if (this.eventSvc.isPackBlocked(this.pack())) {
      this.goHome();
      return;
    }
    const e = this.event();
    if (e) {
      const pick = (list: trinket[]) => this.legendary.set(list.find(t => t.id === e.legendaryTrinketId) ?? null);
      if (this.gachaSvc.catalog().length) pick(this.gachaSvc.catalog());
      else this.gachaSvc.loadCatalog().subscribe(pick);
    }
    this.gameSvc.getPack(this.pack()).subscribe(pd => {
      if (!pd) {
        this.goHome();
        return;
      }
      this.puzzles.set(pd.puzzles);
    });
  }

  isSolved(p: puzzle): boolean {
    return this.lstoreSvc.solved().includes(p.id);
  }

  setFilter(stars: number) {
    const next = this.starFilter() === stars ? 0 : stars;
    this.starFilter.set(next);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.PackStarFilter, `${next}`);
    } catch { /* storage unavailable — filter just won't persist */ }
  }

  cycleSort() {
    const order: sort_mode[] = ['order', 'easy', 'hard'];
    this.sort.set(order[(order.indexOf(this.sort()) + 1) % order.length]);
  }

  play(c: cell) {
    this.router.navigate(['/play', this.pack(), c.index]);
  }

  // Last open day, e.g. "Oct 31" for a window that ends Nov 1.
  endLabel(e: event_config): string {
    const last = new Date(2001, e.end.month - 1, e.end.day - 1);
    return last.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  goHome() {
    this.router.navigate(['/'], { replaceUrl: true });
  }

  private loadFilter(): number {
    try {
      const v = +(localStorage.getItem(LOCAL_STORAGE_KEYS.PackStarFilter) ?? 0);
      return v >= 0 && v <= 5 ? v : 0;
    } catch {
      return 0;
    }
  }
}
