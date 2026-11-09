import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon } from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { GameService, pack_summary } from '../services/game.service';
import { LocalstoreService } from '../services/localstore.service';
import { PackCardComponent } from './pack-card.component';

/** Every pack in order, completed ones included, so any pack can be replayed. */
@Component({
  selector: 'app-packs',
  templateUrl: './packs.component.html',
  styleUrls: ['./packs.component.scss'],
  standalone: true,
  imports: [IonHeader, IonContent, IonIcon, PackCardComponent]
})
export class PacksComponent implements ViewWillEnter {
  private router = inject(Router);
  private gameSvc = inject(GameService);
  private lstoreSvc = inject(LocalstoreService);

  packs = signal<pack_summary[]>([]);
  totalPuzzles = computed(() => this.packs().reduce((n, p) => n + p.total, 0));
  totalSolved = computed(() => this.packs().reduce((n, p) => n + p.solved, 0));

  constructor() {
    addIcons({ arrowBackOutline });
  }

  ionViewWillEnter() {
    this.lstoreSvc.setPlayerInfo();
    this.gameSvc.summarizeAll(id => this.lstoreSvc.isSolved(id)).subscribe(list => this.packs.set(list));
  }

  openPack(pack: number) {
    this.router.navigate(['/pack', pack]);
  }

  goHome() {
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
