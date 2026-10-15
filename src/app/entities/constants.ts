export enum LOCAL_STORAGE_KEYS {
    // Last puzzle opened — drives the "Continue" hero on home.
    CurrentPack = 'bsd.thr.current_pack',
    CurrentPuzzle = 'bsd.thr.current_puzzle',
    // Ids of every puzzle the player has solved at least once.
    Solved = 'bsd.thr.solved',
    Coins = 'bsd.thr.coins',
    OwnedTrinkets = 'bsd.thr.trinkets',
    AdFree = 'bsd.thr.ad_free',
    LastInterstitial = 'bsd.thr.last_interstitial',
    DarkMode = 'bsd.thr.dark_mode',
    Energy = 'bsd.thr.energy',
    EnergyTs = 'bsd.thr.energy_ts',
    EnergyOverride = 'bsd.thr.energy_override',
    EnergyAdDaily = 'bsd.thr.energy_ad_daily',
    FeaturedTrinket = 'bsd.thr.featured_trinket',
    EventLegendaryAwarded = 'bsd.thr.event_legendary_awarded',
    ExpandedSets = 'bsd.thr.expanded_sets',
    TutorialSeen = 'bsd.thr.tutorial_seen',
    PackStarFilter = 'bsd.thr.pack_star_filter'
}

// Highest main pack file that exists under src/assets/puzzles. Packs hold
// PUZZLES_PER_PACK puzzles each; puzzle ids are global (pack n holds ids
// (n-1)*100+1 .. n*100) so progress is one flat list of solved ids.
export const MAX_PACK = 10;
export const PUZZLES_PER_PACK = 100;

// ── Seasonal events ─────────────────────────────────
// Event packs live ABOVE MAX_PACK so the main menus, which only ever enumerate
// 1..MAX_PACK, never surface them. They are reachable only through the event
// screen, and only while the window is open.
//
// The window is month/day (no year), so the event opens and closes on its own
// every year off the device clock — taking the content down needs no app update.
export interface event_config {
    id: string;
    name: string;
    emoji: string;
    // One line for the home card and the event's pack screen.
    blurb: string;
    // Pack numbers (JSON files under src/assets/puzzles) belonging to the event.
    packs: number[];
    // Inclusive first day the event is visible.
    start: { month: number; day: number };
    // Exclusive — on this day the event and all its puzzles are hidden again.
    // An end before the start wraps the new year.
    end: { month: number; day: number };
    // Awarded for solving every event puzzle; blocked from the general gacha
    // roll while the event is live, and rollable like any other item after.
    legendaryTrinketId: string;
    colors: event_colors;
}

// Event card palette: a gradient face with readable ink and an accent for the
// progress bar and button. Plain hex — no color-mix() on older WebViews.
export interface event_colors {
    face: string;
    faceDark: string;
    ink: string;
    accent: string;
}

export const EVENT_COLORS = {
    halloween: { face: '#7C3AED', faceDark: '#3B1A6E', ink: '#FFFFFF', accent: '#F97316' },
    thanksgiving: { face: '#B45309', faceDark: '#7C2D12', ink: '#FFFFFF', accent: '#FACC15' },
    christmas: { face: '#15803D', faceDark: '#14532D', ink: '#FFFFFF', accent: '#EF4444' }
} satisfies Record<string, event_colors>;

export const HALLOWEEN_EVENT: event_config = {
    id: 'halloween',
    name: 'Halloween',
    emoji: '🎃',
    blurb: 'Spooky word groups for spooky season.',
    packs: [101],
    start: { month: 10, day: 1 },   // Oct 1
    end: { month: 11, day: 1 },     // Nov 1 — puzzles hidden, trinkets kept
    legendaryTrinketId: 'spooky_stitches-12',
    colors: EVENT_COLORS.halloween
};

export const THANKSGIVING_EVENT: event_config = {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    emoji: '🦃',
    blurb: 'A harvest table full of word groups.',
    packs: [102],
    start: { month: 11, day: 1 },   // Nov 1, the day Halloween closes
    end: { month: 12, day: 1 },     // Dec 1
    legendaryTrinketId: 'harvest_knits-12',
    colors: EVENT_COLORS.thanksgiving
};

export const CHRISTMAS_EVENT: event_config = {
    id: 'christmas',
    name: 'Christmas',
    emoji: '🎄',
    blurb: 'Unwrap a stocking full of word groups.',
    packs: [103],
    start: { month: 12, day: 1 },   // Dec 1
    end: { month: 1, day: 1 },      // Jan 1 (wraps the new year)
    legendaryTrinketId: 'winter_woolens-12',
    colors: EVENT_COLORS.christmas
};

// Every configured event. Add future events here; the rest of the app reads
// this list, so nothing else needs to change.
export const EVENTS: event_config[] = [HALLOWEEN_EVENT, THANKSGIVING_EVENT, CHRISTMAS_EVENT];

// ── Puzzle loop ──────────────────────────────────────────────
export const STARTING_HEARTS = 3;        // wrong lock-in costs one heart
export const AD_HEARTS_GRANT = 3;        // rewarded ad refills this many; no cap per attempt
// Largest grid the board supports and the longest tile label, set from the #2
// phone-fit test. The puzzle validator enforces both.
export const MAX_CATEGORIES = 5;
export const TILES_PER_CATEGORY = 4;
export const TILE_MAX_CHARS = 12;

// ── Coin economy ─────────────────────────────────────────────
// A first clear pays COINS_FIRST_CLEAR; replaying a solved puzzle pays
// REPLAY_COIN_MULTIPLIER of that (min 1).
export const COINS_FIRST_CLEAR = 25;
export const REPLAY_COIN_MULTIPLIER = 0.05;

// ── Hints ────────────────────────────────────────────────────
// A hint auto-places one correct tile into its category.
export const HINT_COST = 25;

// ── Gacha (Trinkets) ─────────────────────────────────────────
export const ROLL_COST = 50;
// Multi-roll options: spend ROLL_COST * n in one purchase for n rolls.
export const ROLL_MULTIPLIERS = [1, 2, 3, 5, 10];
export const DUPLICATE_REFUND = 5;
// Chance a roll is intentionally drawn from already-owned trinkets so duplicates
// stay frequent (players redeem them for coins). The other ~65% prefer unowned
// items so collections still progress.
export const DUPLICATE_ROLL_CHANCE = 0.35;

// ── Energy ───────────────────────────────────────────────────
// Energy gates starting a puzzle. It refills over real time and can be topped
// up with a rewarded ad. Client-clock based (single-player, no leaderboard).
export const ENERGY_PER_GAME = 10;          // cost to start one puzzle
// Seasonal-event puzzles are cheaper so a limited-time event doesn't drain the bar.
export const ENERGY_PER_EVENT_GAME = 8;
export const ENERGY_MAX = 120;              // stored ceiling (12 puzzles banked)
export const ENERGY_REFILL_INTERVAL_MS = 6 * 60 * 1000; // 1 energy/6min → 10/hour
export const AD_ENERGY_GRANT = 5;           // rewarded ad grants this much energy
export const AD_ENERGY_MAX_PER_DAY = 5;     // rewarded-ad energy grants per local calendar day

// ── Ads / monetization ───────────────────────────────────────
// Interstitials are frequency-capped to avoid fatigue + AdMob policy strikes:
// shown at a puzzle start, only after at least this many starts AND this many
// seconds since the last one. Rewarded ads (hearts, energy) are always opt-in.
export const INTERSTITIAL_MIN_LEVELS = 2;
export const INTERSTITIAL_MIN_SECONDS = 90;

// RevenueCat entitlement id that grants the ad-free experience.
export const ENTITLEMENT_AD_FREE = 'ad_free';

import { rarity } from './entities';

// Relative weights per rarity for a weighted-random roll.
export const RARITY_WEIGHTS: Record<rarity, number> = {
    common: 78,
    rare: 14,
    epic: 6,
    legendary: 2
};
