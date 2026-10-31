import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonHeader, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, moonOutline, banOutline, refreshOutline, helpCircleOutline,
  shieldCheckmarkOutline, chevronForward, checkmarkCircle, gridOutline
} from 'ionicons/icons';
import { LocalstoreService } from '../services/localstore.service';
import { PurchaseService } from '../services/purchase.service';
import { HOW_TO_STEPS } from '../entities/how-to';
import { IAP_ENABLED, LOCAL_STORAGE_KEYS } from '../entities/constants';

export const PRIVACY_URL = 'https://bigsimple.dev/games/threadily/privacy';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [IonHeader, IonContent, IonIcon]
})
export class SettingsComponent {
  private router = inject(Router);
  public lstoreSvc = inject(LocalstoreService);
  public purchaseSvc = inject(PurchaseService);
  private toastCtrl = inject(ToastController);

  readonly steps = HOW_TO_STEPS;
  readonly iapEnabled = IAP_ENABLED;
  purchasing = signal(false);
  showHowTo = signal(false);

  constructor() {
    addIcons({
      arrowBackOutline, moonOutline, banOutline, refreshOutline, helpCircleOutline,
      shieldCheckmarkOutline, chevronForward, checkmarkCircle, gridOutline
    });
  }

  toggleDark() {
    this.lstoreSvc.toggleDarkMode();
  }

  async removeAds() {
    if (this.purchasing() || this.lstoreSvc.adFree()) return;
    this.purchasing.set(true);
    const ok = await this.purchaseSvc.purchaseRemoveAds();
    this.purchasing.set(false);
    this.toast(ok ? 'Ads removed — thank you!' : 'Purchase not completed.');
  }

  async restore() {
    if (this.purchasing()) return;
    this.purchasing.set(true);
    const ok = await this.purchaseSvc.restorePurchases();
    this.purchasing.set(false);
    this.toast(ok ? 'Purchases restored.' : 'Nothing to restore.');
  }

  // Replays the first-launch walkthrough next time pack 1 #1 opens.
  replayTutorial() {
    this.lstoreSvc.remove(LOCAL_STORAGE_KEYS.TutorialSeen);
    this.showHowTo.set(false);
    this.router.navigate(['/play', 1, 0]);
  }

  // The #2 layout-test boards (pack 0): starts at the first 5×4.
  boardTest() {
    this.router.navigate(['/play', 0, 3]);
  }

  openPrivacy() {
    window.open(PRIVACY_URL, '_blank');
  }

  goHome() {
    this.router.navigate(['/'], { replaceUrl: true });
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2000, position: 'middle', cssClass: 'thr-toast' });
    await t.present();
  }
}
