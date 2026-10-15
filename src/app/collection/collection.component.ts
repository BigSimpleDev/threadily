import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, homeOutline, home, chevronDown } from 'ionicons/icons';
import { LocalstoreService } from '../services/localstore.service';
import { GachaService, rollResult } from '../services/gacha.service';
import { PurchaseService } from '../services/purchase.service';
import { trinket } from '../entities/entities';
import { ROLL_COST, DUPLICATE_REFUND, ROLL_MULTIPLIERS, LOCAL_STORAGE_KEYS } from '../entities/constants';

interface trinketSet {
  name: string;
  items: trinket[];
}

@Component({
  selector: 'app-collection',
  templateUrl: './collection.component.html',
  styleUrls: ['./collection.component.scss'],
  standalone: true,
  imports: [UpperCasePipe, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon]
})
export class CollectionComponent implements OnInit {
  private router = inject(Router);
  public lstoreSvc = inject(LocalstoreService);
  public gachaSvc = inject(GachaService);
  public purchaseSvc = inject(PurchaseService);
  private toastCtrl = inject(ToastController);

  ROLL_COST = ROLL_COST;
  DUPLICATE_REFUND = DUPLICATE_REFUND;
  ROLL_MULTIPLIERS = ROLL_MULTIPLIERS;

  rolling = signal(false);
  // Current roll multiplier; tapping the chip cycles through ROLL_MULTIPLIERS.
  multiplier = signal(ROLL_MULTIPLIERS[0]);
  // Stack of pending reveals from the most recent (multi-)roll. Revealed front
  // (index 0) first; each dismiss/redeem pops one so the player sees every pull.
  rollQueue = signal<rollResult[]>([]);
  inspecting = signal<trinket | null>(null);
  purchasing = signal(false);

  currentReveal = computed(() => this.rollQueue()[0] ?? null);
  // Depth cards drawn behind the front reveal for a "stacked" look (max 2).
  stackDepth = computed(() =>
    Array.from({ length: Math.min(this.rollQueue().length - 1, 2) }, (_, i) => i + 1)
  );

  sets = computed<trinketSet[]>(() => {
    const grouped: Record<string, trinket[]> = {};
    this.gachaSvc.catalog().forEach(t => (grouped[t.set] ??= []).push(t));
    return Object.entries(grouped).map(([name, items]) => ({ name, items }));
  });

  // Sets start collapsed; this holds the ones the player has opened.
  // Remembered on this device only.
  expanded = signal<Set<string>>(this.loadExpanded());

  ownedCount = computed(() => this.lstoreSvc.ownedTrinkets().length);
  totalCount = computed(() => this.gachaSvc.catalog().length);

  constructor() {
    addIcons({ arrowBackOutline, homeOutline, home, chevronDown });
  }

  ngOnInit() {
    this.lstoreSvc.setPlayerInfo();
    this.gachaSvc.loadCatalog().subscribe();
  }

  owns(id: string): boolean {
    return this.lstoreSvc.ownsTrinket(id);
  }

  setOwned(s: trinketSet): number {
    return s.items.filter(t => this.owns(t.id)).length;
  }

  isCollapsed(name: string): boolean {
    return !this.expanded().has(name);
  }

  toggleSet(name: string) {
    const next = new Set(this.expanded());
    if (next.has(name)) next.delete(name); else next.add(name);
    this.expanded.set(next);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ExpandedSets, JSON.stringify([...next]));
    } catch { /* storage unavailable — state just won't persist */ }
  }

  private loadExpanded(): Set<string> {
    try {
      return new Set(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.ExpandedSets) ?? '[]'));
    } catch {
      return new Set();
    }
  }

  cycleMultiplier() {
    const i = ROLL_MULTIPLIERS.indexOf(this.multiplier());
    this.multiplier.set(ROLL_MULTIPLIERS[(i + 1) % ROLL_MULTIPLIERS.length]);
  }

  rollCost = computed(() => ROLL_COST * this.multiplier());

  canRoll(): boolean {
    return !this.rolling() && this.rollQueue().length === 0
      && this.lstoreSvc.coins() >= this.rollCost() && this.totalCount() > 0;
  }

  roll() {
    if (!this.canRoll()) return;
    this.rolling.set(true);
    this.rollQueue.set(this.gachaSvc.rollBatch(this.multiplier()));
    this.rolling.set(false);
  }

  // Backdrop tap: advance past the front reveal unless it's an unredeemed
  // duplicate (those must be redeemed first).
  advanceReveal() {
    if (this.currentReveal()?.duplicate) return;
    this.dismissCurrent();
  }

  dismissCurrent() {
    this.rollQueue.update(q => q.slice(1));
  }

  redeemCurrent() {
    const amount = this.gachaSvc.redeemDuplicate();
    this.dismissCurrent();
    this.toast(`+${amount}¢ for the duplicate`, 'success');
  }

  inspect(t: trinket) {
    if (this.owns(t.id)) this.inspecting.set(t);
  }

  closeInspect() {
    this.inspecting.set(null);
  }

  setFeatured(t: trinket) {
    const alreadyFeatured = this.lstoreSvc.featuredTrinket()?.id === t.id;
    this.lstoreSvc.setFeaturedTrinket(alreadyFeatured ? null : t);
    this.toast(alreadyFeatured ? 'Removed from home screen' : 'Set as home screen icon', 'success');
  }

  async restore() {
    if (this.purchasing()) return;
    this.purchasing.set(true);
    const ok = await this.purchaseSvc.restorePurchases();
    this.purchasing.set(false);
    await this.toast(ok ? 'Purchases restored.' : 'Nothing to restore.', ok ? 'success' : 'medium');
  }

  private async toast(message: string, color: string) {
    const t = await this.toastCtrl.create({ message, duration: 2000, color });
    await t.present();
  }

  goHome() {
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
