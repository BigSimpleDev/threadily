import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonContent, IonHeader, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, informationCircleOutline, bulbOutline } from 'ionicons/icons';
import { puzzle } from '../entities/entities';
import {
  STARTING_HEARTS, AD_HEARTS_GRANT, HINT_COST, ENERGY_PER_GAME,
  COINS_FIRST_CLEAR, REPLAY_COIN_MULTIPLIER
} from '../entities/constants';
import { GameService } from '../services/game.service';
import { LocalstoreService } from '../services/localstore.service';
import { EnergyService } from '../services/energy.service';
import { AdService } from '../services/ad.service';
import { SAMPLE_PUZZLES } from './samples';
import { addHearts, board_state, hint, isFull, isWon, lockIn, newBoard, place, unplace } from './board';

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
  public lstoreSvc = inject(LocalstoreService);
  public energySvc = inject(EnergyService);
  private adSvc = inject(AdService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private destroyRef = inject(DestroyRef);

  readonly HINT_COST = HINT_COST;
  readonly AD_HEARTS_GRANT = AD_HEARTS_GRANT;

  pack = signal(0);
  index = signal(0);
  puzzle = signal<puzzle | null>(null);
  board = signal<board_state | null>(null);

  // Tap-to-place: either a tile is picked up first (then a category is
  // tapped), or a category is made active first (then tiles drop straight in).
  selectedTile = signal<string | null>(null);
  activeCat = signal(-1);
  shakeCat = signal(-1);
  celebrateCat = signal(-1);

  won = signal(false);
  coinsAwarded = signal(0);
  firstClear = signal(false);
  mistakes = signal(0);
  outOfHearts = signal(false);
  watchingAd = signal(false);

  // Pack 0 is the hardcoded layout-test set: free practice — no energy, coins,
  // or progress.
  practice = computed(() => this.pack() === 0);

  hearts = computed(() => {
    const n = this.board()?.hearts ?? 0;
    return Array.from({ length: Math.max(STARTING_HEARTS, n) }, (_, i) => i < n);
  });
  slotIndexes = computed(() => {
    const n = this.board()?.categories[0]?.answer.length ?? 4;
    return Array.from({ length: n }, (_, i) => i);
  });

  isFull = isFull;

  constructor() {
    addIcons({ arrowBackOutline, informationCircleOutline, bulbOutline });
  }

  ngOnInit() {
    // Params, not the snapshot: "Next puzzle" may land on this same instance.
    this.aRoute.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(pm => {
      this.load(+(pm.get('pack') ?? 0), +(pm.get('index') ?? 0));
    });
  }

  private load(pack: number, index: number) {
    this.pack.set(pack);
    this.index.set(index);
    this.board.set(null);
    this.won.set(false);
    this.outOfHearts.set(false);
    this.lstoreSvc.setPlayerInfo();

    if (this.practice()) {
      const p = SAMPLE_PUZZLES[this.index()];
      if (p) this.start(p); else this.goHome();
      return;
    }
    this.gameSvc.loadPack(this.pack()).subscribe(async puzzles => {
      const p = puzzles[this.index()];
      if (!p) {
        this.goHome();
        return;
      }
      // Charge energy to begin; block if the player can't afford it.
      if (!this.energySvc.spendForGame(ENERGY_PER_GAME)) {
        this.puzzle.set(p);
        this.promptOutOfEnergy();
        return;
      }
      this.lstoreSvc.setCurrent(this.pack(), this.index());
      // Interstitials run as a puzzle starts, never over the win moment.
      await this.adSvc.maybeShowInterstitial();
      this.start(p);
    });
  }

  private start(p: puzzle) {
    this.puzzle.set(p);
    this.board.set(newBoard(p, STARTING_HEARTS));
    this.selectedTile.set(null);
    this.activeCat.set(-1);
    this.won.set(false);
    this.outOfHearts.set(false);
    this.mistakes.set(0);
  }

  private get playable(): boolean {
    return !!this.board() && !this.won() && !this.outOfHearts();
  }

  // ── Placing ─────────────────────────────────────────────────
  tapPoolTile(tile: string) {
    const b = this.board();
    if (!b || !this.playable) return;
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
    if (!b || !this.playable || b.categories[ci].locked) return;
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
    if (!b || !this.playable) return;
    this.board.set(unplace(b, tile));
  }

  // ── Lock In ─────────────────────────────────────────────────
  lock(ci: number, ev: Event) {
    ev.stopPropagation();
    const b = this.board();
    if (!b || !this.playable) return;
    const { state, result } = lockIn(b, ci);
    this.board.set(state);
    switch (result) {
      case 'correct':
        this.celebrate(ci);
        if (isWon(state)) {
          this.activeCat.set(-1);
          setTimeout(() => this.userWon(), 650);
        } else {
          this.activeCat.set(this.nextOpen(state, ci));
        }
        break;
      case 'one-away':
        this.missed(ci, state);
        this.toast('One away…');
        break;
      case 'wrong':
        this.missed(ci, state);
        break;
      case 'already':
        this.toast('Already guessed');
        break;
    }
  }

  private missed(ci: number, state: board_state) {
    this.mistakes.update(m => m + 1);
    this.flash(ci);
    if (state.hearts <= 0) {
      this.selectedTile.set(null);
      setTimeout(() => this.outOfHearts.set(true), 450);
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

  private celebrate(ci: number) {
    this.celebrateCat.set(ci);
    setTimeout(() => this.celebrateCat.set(-1), 900);
  }

  // ── Win ─────────────────────────────────────────────────────
  private userWon() {
    const p = this.puzzle();
    if (!p) return;
    this.won.set(true);
    if (this.practice()) return;
    const first = !this.lstoreSvc.isSolved(p.id);
    const coins = first ? COINS_FIRST_CLEAR : Math.max(1, Math.floor(COINS_FIRST_CLEAR * REPLAY_COIN_MULTIPLIER));
    this.firstClear.set(first);
    this.coinsAwarded.set(coins);
    this.lstoreSvc.addCoins(coins);
    this.lstoreSvc.markSolved(p.id);
  }

  nextPuzzle() {
    if (this.practice()) {
      const next = this.index() + 1;
      if (next < SAMPLE_PUZZLES.length) this.router.navigate(['/play', 0, next], { replaceUrl: true });
      else this.goHome();
      return;
    }
    this.gameSvc.nextAfter(this.pack(), this.index()).subscribe(r => {
      if (!r) {
        this.goHome();
        return;
      }
      this.router.navigate(['/play', r.pack, r.index], { replaceUrl: true });
    });
  }

  // ── Hearts ──────────────────────────────────────────────────
  // Rewarded ad → +3 hearts with the board kept. No cap per attempt.
  async watchAdForHearts() {
    if (this.watchingAd()) return;
    this.watchingAd.set(true);
    const rewarded = await this.adSvc.showRewarded();
    this.watchingAd.set(false);
    const b = this.board();
    if (!rewarded || !b) {
      this.toast('No hearts earned — ad not completed.');
      return;
    }
    this.board.set(addHearts(b, AD_HEARTS_GRANT));
    this.outOfHearts.set(false);
  }

  // Energy was spent at the start, so giving up just leaves.
  giveUp() {
    this.backToPack();
  }

  // ── Hint ────────────────────────────────────────────────────
  async buyHint() {
    const b = this.board();
    if (!b || !this.playable) return;
    if (this.lstoreSvc.coins() < HINT_COST) {
      this.toast(`A hint costs ${HINT_COST} coins — you have ${this.lstoreSvc.coins()}.`);
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Use a hint?',
      message: `Place one correct tile for ${HINT_COST} coins. You have ${this.lstoreSvc.coins()}.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: `Use (${HINT_COST}¢)`, role: 'confirm' }
      ]
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    const current = this.board();
    if (!current) return;
    const r = hint(current);
    if (!r) return;
    if (!this.lstoreSvc.spendCoins(HINT_COST)) return;
    this.board.set(r.state);
    this.selectedTile.set(null);
    this.activeCat.set(r.category);
  }

  // ── Energy ──────────────────────────────────────────────────
  private async promptOutOfEnergy() {
    const canWatch = this.energySvc.canWatchAdForEnergy();
    const buttons: { text: string; role?: string; handler: () => void }[] = [];
    if (canWatch) {
      buttons.push({
        text: `Watch ad +${this.energySvc.adGrant} (${this.energySvc.adsLeftToday()}/${this.energySvc.adMaxPerDay} left today)`,
        handler: () => { this.watchAdForEnergy(); }
      });
    }
    buttons.push({ text: 'Back', role: 'cancel', handler: () => { this.backToPack(); } });
    const wait = this.energySvc.timeToAfford(ENERGY_PER_GAME);
    const alert = await this.alertCtrl.create({
      header: 'Out of energy',
      message: `A puzzle costs ${ENERGY_PER_GAME} energy; you have ${this.energySvc.energy()}.` +
        (wait ? ` Enough refills in ${wait}.` : ''),
      backdropDismiss: false,
      buttons
    });
    await alert.present();
  }

  private async watchAdForEnergy() {
    const rewarded = await this.adSvc.showRewarded();
    if (!rewarded) {
      this.toast('No energy earned — ad not completed.');
      this.backToPack();
      return;
    }
    this.energySvc.grantFromAd();
    this.load(this.pack(), this.index());
  }

  // ── Navigation / misc ──────────────────────────────────────
  async showDisclaimer() {
    const owner = this.puzzle()?.warning;
    if (!owner) return;
    const alert = await this.alertCtrl.create({
      header: 'About This Content',
      message:
        `Threadily is not affiliated with, endorsed by, or approved by ${owner}. ` +
        `Names are used only to refer to publicly known facts.`,
      buttons: ['OK']
    });
    await alert.present();
  }

  backToPack() {
    if (this.practice()) {
      this.goHome();
      return;
    }
    this.router.navigate(['/pack', this.pack()], { replaceUrl: true });
  }

  goHome() {
    this.router.navigate(['/'], { replaceUrl: true });
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 1400, position: 'middle', cssClass: 'thr-toast' });
    await t.present();
  }
}
