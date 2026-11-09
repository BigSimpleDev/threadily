import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForward } from 'ionicons/icons';
import { pack_summary } from '../services/game.service';

/** One pack row (badge, solved bar, rating mix). Shared by home and the packs list. */
@Component({
  selector: 'app-pack-card',
  standalone: true,
  imports: [IonIcon],
  host: { class: 'thr-pack-card', role: 'button', tabindex: '0' },
  template: `
    <span class="thr-pack-badge">{{ pack().pack }}</span>
    <span class="thr-pack-body">
      <span class="thr-pack-line">
        <span class="thr-pack-name">Pack {{ pack().pack }}</span>
        <span class="thr-pack-count">
          @if (done()) {<span class="thr-pack-done">✓</span>}
          {{ pack().solved }} / {{ pack().total }}
        </span>
      </span>
      <span class="thr-pack-bar"><span class="thr-pack-fill" [style.width.%]="pct()"></span></span>
      <span class="thr-pack-mix">
        @for (s of stars; track s) {
          @if (pack().byRating[s]) {<span class="thr-mix-chip">{{ s }}★ {{ pack().byRating[s] }}</span>}
        }
      </span>
    </span>
    <ion-icon name="chevron-forward" class="thr-pack-chev"></ion-icon>
  `,
  styles: `
    :host {
      display: flex; align-items: center; gap: 12px;
      width: 100%; margin: 0 0 10px; padding: 12px 14px; box-sizing: border-box;
      border-radius: 16px; border: 1px solid var(--ion-border-color);
      background: var(--ion-card-background); color: var(--ion-text-color);
      box-shadow: var(--dly-shadow-card);
      text-align: left; cursor: pointer;
    }
    .thr-pack-badge {
      flex: 0 0 42px; height: 42px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      background: var(--dly-primary-tint); color: var(--ion-color-primary);
      font-size: 18px; font-weight: 900;
      box-shadow: inset 0 0 0 2px var(--dly-primary-tint), inset 0 0 0 3px rgba(79, 58, 244, 0.35);
    }
    :host-context(.dark) .thr-pack-badge { color: #B3A9FF; }
    .thr-pack-body { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
    .thr-pack-line { display: flex; justify-content: space-between; align-items: baseline; }
    .thr-pack-name { font-size: 16px; font-weight: 900; }
    .thr-pack-count { font-size: 12px; font-weight: 800; color: var(--ion-color-medium); }
    .thr-pack-done { color: #6FA07B; font-weight: 900; margin-right: 2px; }
    .thr-pack-bar { height: 5px; border-radius: 3px; overflow: hidden; background: var(--ion-color-light-shade); }
    .thr-pack-fill { display: block; height: 100%; background: #6FA07B; border-radius: 3px; }
    .thr-pack-mix { display: flex; flex-wrap: wrap; gap: 4px; }
    .thr-mix-chip {
      font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 999px;
      background: var(--ion-color-light); color: var(--ion-color-medium);
    }
    .thr-pack-chev { color: var(--ion-color-medium); font-size: 18px; }
  `
})
export class PackCardComponent {
  pack = input.required<pack_summary>();

  readonly stars = [1, 2, 3, 4, 5];

  constructor() {
    addIcons({ chevronForward });
  }

  done(): boolean {
    return this.pack().total > 0 && this.pack().solved >= this.pack().total;
  }

  pct(): number {
    const { solved, total } = this.pack();
    return total ? Math.round((solved / total) * 100) : 0;
  }
}
