import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  LOG_LEVEL,
  type PurchasesPackage
} from '@revenuecat/purchases-capacitor';
import { LocalstoreService } from './localstore.service';
import { ENTITLEMENT_AD_FREE } from '../entities/constants';

// RevenueCat public SDK API keys (safe to ship; not secrets). Fill in from the
// RevenueCat dashboard per platform before release.
const REVENUECAT_API_KEY = {
  android: 'goog_LeINqBHYfnVfwsJRvMdGAwlRyFV',
  ios: 'appl_oCHxjpSkzESjbgFHMeNtoyJyWkG'
};

// Identifier of the package in the current offering that grants ad-free.
const REMOVE_ADS_PACKAGE_ID = 'remove_ads';

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private lstore = inject(LocalstoreService);

  private native = Capacitor.isNativePlatform();
  private configured = false;

  // Cached display price for the Remove Ads button (e.g. "$2.99"); null until loaded.
  removeAdsPrice = signal<string | null>(null);

  private get platform(): 'android' | 'ios' {
    return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
  }

  // Called once at app bootstrap. Configures RevenueCat and syncs the ad-free
  // entitlement into local cache. Never throws — store failures must not block play.
  async configure(): Promise<void> {
    if (!this.native || this.configured) return;
    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY[this.platform] });
      this.configured = true;
      await this.refreshEntitlement();
      await this.loadPrice();
    } catch (e) {
      console.warn('[PurchaseService] configure failed', e);
    }
  }

  // Pull the latest entitlement from RevenueCat and mirror it locally.
  async refreshEntitlement(): Promise<void> {
    if (!this.configured) return;
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      this.lstore.setAdFree(!!customerInfo.entitlements.active[ENTITLEMENT_AD_FREE]);
    } catch (e) {
      console.warn('[PurchaseService] refreshEntitlement failed', e);
    }
  }

  private async loadPrice(): Promise<void> {
    const pkg = await this.removeAdsPackage();
    if (pkg) this.removeAdsPrice.set(pkg.product.priceString);
  }

  private async removeAdsPackage(): Promise<PurchasesPackage | null> {
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) return null;
      return (
        current.availablePackages.find(p => p.identifier === REMOVE_ADS_PACKAGE_ID) ??
        current.availablePackages[0] ??
        null
      );
    } catch (e) {
      console.warn('[PurchaseService] getOfferings failed', e);
      return null;
    }
  }

  // Returns true once the ad-free entitlement is active after purchase.
  async purchaseRemoveAds(): Promise<boolean> {
    if (!this.native || !this.configured) return false;
    try {
      const pkg = await this.removeAdsPackage();
      if (!pkg) return false;
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      const active = !!customerInfo.entitlements.active[ENTITLEMENT_AD_FREE];
      this.lstore.setAdFree(active);
      return active;
    } catch (e: any) {
      // User cancellation is expected, not an error worth surfacing loudly.
      if (!e?.userCancelled) console.warn('[PurchaseService] purchase failed', e);
      return false;
    }
  }

  // Re-grants ad-free on a new device / reinstall. Returns true if entitlement active.
  async restorePurchases(): Promise<boolean> {
    if (!this.native || !this.configured) return false;
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const active = !!customerInfo.entitlements.active[ENTITLEMENT_AD_FREE];
      this.lstore.setAdFree(active);
      return active;
    } catch (e) {
      console.warn('[PurchaseService] restore failed', e);
      return false;
    }
  }
}
