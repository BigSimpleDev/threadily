import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonButton, IonIcon } from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
import { ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { sparklesOutline, moonOutline, sunnyOutline } from 'ionicons/icons';
import { LocalstoreService } from '../services/localstore.service';
import { EnergyService } from '../services/energy.service';
import { AdService } from '../services/ad.service';
import { signal } from '@angular/core';
import { SAMPLE_PUZZLES } from '../game/samples';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonButton, IonIcon]
})
export class HomeComponent implements ViewWillEnter {
  private router = inject(Router);
  public lstoreSvc = inject(LocalstoreService);
  public energySvc = inject(EnergyService);
  private adSvc = inject(AdService);
  private toastCtrl = inject(ToastController);

  addingEnergy = signal(false);
  samples = SAMPLE_PUZZLES;

  constructor() {
    addIcons({ sparklesOutline, moonOutline, sunnyOutline });
  }

  ionViewWillEnter() {
    this.lstoreSvc.setPlayerInfo();
  }

  play() {
    this.router.navigate(['/play', 1, 0]);
  }

  playSample(i: number) {
    this.router.navigate(['/play', 0, i]);
  }

  openCollection() {
    this.router.navigate(['/collection']);
  }

  toggleTheme() {
    this.lstoreSvc.toggleDarkMode();
  }

  async addEnergy() {
    if (this.addingEnergy() || !this.energySvc.canWatchAdForEnergy()) return;
    this.addingEnergy.set(true);
    const rewarded = await this.adSvc.showRewarded();
    this.addingEnergy.set(false);
    const t = await this.toastCtrl.create({
      message: rewarded ? `+${this.energySvc.adGrant} energy!` : 'No energy earned — ad not completed.',
      duration: 1800, color: rewarded ? 'success' : 'warning'
    });
    await t.present();
    if (rewarded) this.energySvc.grantFromAd();
  }
}
