import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon } from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, checkmark } from 'ionicons/icons';
import { GameService } from '../services/game.service';
import { LocalstoreService } from '../services/localstore.service';
import { puzzle } from '../entities/entities';
import { LOCAL_STORAGE_KEYS } from '../entities/constants';

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

  readonly starOptions = [1, 2, 3, 4, 5];
  readonly sortLabels: Record<sort_mode, string> = { order: 'In order', easy: 'Easiest first', hard: 'Hardest first' };

  pack = signal(1);
  puzzles = signal<puzzle[]>([]);
  // 0 = every rating; 1–5 = only that rating. Remembered across visits.
  starFilter = signal(this.loadFilter());
  sort = signal<sort_mode>('order');

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
