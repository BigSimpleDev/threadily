import { Component, inject, signal } from '@angular/core';
import { IonApp, IonRouterOutlet, IonSpinner } from "@ionic/angular/standalone";
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashComponent } from './splash/splash.component';
import { AdService } from './services/ad.service';
import { PurchaseService } from './services/purchase.service';
import { LocalstoreService } from './services/localstore.service';
import { EnergyService } from './services/energy.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet, SplashComponent, IonSpinner]
})
export class AppComponent {
  adSvc = inject(AdService);
  private purchaseSvc = inject(PurchaseService);
  private lstoreSvc = inject(LocalstoreService);
  private energySvc = inject(EnergyService);

  showSplash = signal(true);

  constructor() {
    // Initialize monetization during the splash so ad-free state is known before
    // the first game. Both are native no-ops on web and never throw.
    this.adSvc.init();
    this.purchaseSvc.configure();

    // Start energy accrual (applies any offline refill, then ticks each second).
    this.energySvc.init();

    // Lock to portrait on all native platforms. No-op / rejects harmlessly on web.
    ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => { /* web: unsupported */ });

    // Stop the status bar overlaying the webview so the header never sits under
    // the notification bar / camera cutout. Native only; web has no plugin.
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => { /* unsupported */ });
      StatusBar.setStyle({ style: this.lstoreSvc.darkMode() ? Style.Dark : Style.Light })
        .catch(() => { /* unsupported */ });

      // A pending ad fetch never fires its load/fail event once backgrounded;
      // clear the spinner on resume so it can't get stuck.
      App.addListener('resume', () => this.adSvc.hideLoading());
    }
  }

  onSplashDismissed() {
    this.showSplash.set(false);
  }
}
