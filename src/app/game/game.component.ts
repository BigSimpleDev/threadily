import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { AlertController, IonContent, IonHeader, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, informationCircleOutline, bulbOutline } from 'ionicons/icons';
import { puzzle, trinket } from '../entities/entities';
import {
  STARTING_HEARTS, AD_HEARTS_GRANT, HINT_COST, ENERGY_PER_GAME, ENERGY_PER_EVENT_GAME, LOCAL_STORAGE_KEYS,
  COINS_FIRST_CLEAR, REPLAY_COIN_MULTIPLIER
} from '../entities/constants';
import { GameService } from '../services/game.service';
import { LocalstoreService } from '../services/localstore.service';
import { EnergyService } from '../services/energy.service';
import { AdService } from '../services/ad.service';
import { EventService } from '../services/event.service';
import { GachaService } from '../services/gacha.service';
import { SAMPLE_PUZZLES } from './samples';
import { HOW_TO_STEPS } from '../entities/how-to';
import { addHearts, board_state, hint, isFull, isWon, lockIn, newBoard, place, unplace } from './board';

// How long a wrong guess stays on screen (red row, lost heart) before its
// tiles return to the pool.
const WRONG_FLASH_MS = 750;

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [IonHeader, IonContent, IonIcon, CdkDropListGroup, CdkDropList, CdkDrag]
})
export class GameComponent implements OnInit {
  private aRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private gameSvc = inject(GameService);
  public lstoreSvc = inject(LocalstoreService);
  public energySvc = inject(EnergyService);
  private adSvc = inject(AdService);
  private eventSvc = inject(EventService);
  private gachaSvc = inject(GachaService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private destroyRef = inject(DestroyRef);

  readonly HINT_COST = HINT_COST;
  readonly AD_HEARTS_GRANT = AD_HEARTS_GRANT;
  readonly tutorialSteps = HOW_TO_STEPS;
  // A touch must rest briefly on a tile before it lifts, so a swipe that starts
  // on a tile still scrolls the board and a quick tap still taps.
  readonly DRAG_START_DELAY = { touch: 25, mouse: 0 };

  pack = signal(0);
  index = signal(0);
  puzzle = signal<puzzle | null>(null);
  board = signal<board_state | null>(null);

  // Tap-to-place: either a tile is picked up first (then a category is
  // tapped), or a category is made active first (then tiles drop straight in).
  selectedTile = signal<string | null>(null);
  activeCat = signal(-1);
  shakeCat = signal(-1);
  wrongFlash = signal<{ ci: number; tiles: string[] } | null>(null);
  private wrongTimer?: ReturnType<typeof setTimeout>;
  celebrateCat = signal(-1);

  won = signal(false);
  coinsAwarded = signal(0);
  firstClear = signal(false);
  mistakes = signal(0);
  outOfHearts = signal(false);
  watchingAd = signal(false);
  // Back arrow mid-puzzle asks first: the energy spent to start is forfeit.
  confirmLeave = signal(false);
  // Couldn't afford to start; the modal offers an ad or a way out.
  outOfEnergy = signal(false);
  energyWait = signal('');
  // First-launch walkthrough on pack 1 #1: index into HOW_TO_STEPS, -1 = off.
  // Steps 0 (place) and 1 (lock in) advance on the real action.
  tutorial = signal(-1);

  // Pack 0 is the hardcoded layout-test set: free practice — no energy, coins,
  // or progress.
  practice = computed(() => this.pack() === 0);
  // The seasonal event this pack belongs to, if any.
  event = computed(() => this.eventSvc.eventForPack(this.pack()));
  energyCost = computed(() => this.event() ? ENERGY_PER_EVENT_GAME : ENERGY_PER_GAME);
  // Set on the solve that finishes an event: its legendary trinket.
  eventReward = signal<trinket | null>(null);

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
    this.outOfEnergy.set(false);
    this.confirmLeave.set(false);
    this.eventReward.set(null);
    this.lstoreSvc.setPlayerInfo();

    // Event puzzles exist only while their window is open.
    if (this.eventSvc.isPackBlocked(pack)) {
      this.goHome();
      return;
    }

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
      if (!this.energySvc.spendForGame(this.energyCost())) {
        this.puzzle.set(p);
        this.promptOutOfEnergy();
        return;
      }
      // Event packs never become the remembered position — they vanish after the window.
      if (!this.event()) this.lstoreSvc.setCurrent(this.pack(), this.index());
      // Interstitials run as a puzzle starts, never over the win moment.
      await this.adSvc.maybeShowInterstitial();
      this.start(p);
    });
  }

  private start(p: puzzle) {
    this.puzzle.set(p);
    const first = this.pack() === 1 && this.index() === 0;
    this.tutorial.set(first && !this.lstoreSvc.get(LOCAL_STORAGE_KEYS.TutorialSeen) ? 0 : -1);
    this.board.set(newBoard(p, STARTING_HEARTS));
    this.selectedTile.set(null);
    this.activeCat.set(-1);
    this.won.set(false);
    this.outOfHearts.set(false);
    this.mistakes.set(0);
  }

  get playable(): boolean {
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
      this.tutorialAdvance(0);
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
      this.tutorialAdvance(0);
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

  // ── Drag and drop ───────────────────────────────────────────
  // Lists carry a category index (-1 = pool). Where in the list the tile lands
  // doesn't matter: a drop always appends it as the category's next tile.
  canEnter = (drag: CdkDrag<string>, drop: CdkDropList<number>): boolean => {
    const c = this.board()?.categories[drop.data];
    return !!c && !c.locked && (!isFull(c) || c.slots.includes(drag.data));
  };

  dropTile(e: CdkDragDrop<number, number, string>) {
    const b = this.board();
    const to = e.container.data;
    // The CDK hands the drop to the last list the tile entered, even if the
    // finger has since moved on (e.g. over a full row), so require the pointer
    // to still be over it; otherwise the tile just snaps back.
    if (!b || !this.playable || !e.isPointerOverContainer || to === e.previousContainer.data) return;
    if (to < 0) {
      this.board.set(unplace(b, e.item.data));
      return;
    }
    this.board.set(place(b, e.item.data, to));
    this.selectedTile.set(null);
    this.activeCat.set(to);
    this.tutorialAdvance(0);
  }

  // ── Lock In ─────────────────────────────────────────────────
  lock(ci: number, ev: Event) {
    ev.stopPropagation();
    const b = this.board();
    if (!b || !this.playable) return;
    const guessed = b.categories[ci].slots;
    const { state, result } = lockIn(b, ci);
    this.board.set(state);
    this.tutorialAdvance(1);
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
        this.missed(ci, state, guessed);
        this.toast('One away…');
        break;
      case 'wrong':
        this.missed(ci, state, guessed);
        break;
      case 'already':
        this.toast('Already guessed');
        break;
    }
  }

  private missed(ci: number, state: board_state, guessed: string[]) {
    this.mistakes.update(m => m + 1);
    this.showWrong(ci, guessed);
    if (state.hearts <= 0) {
      this.selectedTile.set(null);
      setTimeout(() => this.outOfHearts.set(true), WRONG_FLASH_MS);
    }
  }

  // The board state has already sent the tiles home; this only holds the
  // guess on screen, in red, for a beat so the miss reads clearly.
  private showWrong(ci: number, guessed: string[]) {
    clearTimeout(this.wrongTimer);
    this.wrongFlash.set({ ci, tiles: guessed });
    this.wrongTimer = setTimeout(() => this.wrongFlash.set(null), WRONG_FLASH_MS);
  }

  // Tiles still showing in a red row are hidden from the pool until it clears.
  heldInWrongRow(tile: string): boolean {
    const w = this.wrongFlash();
    return !!w && w.tiles.includes(tile) && !this.board()!.categories[w.ci].pinned.includes(tile);
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

  // ── Tutorial ────────────────────────────────────────────────
  private tutorialAdvance(from: number) {
    if (this.tutorial() === from) this.tutorial.set(from + 1);
  }

  tutorialNext() {
    const next = this.tutorial() + 1;
    if (next >= HOW_TO_STEPS.length) this.tutorialDone();
    else this.tutorial.set(next);
  }

  tutorialDone() {
    this.tutorial.set(-1);
    this.lstoreSvc.set(LOCAL_STORAGE_KEYS.TutorialSeen, 'true');
  }

  // ── Win ─────────────────────────────────────────────────────
  private userWon() {
    const p = this.puzzle();
    if (!p) return;
    this.won.set(true);
    if (this.tutorial() >= 0) this.tutorialDone();
    if (this.practice()) return;
    const first = !this.lstoreSvc.isSolved(p.id);
    const coins = first ? COINS_FIRST_CLEAR : Math.max(1, Math.floor(COINS_FIRST_CLEAR * REPLAY_COIN_MULTIPLIER));
    this.firstClear.set(first);
    this.coinsAwarded.set(coins);
    this.lstoreSvc.addCoins(coins);
    this.lstoreSvc.markSolved(p.id);
    const e = this.event();
    if (e) {
      this.eventSvc.claimIfComplete(e).subscribe(id => {
        if (!id) return;
        const show = (list: trinket[]) => this.eventReward.set(list.find(t => t.id === id) ?? null);
        if (this.gachaSvc.catalog().length) show(this.gachaSvc.catalog());
        else this.gachaSvc.loadCatalog().subscribe(show);
      });
    }
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
        // Last puzzle of an event pack: back to the event, not out of it.
        if (this.event()) this.backToPack(); else this.goHome();
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
  private promptOutOfEnergy() {
    this.energyWait.set(this.energySvc.timeToAfford(this.energyCost()));
    this.outOfEnergy.set(true);
  }

  async watchAdForEnergy() {
    if (this.watchingAd()) return;
    this.watchingAd.set(true);
    const rewarded = await this.adSvc.showRewarded();
    this.watchingAd.set(false);
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

  // Header back arrow. Practice and finished boards leave straight away;
  // otherwise confirm, since leaving forfeits the energy already spent.
  tapBack() {
    if (this.board() && !this.won() && !this.practice()) {
      this.confirmLeave.set(true);
      return;
    }
    this.backToPack();
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
