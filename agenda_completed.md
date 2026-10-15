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

---

## #3 — Logo & app icon

Brand family: **indigo rounded-square base, white heavy rounded sans glyph, gold / orange four-point sparkles.**
- Trivily = indigo gradient square + white "?" + gold and orange sparkles + faint hexagons.
- Decryptly = dark navy ground + two stacked indigo tiles + white "D" + "17".
- Threadily should read as the third sibling.

- [x] Brian generates the icon in ChatGPT with this prompt. Attach `../trivily/resources/icon.png` and `../decodergame/decryptly/resources/icon.png` as style references.

  > Create a 1024×1024 mobile app icon for a word-grouping puzzle game called "Threadily". It must match the attached two icons from the same app family exactly in style: flat vector, crisp geometric shapes, no 3D, no photo texture, no drop shadows except very subtle ones, bold and readable at small sizes.
  >
  > Background: full-bleed square in vibrant indigo with a very subtle diagonal gradient (#5B45F7 top-left to #4F3AF4 bottom-right). Do not draw rounded corners or a border; the OS applies the mask.
  >
  > Subject: a 2×2 grid of four rounded-square tiles, centered, filling about 60% of the canvas, with small even gaps. The top-left tile is solid white with a bold, heavy, rounded sans-serif capital "T" in indigo (#4F3AF4), in the same font weight as the white "?" and "D" in the references. The other three tiles are lighter translucent indigo (#7B6BFF at ~60% opacity).
  >
  > A single golden-yellow thread (#F5BE2E) weaves through all four tiles in a running stitch: it dips under and over each tile, so dashed stitch segments show on the tiles. It ends in a small silver sewing needle poking out at the upper right.
  >
  > Accents: one gold four-point sparkle (#F5BE2E) at the upper right and one smaller orange four-point sparkle (#F25C2E) at the lower left, the same shapes as in the Trivily reference. Optionally add two faint, low-opacity rounded tiles in the background, like Trivily's faint hexagons.
  >
  > No other text, no letters besides the single "T", no watermark.

- [x] A second ChatGPT prompt (same style) for the **Play feature graphic**, 1024×500:
  - the same tile + thread motif on the left
  - the wordmark "Threadily" in white heavy rounded sans on the right
  - a small subtitle "Word Groups"
  - indigo background
- [x] Session: trace or hand-build `src/assets/threadily-logo.svg` in the same SVG style as `trivily-logo.svg` / `decryptly-logo.svg` (256×256 viewBox, `#4F3AF4`, Nunito/Archivo 800–900, `#F5BE2E` sparkle) for the splash and header.
- [x] Drop `resources/icon.png` + `resources/feature-graphic.png`, then run `npx @capacitor/assets generate`.
- [x] Swap Trivily branding on the splash and home header. Commit.

**Session notes (#3):**
- `src/assets/threadily-logo.svg`: 256×256, indigo `#4F3AF4` rounded square, 2×2 tiles (white "T" tile + three translucent), gold running-stitch thread to a silver needle, gold + orange sparkles. The "T" is drawn as shapes, not text, so it renders identically inside `<img>` without web fonts.
- `resources/icon.png` resized 1254 → 1024. `npx @capacitor/assets generate --android --pwa` ran (74 Android + 7 PWA assets; indigo adaptive background, dark splash `#141320`). **iOS assets run in #13** after `npx cap add ios`. Favicon regenerated from the icon. `sharp` install script approved in `package.json` `allowScripts` so asset generation works.
- ⚠️ **Brian's ChatGPT feature graphic says "Find the connections."** That breaks the naming rule (no "Connections" in store copy), and it is 1794×876, not 1024×500. Kept as `resources/feature-graphic-chatgpt-original.png` for reference only. `resources/feature-graphic.png` is now a compliant 1024×500 render of `resources/src/feature-graphic.svg` (logo left; "Threadily" / "Word Groups" / "Find the thread. Sort every word." right, in Nunito). Brian can regenerate a ChatGPT version without the word "connections" if he prefers that style.
- Splash: keeps the bigSIMPLE Games studio wordmark; the Trivily hexagon background is now a grid of rounded word tiles. Home header uses the Threadily logo + "Thread**ily**" wordmark. `trivily-logo.svg` deleted.
- Added `.gitattributes` (`eol=lf`) so the repo stays LF.
