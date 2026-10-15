# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

**Threadily** (store title **Threadily: Word Groups**) — a word-grouping puzzle.
Each puzzle shows **Y named categories** up front and a pool of **X tiles**; the
player sorts every tile into its category. The challenge is wordplay: tiles with
a dual meaning that look like they fit more than one category.

- **Lock In.** The player fills a category's slots and taps Lock In. Correct →
  the category locks and its tiles freeze. Wrong → −1 heart, tiles return to the
  pool. Exactly one wrong tile → a "One away…" toast (still costs the heart).
  Re-submitting an already-tried wrong set says "Already guessed" and is free.
- **3 hearts** per attempt. At 0 the player can watch a rewarded ad for **+3
  hearts** (board kept, no cap) or give up. There is no energy-for-hearts continue.
- **Energy** gates starting a puzzle and refills over real time.
- **Coins** are earned by solving puzzles and spent on hints (auto-place one
  correct tile) and gacha rolls for **trinkets** (yarn/amigurumi collectibles).
- **All puzzles are open from the start.** Each shows an authored 1–5★ rating.

**Naming rule:** never use the word "Connections" in the store title, subtitle,
or in-app copy (NYT trademark). "Word Groups", "group puzzle", and "find the
thread" are fine.

This codebase was ported from **Trivily** (`../trivily`), itself ported from
**Decryptly** (`../decodergame/decryptly`). They share architecture, service
layout, economy shape, and the `dly-` / `trv-` CSS prefixes, so changes often
port between them — but they are separate products and deliberately diverge.

## Commands

```bash
npm start        # dev server at localhost:8100 (ionic serve)
npm run build    # production build
npm test         # Karma/Jasmine unit tests (single headless run)
npm run lint     # ESLint (flat config in eslint.config.js)
npm run puzzles  # compile content/packNN.txt → src/assets/puzzles/<n>.json, then validate
npm run trinkets # rebuild trinket placeholders/catalog/docs from trinketart/sets.json
```

## Architecture

**Stack**: Ionic 8 + Angular 22, standalone components, Signals for state,
**zoneless** change detection, Capacitor 8 for iOS/Android. No backend — fully
client-side. (Unit tests still load zone.js so `fakeAsync` works.)

**Identity**: `appId` `com.bigsimple.threadily`, `appName` `Threadily`,
localStorage prefix `bsd.thr.*` (see `LOCAL_STORAGE_KEYS`).

**Routes** (`src/app/routes.ts`):
- `''` — home (`HomeComponent`)
- `pack/:pack` — pack select (numbered grid, stars, filter)
- `play/:pack/:index` — the board (`GameComponent`)
- `collection` — trinket album + gacha rolling
- `settings` — dark mode, purchases, how to play, privacy

**Vocabulary**:
- **pack** = one JSON file of 100 puzzles (`src/assets/puzzles/<n>.json`)
- **puzzle** = one board; **category** = a named group; **tile** = one word
- **index** = a puzzle's position within its pack (route param); **id** = its
  global id (pack n holds ids `(n-1)*100+1 .. n*100`). Progress is a flat list of
  solved ids.

**Game data** (`src/assets/puzzles/<n>.json`):
```jsonc
{
  "pack": 1,
  "puzzles": [
    {
      "id": 1,
      "rating": 2,                           // 1–5 stars, authored
      "title": "Lone Star & Friends",        // optional
      "categories": [
        { "name": "Texas", "tiles": ["Austin", "Alamo", "Big Bend", "Rangers"] }
      ],
      "herrings": ["Austin"],                // optional: deliberate dual-meaning tiles
      "note": "Austin is also a first name", // optional: author note, never shown
      "warning": "MLB"                       // optional: rights-holder disclaimer
    }
  ]
}
```
Authored order is the answer key; tiles shuffle at runtime.

**Authoring**: never hand-edit the JSON. Puzzles are written in `content/packNN.txt`
(format documented at the top of `build-puzzles.mjs`: an `@ <rating> | title` line,
one `Category: tile, tile, tile, tile` line per category, optional `~ herrings`),
then `npm run puzzles` compiles and validates. Ids come from pack + position.
Every tile must belong to exactly one category of its puzzle — a herring may
*look* like another category but must never genuinely be a member of it.

**Key services** (`src/app/services/`):
- `GameService` — fetches + caches pack JSON, exposes the current pack.
- `LocalstoreService` — `localStorage` wrapper with signals mirroring persisted
  state (solved ids, coins, trinkets, current pointer, settings).
- `EnergyService` — client-clock energy: accrues on a ticker, applies offline
  refill on boot, spends per puzzle start, daily-capped rewarded-ad top-ups.
- `GachaService` — weighted-rarity trinket rolls with duplicate protection.
- `AdService` / `PurchaseService` — AdMob + RevenueCat; native no-ops on web
  (`showRewarded()` resolves true on web so reward flows are testable).

**Adding content**: add `content/packNN.txt`, raise `MAX_PACK` in
`src/app/entities/constants.ts`, then run `npm run puzzles`.

## Tuning

Nearly every gameplay number lives in `src/app/entities/constants.ts`: hearts,
grid limits (`MAX_CATEGORIES`, `TILE_MAX_CHARS`), coin economy, hint cost, gacha
roll cost and rarity weights, energy costs/refill rate/ad caps, and interstitial
frequency caps. Change values there rather than at the call sites.

## Trinkets

**Threadily style: crochet / amigurumi / felt plush** with visible stitches and
yarn texture (Decryptly = emoji, Trivily = claymation, Threadily = yarn).
12 sets × 12 = 144. Every set holds a fixed 6 common / 3 rare / 2 epic /
1 legendary spread; position 12 is the chase piece.
`src/assets/trinkets/catalog.json` is the manifest of `{ id, name, rarity, set, img }`.
See `TRINKETS.md` and `trinketart/ART_PROMPT.md`; regenerate with
`node generate-trinkets.mjs` after dropping art into `trinketart/<set>/`.

## Conventions

- Standalone components only, no NgModules; Signals for component state.
- Angular control flow (`@if` / `@for` / `@switch`) in templates.
- CSS class prefixes: `thr-` for new Threadily classes; inherited `dly-` / `trv-`
  classes stay where they already exist. Match the surrounding file.
- Comments explain *why*, not *what* — match the existing density.
- Line endings are LF.

## Session rules

Sessions working from `agenda.md` are allowed to:

- **Commit, or commit and push**, to this repo without asking each time.
  - Use one commit per finished agenda item, or per logical sub-step.
  - Never force-push.
  - Never skip hooks.
- **Run the app and play it to test.** Drive the web build in a browser (`npm start`, then Playwright or Claude in Chrome) and actually play puzzles:
  - place tiles
  - lock in right and wrong guesses
  - lose hearts
  - win
  - check that coins and progress persist
- For on-phone checks, build and install with `debug_android_wireless.ps1` / `.sh`, then ask Brian to look at it on his phone.
- **Before marking an item done:** run `npm run build`, `npm test`, and `npm run lint`, and play through the affected flow.

Brian runs these outside the session; the session gives him step-by-step instructions instead:
- store-console setup (Play Console, App Store Connect, AdMob, RevenueCat)
- account / credential work
- art generation in ChatGPT

Finished agenda items move from `agenda.md` to `agenda_completed.md`.
