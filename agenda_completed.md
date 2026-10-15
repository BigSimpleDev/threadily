# Agenda — completed

Finished items moved from `agenda.md`, with their original prompts.

---

## #1 — Scaffold from Trivily

- [x] Copy `../trivily` into this repo. Exclude:
  - `node_modules`, `www`, `.git`, `android`, `ios`
  - Trivily theme JSON
  - Trivily trinket art + catalog, event art, `trinketart/`, `*art/` drop folders
- [x] `capacitor.config.ts`: `appId: 'com.bigsimple.threadily'`, `appName: 'Threadily'`.
- [x] `package.json`: `name: "threadily"`. Update Angular to the latest stable (`ng update @angular/core @angular/cli`) and confirm Ionic 8 / Capacitor 8 compatibility.
- [x] Swap every `LOCAL_STORAGE_KEYS` value to `bsd.thr.*`.
- [x] Strip trivia-only code:
  - question shuffle in `GameService.buildPlayable()`
  - the "remove 2 answers" hint
  - `ANSWERS_PER_QUESTION`, `QUESTIONS_PER_THEME`
  - the trivia `GameComponent` template
  - energy-continue constants
- [x] Remove the unused `folder/` scaffolding.
- [x] Keep these: `bump-version-android.sh`, `bump-version-ios.sh`, `debug_android_wireless.*`, `patches/`, the eslint config, and the Playwright devDependency.
- [x] Add `.gitignore` (node_modules, www, .angular, platform build outputs).
- [x] Write `CLAUDE.md` for Threadily, modeled on Trivily's (what the app is, commands, architecture, vocabulary, tuning, trinkets, conventions). Copy the **Session rules** above into it.
- [x] Create an empty `agenda_completed.md`.
- [x] Verify build / test / lint pass on the empty shell. Commit.

**Session notes (#1):**
- Angular 22.2.3 / CLI 22.2.2 (latest stable), Ionic 8.8.19 (Ionic 9 exists; stayed on 8 per spec), Capacitor 8.5.3. Lockfile regenerated.
- App is now **zoneless** (`provideZonelessChangeDetection()`); unit tests still load zone.js for `fakeAsync`.
- `npm test` now runs single-pass headless (`--watch=false --browsers=ChromeHeadless`).
- Removed trivia `group/`, `completed/`, `level/game`, unused `extensions.ts`, `common.service.ts`, `shapes.svg`.
- Event service/component removed for now; they get re-ported in #14 (gacha's event lock is a stub until then).
- `generate-event-trinkets.mjs` not copied; #4 adapts it from `../trivily` into `generate-trinkets.mjs`.
- Line endings normalized to LF.

---

## #2 — Board layout prototype (5×4 phone test) — do early

Find out what fits on a phone before writing 1,000 puzzles around a grid size.

- [x] Build a throwaway-quality but real `GameComponent` board with hardcoded sample puzzles at **2×4, 3×4, 4×4, and 5×4** (categories × tiles). Include at least two real 5×4 designs with long-ish tiles ("San Antonio", "Yellowstone").
- [x] Layout:
  - category rows (name + 4 slots) on top
  - shuffled tile pool below
  - hearts
  - Lock In
- [x] Interaction: tap-to-place (more reliable than drag on small phones).
- [x] Test at 360×640, 390×844, and 430×932 in the browser. Then install on Brian's phone via `debug_android_wireless` and have him try the 5×4.
- [x] Decide with Brian (record the answer here):
  - Does 5×4 fit without scrolling?
  - Max tile text length?
  - Font size?
  - Does the tile pool shrink as categories lock?
- [x] Set `MAX_CATEGORIES` and `TILE_MAX_CHARS` in `constants.ts` from the result.

**Session notes (#2) — provisional answers, pending Brian's phone check (see "#2b" in agenda.md):**
- **Does 5×4 fit without scrolling?** Yes in the browser at 360×640, 390×844, and 430×932 (measured: content scrollHeight == clientHeight at all three). Tile height scales `clamp(31px, 5.1vh, 46px)`.
- **Max tile text length:** 12 characters (`TILE_MAX_CHARS = 12`). "Jacksonville", "Downward Dog", "Grand Canyon" fit at 360px wide; "Downward Dog" wraps to two lines.
- **Font size:** tiles 14px / 800 weight; tiles over 9 characters drop to 11.5px.
- **Does the pool shrink?** Yes: the pool only shows unplaced tiles, so it shrinks as tiles are placed; locked rows stay in place (they fill with their yarn tone and a stitched border) rather than collapsing, so the board never jumps.
- `MAX_CATEGORIES = 5`, `TILES_PER_CATEGORY = 4`, `TILE_MAX_CHARS = 12` in `constants.ts`.
- Interaction shipped: tap tile → tap row, **or** tap a row to make it active → tap tiles to drop them straight in. Tap a placed tile to send it back. Lock In is a pill on the row header that appears only when the row is full.
- Board rules live in `src/app/game/board.ts` as pure functions (place / unplace / lockIn / hint / addHearts / isWon) with `board.spec.ts`.
- Layout-test boards: `src/app/game/samples.ts`, reachable from home → "Layout test (#2)" (route `play/0/<n>`).
- Bug fixed along the way: Ionic 8.8's `core.css` redefines `--ion-color-primary` on `:root`, and `global.scss` (which imports it) loaded *after* `variables.scss`, so the app rendered Ionic blue instead of indigo. `angular.json` now loads `variables.scss` last. **Trivily has the same style order and likely shows Ionic blue too.**
- Android platform added early (needed for the phone test): Gradle 9.5 / AGP 9.3.1 copied from Trivily, AdMob sample app id in the manifest, `AD_ID` permission. `assembleDebug` succeeds. AdService now uses Google's test ad units and PurchaseService stays unconfigured until real RevenueCat keys exist (#9).
