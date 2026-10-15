import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { rarity, trinket } from '../entities/entities';
import { LocalstoreService } from './localstore.service';
import { ROLL_COST, DUPLICATE_REFUND, RARITY_WEIGHTS, DUPLICATE_ROLL_CHANCE } from '../entities/constants';

export interface rollResult {
  trinket: trinket;
  duplicate: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GachaService {
  private httpClient = inject(HttpClient);
  private lstoreSvc = inject(LocalstoreService);

  catalog = signal<trinket[]>([]);

  constructor() { }

  loadCatalog(): Observable<trinket[]> {
    return this.httpClient.get<trinket[]>('assets/trinkets/catalog.json').pipe(
      map((items) => {
        this.catalog.set(items ?? []);
        return this.catalog();
      })
    );
  }

  // Weighted-random pick: first choose a rarity by weight, then a uniformly
  // random trinket of that rarity. Prefers trinkets the player doesn't own yet
  // (dupe protection) so rolls stop being "wasted" as the collection fills up;
  // only falls back to the full tier (then the full catalog) once every item
  // in that tier, or the whole catalog, is already owned.
  roll(): trinket {
    const items = this.rollableCatalog();
    const chosenRarity = this.rollRarity(items);
    const pool = items.filter(t => t.rarity === chosenRarity);
    const unownedPool = pool.filter(t => !this.lstoreSvc.ownsTrinket(t.id));
    const allowDuplicate = Math.random() < DUPLICATE_ROLL_CHANCE;
    let from = (unownedPool.length > 0 && !allowDuplicate) ? unownedPool : pool;
    if (from.length === 0) {
      const unownedAny = items.filter(t => !this.lstoreSvc.ownsTrinket(t.id));
      from = unownedAny.length > 0 ? unownedAny : items;
    }
    return from[Math.floor(Math.random() * from.length)];
  }

  // Catalog minus anything withheld from the general roll. Seasonal events
  // (post-launch, #14) will withhold their legendary here while live.
  rollableCatalog(): trinket[] {
    return this.catalog();
  }

  private rollRarity(items: trinket[]): rarity {
    const present = (Object.keys(RARITY_WEIGHTS) as rarity[])
      .filter(r => items.some(t => t.rarity === r));
    const total = present.reduce((sum, r) => sum + RARITY_WEIGHTS[r], 0);
    let pick = Math.random() * total;
    for (const r of present) {
      pick -= RARITY_WEIGHTS[r];
      if (pick <= 0) return r;
    }
    return present[present.length - 1] ?? 'common';
  }

  // Spends coins, rolls, and awards the trinket. On a duplicate the player keeps
  // nothing automatically — they must redeem it via redeemDuplicate().
  // Returns null if the player can't afford the roll or the catalog is empty.
  rollAndAward(): rollResult | null {
    if (this.rollableCatalog().length === 0) return null;
    if (!this.lstoreSvc.spendCoins(ROLL_COST)) return null;

    const trinket = this.roll();
    const duplicate = this.lstoreSvc.ownsTrinket(trinket.id);
    if (!duplicate) {
      this.lstoreSvc.addTrinket(trinket.id);
    }
    return { trinket, duplicate };
  }

  // Multi-roll: performs up to `count` independent single rolls in one batch,
  // awarding each before the next so a freshly-pulled new item is marked owned
  // and the unowned-preference stops it repeating within the batch. Stops early
  // when coins run out. Returns one result per successful roll.
  rollBatch(count: number): rollResult[] {
    const results: rollResult[] = [];
    for (let i = 0; i < count; i++) {
      const r = this.rollAndAward();
      if (!r) break;
      results.push(r);
    }
    return results;
  }

  // Grants the duplicate refund. Caller invokes this only when the player taps
  // the redeem button on a duplicate reveal.
  redeemDuplicate(): number {
    this.lstoreSvc.addCoins(DUPLICATE_REFUND);
    return DUPLICATE_REFUND;
  }
}
