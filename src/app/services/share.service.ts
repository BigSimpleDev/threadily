import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { ToastController } from '@ionic/angular/standalone';
import { SHARE_URL, STARTING_HEARTS } from '../entities/constants';

// One Lock In outcome. Free "Already guessed" resubmits are never recorded.
export type attempt = 'hit' | 'oneAway' | 'miss';

// What a finished board shares. Deliberately holds no tile or category text,
// so a share can never spoil the puzzle.
export interface share_result {
  status: 'won' | 'lost';
  attempts: attempt[];
  heartsLeft: number;
  hints: number;
  adContinues: number;
}

const SQUARE: Record<attempt, string> = { hit: '🟩', oneAway: '🟨', miss: '🟥' };

export function dailyShareHeader(day: number): string {
  return `Threadily Daily #${day} 🧵`;
}

export function puzzleShareHeader(id: number, rating: number): string {
  return `Threadily #${id} ${'★'.repeat(rating)}`;
}

// The spoiler-free result card. Same layout as Trivily / Decryptly:
// header, one square per attempt, hearts (or misses) + extras, link.
export function buildShareText(header: string, r: share_result): string {
  const misses = r.attempts.filter(a => a !== 'hit').length;
  const hearts = Math.max(0, Math.min(STARTING_HEARTS, r.heartsLeft));
  let line = r.status === 'won'
    ? '❤️'.repeat(hearts) + '🖤'.repeat(STARTING_HEARTS - hearts)
    : `✖ ${misses} miss${misses === 1 ? '' : 'es'}`;
  if (r.hints > 0) line += ` · 💡${r.hints}`;
  if (r.adContinues > 0) line += ` · +❤️${r.adContinues > 1 ? '×' + r.adContinues : ''}`;
  return [header, r.attempts.map(a => SQUARE[a]).join(''), line, SHARE_URL].join('\n');
}

@Injectable({ providedIn: 'root' })
export class ShareService {
  private toastCtrl = inject(ToastController);

  // Native share sheet on device; the Web Share API where the browser has it;
  // otherwise the clipboard plus a "Copied!" toast.
  async shareText(text: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({ text });
      } catch { /* user dismissed the sheet */ }
      return;
    }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text });
        return;
      } catch (e) {
        // Dismissing the sheet is not a failure; anything else falls back.
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    const copied = await this.copy(text);
    const t = await this.toastCtrl.create({
      message: copied ? 'Copied!' : 'Couldn\'t copy — try again.',
      duration: 1400, position: 'middle', cssClass: 'thr-toast'
    });
    await t.present();
  }

  private async copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Older WebViews / insecure origins: the legacy selection copy.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }
}
