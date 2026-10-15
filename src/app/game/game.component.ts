import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { puzzle } from '../entities/entities';
import { STARTING_HEARTS } from '../entities/constants';
import { GameService } from '../services/game.service';
import { SAMPLE_PUZZLES } from './samples';
import { board_state, isFull, lockIn, newBoard, place, unplace } from './board';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [IonHeader, IonContent, IonIcon]
})
export class GameComponent implements OnInit {
  private aRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private gameSvc = inject(GameService);
  private toastCtrl = inject(ToastController);

  pack = signal(0);
  index = signal(0);
  puzzle = signal<puzzle | null>(null);
  board = signal<board_state | null>(null);

  // Tap-to-place: either a tile is picked up first (then a category is
  // tapped), or a category is made active first (then tiles drop straight in).
  selectedTile = signal<string | null>(null);
  activeCat = signal(-1);
  shakeCat = signal(-1);

  hearts = computed(() => {
    const b = this.board();
    const n = Math.max(STARTING_HEARTS, b?.hearts ?? 0);
    return Array.from({ length: n }, (_, i) => i < (b?.hearts ?? 0));
  });
  slotIndexes = computed(() => {
    const b = this.board();
    const n = b?.categories[0]?.answer.length ?? 4;
    return Array.from({ length: n }, (_, i) => i);
  });

  constructor() {
    addIcons({ arrowBackOutline });
  }

  ngOnInit() {
    this.pack.set(+this.aRoute.snapshot.params['pack']);
    this.index.set(+this.aRoute.snapshot.params['index']);

    // Pack 0 is the hardcoded layout-test set.
    if (this.pack() === 0) {
      const p = SAMPLE_PUZZLES[this.index()];
      if (p) this.start(p); else this.goHome();
      return;
    }
    this.gameSvc.loadPack(this.pack()).subscribe(puzzles => {
      const p = puzzles[this.index()];
      if (p) this.start(p); else this.goHome();
    });
  }

  private start(p: puzzle) {
    this.puzzle.set(p);
    this.board.set(newBoard(p, STARTING_HEARTS));
    this.selectedTile.set(null);
    this.activeCat.set(-1);
  }

  tapPoolTile(tile: string) {
    const b = this.board();
    if (!b) return;
    const ac = this.activeCat();
    if (ac >= 0 && !b.categories[ac].locked && !isFull(b.categories[ac])) {
      this.board.set(place(b, tile, ac));
      this.selectedTile.set(null);
      return;
    }
    this.selectedTile.set(this.selectedTile() === tile ? null : tile);
  }

  tapCategory(ci: number) {
    const b = this.board();
    if (!b || b.categories[ci].locked) return;
    const tile = this.selectedTile();
    if (tile) {
      if (isFull(b.categories[ci])) {
        this.flash(ci);
        return;
      }
      this.board.set(place(b, tile, ci));
      this.selectedTile.set(null);
      this.activeCat.set(ci);
      return;
    }
    this.activeCat.set(this.activeCat() === ci ? -1 : ci);
  }

  tapPlacedTile(tile: string, ev: Event) {
    ev.stopPropagation();
    const b = this.board();
    if (!b) return;
    this.board.set(unplace(b, tile));
  }

  lock(ci: number, ev: Event) {
    ev.stopPropagation();
    const b = this.board();
    if (!b) return;
    const { state, result } = lockIn(b, ci);
    this.board.set(state);
    switch (result) {
      case 'correct':
        this.activeCat.set(this.nextOpen(state, ci));
        break;
      case 'one-away':
        this.flash(ci);
        this.toast('One away…');
        break;
      case 'wrong':
        this.flash(ci);
        break;
      case 'already':
        this.toast('Already guessed');
        break;
    }
  }

  // After a correct lock, hop the active row to the next open category.
  private nextOpen(s: board_state, from: number): number {
    const n = s.categories.length;
    for (let k = 1; k <= n; k++) {
      const i = (from + k) % n;
      if (!s.categories[i].locked) return i;
    }
    return -1;
  }

  private flash(ci: number) {
    this.shakeCat.set(ci);
    setTimeout(() => this.shakeCat.set(-1), 400);
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 1400, position: 'middle', cssClass: 'thr-toast' });
    await t.present();
  }

  isFull = isFull;

  goHome() {
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
