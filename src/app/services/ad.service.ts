import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
  type AdMobRewardItem
} from '@capacitor-community/admob';
import { LocalstoreService } from './localstore.service';
import {
  LOCAL_STORAGE_KEYS,
  INTERSTITIAL_MIN_LEVELS,
  INTERSTITIAL_MIN_SECONDS
} from '../entities/constants';

// Google's public test ad units until the Threadily AdMob app exists. Swap in
// the live ids before release — see MONETIZATION_INSTRUCTIONS.md.
const INTERSTITIAL_AD = {
  android: 'ca-app-pub-5241648641136523/6353268232',
  ios: 'ca-app-pub-5241648641136523/8105333601'
};
const REWARDED_AD = {
  android: 'ca-app-pub-5241648641136523/3727104897',
  ios: 'ca-app-pub-5241648641136523/3918676583'
};

@Injectable({ providedIn: 'root' })
export class AdService {
  private lstore = inject(LocalstoreService);

  // Native-only. On web (npm start) every method is a graceful no-op so the
  // game runs unchanged in the browser.
  private native = Capacitor.isNativePlatform();
  private ready = false;

  // Theme starts since the last interstitial; gates frequency along with time.
  private levelsSinceAd = 0;
  // Suppress an interstitial on the very first game of a session.
  private firstGameSeen = false;

  // True while an ad is fetching (the lag between requesting it and it appearing).
  // UI binds a blocking spinner to this.
  readonly loading = signal(false);

  private get platform(): 'android' | 'ios' {
    return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
  }

  // Called once during app bootstrap. Never throws — ad failures must not block play.
  async init(): Promise<void> {
    if (!this.native || this.ready) return;
    try {
      await AdMob.initialize();

      // GDPR/consent before requesting ads. ATT is requested from native Swift
      // (AppDelegate) before this runs, satisfying iOS 17+/iPadOS 26+ requirements.
      const consent = await AdMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }
      this.ready = true;
    } catch (e) {
      console.warn('[AdService] init failed; ads disabled this session', e);
    }
  }

  // Frequency-capped interstitial, shown as a theme starts. Skips when ad-free,
  // on the first game of the session, or before the level/time caps are met.
  // Safe to call liberally.
  async maybeShowInterstitial(): Promise<void> {
    if (!this.native || !this.ready) return;
    if (this.lstore.adFree()) return;

    if (!this.firstGameSeen) {
      this.firstGameSeen = true;
      return;
    }

    this.levelsSinceAd += 1;
    if (this.levelsSinceAd < INTERSTITIAL_MIN_LEVELS) return;

    const last = +(this.lstore.get(LOCAL_STORAGE_KEYS.LastInterstitial) ?? 0);
    if (Date.now() - last < INTERSTITIAL_MIN_SECONDS * 1000) return;

    try {
      this.loading.set(true);
      await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD[this.platform] });
      this.loading.set(false);

      const dismissed = new Promise<void>(resolve => {
        const h = AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          h.then(l => l.remove());
          resolve();
        });
      });
      await AdMob.showInterstitial();
      await dismissed;

      this.levelsSinceAd = 0;
      this.lstore.set(LOCAL_STORAGE_KEYS.LastInterstitial, `${Date.now()}`);
    } catch (e) {
      this.loading.set(false);
      console.warn('[AdService] interstitial failed', e);
    }
  }

  // Opt-in rewarded ad. Resolves true only when the reward is actually granted.
  // Always available, even for ad-free users (it's a benefit, not an interruption).
  // Serves both the extra-life and energy-top-up rewards.
  // On web returns true so the reward flow is testable in the browser.
  async showRewarded(): Promise<boolean> {
    if (!this.native) return true;
    if (!this.ready) return false;

    try {
      this.loading.set(true);
      await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD[this.platform] });
      this.loading.set(false);

      let rewarded = false;
      const rewardHandle = AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        (_item: AdMobRewardItem) => { rewarded = true; }
      );
      const dismissed = new Promise<void>(resolve => {
        const h = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          h.then(l => l.remove());
          resolve();
        });
      });

      await AdMob.showRewardVideoAd();
      await dismissed;
      rewardHandle.then(l => l.remove());
      return rewarded;
    } catch (e) {
      this.loading.set(false);
      console.warn('[AdService] rewarded ad failed', e);
      return false;
    }
  }

  // Called on app resume — an ad may have been mid-fetch when backgrounded and
  // will never fire its load/fail event, which would strand the spinner.
  hideLoading(): void {
    this.loading.set(false);
  }
}
