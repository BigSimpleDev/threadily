import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, ToastController } from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { sparklesOutline, settingsOutline, chevronForward, trophyOutline } from 'ionicons/icons';
import { LocalstoreService } from '../services/localstore.service';
import { EnergyService } from '../services/energy.service';
import { AdService } from '../services/ad.service';
import { GachaService } from '../services/gacha.service';
import { GameService, pack_summary, puzzle_ref } from '../services/game.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonIcon]
})
export class HomeComponent implements ViewWillEnter {
  private router = inject(Router);
  public lstoreSvc = inject(LocalstoreService);
  public energySvc = inject(EnergyService);
  private adSvc = inject(AdService);
  private gachaSvc = inject(GachaService);
  private gameSvc = inject(GameService);
  private toastCtrl = inject(ToastController);

  readonly stars = [1, 2, 3, 4, 5];

  // "Continue": the first unsolved puzzle in authored order. Null once every
  // puzzle is solved (shows the all-done card instead).
  next = signal<puzzle_ref | null>(null);
  loaded = signal(false);
  packs = signal<pack_summary[]>([]);
  trinketTotal = signal(0);
  addingEnergy = signal(false);

  totalPuzzles = computed(() => this.packs().reduce((n, p) => n + p.total, 0));
  totalSolved = computed(() => this.packs().reduce((n, p) => n + p.solved, 0));

  constructor() {
    addIcons({ sparklesOutline, settingsOutline, chevronForward, trophyOutline });
  }

  ionViewWillEnter() {
    this.lstoreSvc.setPlayerInfo();
    const solved = (id: number) => this.lstoreSvc.isSolved(id);
    this.gameSvc.nextUnsolved(solved).subscribe(r => {
      this.next.set(r);
      this.loaded.set(true);
    });
    this.gameSvc.summarizeAll(solved).subscribe(list => this.packs.set(list));
    if (this.gachaSvc.catalog().length === 0) {
      this.gachaSvc.loadCatalog().subscribe(c => this.trinketTotal.set(c.length));
    } else {
      this.trinketTotal.set(this.gachaSvc.catalog().length);
    }
  }

  play() {
    const n = this.next();
    if (n) this.router.navigate(['/play', n.pack, n.index]);
  }

  openPack(pack: number) {
    this.router.navigate(['/pack', pack]);
  }

  openCollection() {
    this.router.navigate(['/collection']);
  }

  openSettings() {
    this.router.navigate(['/settings']);
  }

  pct(solved: number, total: number): number {
    return total ? Math.round((solved / total) * 100) : 0;
  }

  async addEnergy() {
    if (this.addingEnergy() || !this.energySvc.canWatchAdForEnergy()) return;
    this.addingEnergy.set(true);
    const rewarded = await this.adSvc.showRewarded();
    this.addingEnergy.set(false);
    if (rewarded) this.energySvc.grantFromAd();
    const t = await this.toastCtrl.create({
      message: rewarded ? `+${this.energySvc.adGrant} energy!` : 'No energy earned — ad not completed.',
      duration: 1800, position: 'middle', cssClass: 'thr-toast'
    });
    await t.present();
  }
}
