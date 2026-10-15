import { Injectable, signal } from '@angular/core';
import { LOCAL_STORAGE_KEYS } from '../entities/constants';
import { trinket } from '../entities/entities';

@Injectable({
  providedIn: 'root'
})
export class LocalstoreService {
  // Last puzzle opened (pack number + index within the pack).
  currentPack = signal<number>(1);
  currentPuzzle = signal<number>(0);

  // Global ids of every puzzle solved at least once.
  solved = signal<number[]>([]);

  // gacha economy
  coins = signal<number>(0);
  ownedTrinkets = signal<string[]>([]);
  featuredTrinket = signal<trinket | null>(null);

  // monetization — local cache of the RevenueCat ad-free entitlement
  adFree = signal<boolean>(false);

  // UI theme — true = dark mode
  darkMode = signal<boolean>(false);

  // Dev override — when true, energy never limits play (bypasses the gate).
  energyOverride = signal<boolean>(false);

  constructor() {
    // Apply persisted theme immediately on boot to avoid a light flash.
    this.applyDarkMode(this.get(LOCAL_STORAGE_KEYS.DarkMode) === 'true');
  }

  set(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  get(key: string): any {
    return localStorage.getItem(key);
  }

  remove(key: string) {
    localStorage.removeItem(key);
  }

  removeMultiple(keys: string[]) {
    keys.forEach((k) => {
      this.remove(k);
    });
  }

  setPlayerInfo() {
    const current_pack: string = this.get(LOCAL_STORAGE_KEYS.CurrentPack);
    this.currentPack.set(current_pack ? +current_pack : 1);
    const current_puzzle: string = this.get(LOCAL_STORAGE_KEYS.CurrentPuzzle);
    this.currentPuzzle.set(current_puzzle ? +current_puzzle : 0);
    this.solved.set(this.parseArray<number>(this.get(LOCAL_STORAGE_KEYS.Solved)));
    const coins: string = this.get(LOCAL_STORAGE_KEYS.Coins);
    this.coins.set(coins ? +coins : 0);
    this.ownedTrinkets.set(this.parseArray<string>(this.get(LOCAL_STORAGE_KEYS.OwnedTrinkets)));
    const featured_trinket: string = this.get(LOCAL_STORAGE_KEYS.FeaturedTrinket);
    try {
      this.featuredTrinket.set(featured_trinket ? JSON.parse(featured_trinket) : null);
    } catch {
      this.featuredTrinket.set(null);
    }
    this.adFree.set(this.get(LOCAL_STORAGE_KEYS.AdFree) === 'true');
    this.energyOverride.set(this.get(LOCAL_STORAGE_KEYS.EnergyOverride) === 'true');
    this.applyDarkMode(this.get(LOCAL_STORAGE_KEYS.DarkMode) === 'true');
  }

  private parseArray<T>(raw: string | null): T[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // ── Progress ───────────────────────────────────────────────
  setCurrent(pack: number, index: number) {
    this.currentPack.set(pack);
    this.currentPuzzle.set(index);
    this.set(LOCAL_STORAGE_KEYS.CurrentPack, `${pack}`);
    this.set(LOCAL_STORAGE_KEYS.CurrentPuzzle, `${index}`);
  }

  isSolved(id: number): boolean {
    return this.solved().includes(id);
  }

  markSolved(id: number) {
    if (this.isSolved(id)) return;
    const next = [...this.solved(), id].sort((a, b) => a - b);
    this.solved.set(next);
    this.set(LOCAL_STORAGE_KEYS.Solved, JSON.stringify(next));
  }

  // ── Coins ──────────────────────────────────────────────────
  addCoins(n: number) {
    const next = this.coins() + n;
    this.coins.set(next);
    this.set(LOCAL_STORAGE_KEYS.Coins, `${next}`);
  }

  // Returns false (and changes nothing) when the player can't afford it.
  spendCoins(n: number): boolean {
    if (this.coins() < n) return false;
    const next = this.coins() - n;
    this.coins.set(next);
    this.set(LOCAL_STORAGE_KEYS.Coins, `${next}`);
    return true;
  }

  // ── Ad-free entitlement ────────────────────────────────────
  // Source of truth is RevenueCat; this mirrors it locally for fast UI gating
  // and offline access after a verified purchase/restore.
  setAdFree(value: boolean) {
    this.adFree.set(value);
    this.set(LOCAL_STORAGE_KEYS.AdFree, value ? 'true' : 'false');
  }

  // ── Theme (dark mode) ──────────────────────────────────────
  setDarkMode(value: boolean) {
    this.applyDarkMode(value);
    this.set(LOCAL_STORAGE_KEYS.DarkMode, value ? 'true' : 'false');
  }

  toggleDarkMode() {
    this.setDarkMode(!this.darkMode());
  }

  // ── Energy override (dev/testing) ──────────────────────────
  setEnergyOverride(value: boolean) {
    this.energyOverride.set(value);
    this.set(LOCAL_STORAGE_KEYS.EnergyOverride, value ? 'true' : 'false');
  }

  toggleEnergyOverride() {
    this.setEnergyOverride(!this.energyOverride());
  }

  // Mirror state to the signal and toggle the root `.dark` class the theme keys off.
  private applyDarkMode(value: boolean) {
    this.darkMode.set(value);
    document.documentElement.classList.toggle('dark', value);
  }

  // ── Trinkets ───────────────────────────────────────────────
  ownsTrinket(id: string): boolean {
    return this.ownedTrinkets().includes(id);
  }

  addTrinket(id: string) {
    if (this.ownedTrinkets().includes(id)) return;
    const next = [...this.ownedTrinkets(), id];
    this.ownedTrinkets.set(next);
    this.set(LOCAL_STORAGE_KEYS.OwnedTrinkets, JSON.stringify(next));
  }

  setFeaturedTrinket(t: trinket | null) {
    this.featuredTrinket.set(t);
    if (t) this.set(LOCAL_STORAGE_KEYS.FeaturedTrinket, JSON.stringify(t));
    else this.remove(LOCAL_STORAGE_KEYS.FeaturedTrinket);
  }
}
