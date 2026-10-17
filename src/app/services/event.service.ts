import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of } from 'rxjs';
import { event_config, EVENTS, LOCAL_STORAGE_KEYS } from '../entities/constants';
import { GameService } from './game.service';
import { LocalstoreService } from './localstore.service';

export interface event_progress {
  solved: number;
  total: number;
}

/**
 * Seasonal-event gating. Everything is driven off the device clock and the
 * month/day window in each `event_config`, so an event opens and closes by
 * itself every year — pulling the content down needs no app update.
 *
 * What survives the window closing: owned trinkets (never revoked) and solved
 * ids. What disappears: the home card, the event's pack screen, and its puzzles.
 */
@Injectable({
  providedIn: 'root'
})
export class EventService {
  private lstoreSvc = inject(LocalstoreService);
  private gameSvc = inject(GameService);

  events: event_config[] = EVENTS;

  liveEvents(now: Date = new Date()): event_config[] {
    return this.events.filter(e => this.isLive(e, now));
  }

  isLive(e: event_config, now: Date = new Date()): boolean {
    if (!this.hasDebuted(e, now)) return false;
    const stamp = (month: number, day: number) => month * 100 + day;
    const today = stamp(now.getMonth() + 1, now.getDate());
    const start = stamp(e.start.month, e.start.day);
    const end = stamp(e.end.month, e.end.day);
    // End is exclusive. A window that wraps the new year (start > end) is
    // live outside the [end, start) gap instead of inside it.
    return start <= end ? (today >= start && today < end) : (today >= start || today < end);
  }

  // True from the first start day of the event's first run onward, whether or
  // not the window is open right now.
  hasDebuted(e: event_config, now: Date = new Date()): boolean {
    return now >= new Date(e.startYear, e.start.month - 1, e.start.day);
  }

  // Event trinket sets stay hidden until their event first opens. Sets are
  // keyed by id prefix (`spooky_stitches-12` → `spooky_stitches`).
  isTrinketReleased(id: string, now: Date = new Date()): boolean {
    const set = id.split('-')[0];
    return !this.events.some(e => e.legendaryTrinketId.split('-')[0] === set && !this.hasDebuted(e, now));
  }

  // The event a pack belongs to, whether or not that event is live.
  eventForPack(pack: number): event_config | undefined {
    return this.events.find(e => e.packs.includes(pack));
  }

  // True when the pack is event content the player may not reach right now.
  isPackBlocked(pack: number, now: Date = new Date()): boolean {
    const e = this.eventForPack(pack);
    return !!e && !this.isLive(e, now);
  }

  // The event's palette as CSS custom properties for its card and header.
  paletteVars(e: event_config): Record<string, string> {
    const c = e.colors;
    return {
      '--event-face': c.face,
      '--event-face-dark': c.faceDark,
      '--event-ink': c.ink,
      '--event-accent': c.accent
    };
  }

  progress(e: event_config): Observable<event_progress> {
    if (e.packs.length === 0) return of({ solved: 0, total: 0 });
    return forkJoin(e.packs.map(p => this.gameSvc.getPack(p))).pipe(
      map(packs => {
        const ids = packs.flatMap(pd => pd?.puzzles.map(p => p.id) ?? []);
        return { solved: ids.filter(id => this.lstoreSvc.isSolved(id)).length, total: ids.length };
      })
    );
  }

  // Legendary event trinkets are earned, not rolled — they stay out of the
  // general gacha pool for as long as their event is live.
  lockedTrinketIds(now: Date = new Date()): string[] {
    return this.liveEvents(now).map(e => e.legendaryTrinketId);
  }

  hasAwarded(e: event_config): boolean {
    return this.awardedIds().includes(e.legendaryTrinketId);
  }

  /**
   * Grants the event's legendary trinket once every event puzzle is solved.
   * Emits the trinket id on the granting call only, so the caller knows when to
   * celebrate; null on every other call.
   */
  claimIfComplete(e: event_config): Observable<string | null> {
    if (this.hasAwarded(e)) return of(null);
    return this.progress(e).pipe(
      map(p => {
        if (p.total === 0 || p.solved < p.total || this.hasAwarded(e)) return null;
        this.lstoreSvc.addTrinket(e.legendaryTrinketId);
        this.lstoreSvc.set(LOCAL_STORAGE_KEYS.EventLegendaryAwarded,
          JSON.stringify([...this.awardedIds(), e.legendaryTrinketId]));
        return e.legendaryTrinketId;
      })
    );
  }

  // Ids already granted through event completion, kept apart from ownership so
  // a gacha duplicate after the event can't re-trigger the reward.
  private awardedIds(): string[] {
    const raw = this.lstoreSvc.get(LOCAL_STORAGE_KEYS.EventLegendaryAwarded);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
