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

---

## #4 — Trinkets: 12 sets × 12 in Threadily (yarn) style, emoji placeholders first

**144 trinkets.** Each set holds 12 with a fixed spread: 6 common / 3 rare / 2 epic / 1 legendary, and position 12 is the chase piece. The session writes all names, rarities, and placeholder emoji now. Brian generates the art later.

- [x] Write `TRINKETS.md` with every set's 12 entries in the same table format Trivily uses: `file | name | rarity | placeholder`. Starting set list (the session may refine names):

  | # | Set id | Theme | Placeholder emoji for set |
  |---|---|---|---|
  | 1 | `cozy_critters` | Pets & backyard animals | 🐱 |
  | 2 | `woodland_wanderers` | Forest animals | 🦊 |
  | 3 | `ocean_knits` | Sea creatures | 🐙 |
  | 4 | `dino_stitch` | Dinosaurs & prehistoric | 🦕 |
  | 5 | `sweet_skeins` | Desserts & sweets | 🧁 |
  | 6 | `garden_patch` | Fruits, veggies, flowers | 🌻 |
  | 7 | `cosmic_crochet` | Space, planets, astronauts | 🚀 |
  | 8 | `fable_folk` | Fairy-tale characters (originals, no Disney echoes) | 🧚 |
  | 9 | `myth_menagerie` | Mythical creatures | 🐉 |
  | 10 | `things_that_go` | Vehicles | 🚂 |
  | 11 | `world_wonders` | Landmarks around the world | 🗼 |
  | 12 | `music_makers` | Instruments & musicians | 🎸 |

- [x] Each trinket gets its own emoji placeholder (not just the set emoji).
- [x] Generator script (adapt Trivily's `generate-event-trinkets.mjs` / `slice_trinkets.py`):
  - emits placeholder SVG cards for every slot
  - writes `src/assets/trinkets/catalog.json` (`{ id, name, rarity, set, img }`)
  - swaps in the PNG when Brian drops art into `trinketart/<set>/`
  - safe to re-run on partial drops
- [x] Write `trinketart/ART_PROMPT.md` with the shared ChatGPT style template plus one subject line per trinket. Template:

  > A handmade crochet amigurumi plush in the style of the attached reference image, photographed as a cozy craft diorama. Everything is made of yarn and felt: visible crochet stitches and knit texture, soft fuzzy fibers, tiny embroidered details, safety-bead or stitched eyes, felt accents, a little stuffing roundness. Square 1:1, ~1200×1200, full-bleed scene: the plush sits on a small round crocheted coaster base with a soft knitted or felt backdrop behind it, warm studio lighting, soft shadows, gentle background blur. Cute rounded proportions, oversized head. **{SET THEME}** theme. Palette: {PALETTE}. No border, no text, no watermark, no name plate.
  >
  > Subject: **{ONE-LINE SUBJECT}**

- [x] Prompt rules:
  - one subject per image
  - keep the subject inside the middle ~80% (cards crop toward a circle)
  - original characters only
- [x] After the first art piece exists, use it as the attached style reference for every later piece (same as Trivily's `epic_figure_king_arthur.png` role).
- [x] Ship with placeholders. Art is not a release blocker. Commit.

**Session notes (#4):**
- Single source of truth: `trinketart/sets.json` (12 sets × 12, each item `[name, emoji, art subject]`, plus per-set theme, palette, and placeholder ground color).
- `node generate-trinkets.mjs [set…]` writes placeholder SVG cards (emoji on the set's soft ground inside a dashed "stitch" ring in the rarity color), swaps in PNGs dropped at `trinketart/<set>/<set>_NN.png`, keeps already-copied art when the drop folder is emptied, upserts `src/assets/trinkets/catalog.json` (144 items: 72 common / 36 rare / 24 epic / 12 legendary), and regenerates `TRINKETS.md` + `trinketart/ART_PROMPT.md`. Partial-drop behavior verified (new → kept → placeholder).
- Set names kept from the agenda list; Fable Folk is all originals / public-domain tale types (no Disney echoes).
- `slice_trinkets.py` (Trivily's 4×3 grid slicer) removed — Threadily art is one PNG per trinket.
- Collection screen renders the placeholders (checked in the browser).

---

## #5 — Puzzle data format + validator

- [x] Packs of 100 puzzles per file at `src/assets/puzzles/<n>.json`:
  ```jsonc
  {
    "pack": 1,
    "puzzles": [
      {
        "id": 1,
        "rating": 2,                           // 1–5 stars, authored (see #6)
        "title": "Lone Star & Friends",        // optional
        "categories": [
          { "name": "Texas", "tiles": ["Austin", "Alamo", "Big Bend", "Rangers"] },
          { "name": "Ohio",  "tiles": ["Columbus", "Cedar Point", "Cuyahoga", "Browns"] }
        ],
        "herrings": ["Austin"],                // optional: deliberate dual-meaning tiles
        "note": "Austin is also a first name", // optional: author note, never shown
        "warning": "MLB"                       // optional: rights-holder disclaimer
      }
    ]
  }
  ```
- [x] Authored order is the answer key. Tiles shuffle at runtime.
- [x] `validate-puzzles.mjs`:
  - schema check
  - unique tiles within a puzzle
  - unique puzzle ids
  - tiles-per-category consistent
  - no duplicate puzzles across packs
  - tile length ≤ `TILE_MAX_CHARS` (from #2)
  - categories ≤ `MAX_CATEGORIES`
  - `rating` present
- [x] Re-run after every content edit.

**Session notes (#5):**
- Format exactly as specified above; types in `src/app/entities/entities.ts` (`puzzle`, `category`, `pack_data`).
- Authoring is in `content/packNN.txt` (compact text DSL) and `node build-puzzles.mjs` compiles it to `src/assets/puzzles/<n>.json`, assigning ids from pack + position. `npm run puzzles` = build + validate.
- `validate-puzzles.mjs` reads `MAX_CATEGORIES`, `TILES_PER_CATEGORY`, `TILE_MAX_CHARS`, `PUZZLES_PER_PACK`, `MAX_PACK` straight from `constants.ts`. Checks: schema + unknown fields, rating 1–5, id range/order per pack, unique ids, 2–`MAX_CATEGORIES` categories, exactly `TILES_PER_CATEGORY` tiles each, tile length, stray whitespace, duplicate tiles and category names (case-insensitive), herrings must be real tiles, duplicate boards across packs, missing pack files. Prints rating mix, grid sizes, and the small-but-hard count against the #6 targets. Negative-tested (11 seeded errors all caught, exit 1).
- Pack 1 seeded with 12 puzzles; filled to 100 in #12.
- Fixed a real ambiguity in the #2 sample board: "Cobra" was in Yoga poses alongside a Snakes category → now "Lotus".

---

## #6 — Difficulty rating

All puzzles are open, so the rating tells players what they're getting into.

- [x] **Rating = authored 1–5 stars**, not derived purely from grid size. Rough guide:
  - **Size sets the floor:** 2×4 ≈ 1★, 3×4 ≈ 2★, 4×4 ≈ 3★, 5×4 ≈ 4★.
  - **Wordplay raises it:** each strong red herring or tight overlap adds stars.
  - **Small grids can be hard:** a 3×4 built on pure wordplay (homophones, hidden words, words with 3 meanings) can be 4–5★. Brian wants a real share of these.
- [x] Target mix across the 1,000: ~15% 1★, 25% 2★, 30% 3★, 20% 4★, 10% 5★. At least 100 puzzles must be "small grid, hard wordplay" (≤ 3×4 at ≥ 4★).
- [x] Ordering: pack 1 starts easy and ratings trend upward, but every pack mixes ratings so players always have choices.
- [x] UI:
  - stars on each puzzle in the pack select
  - a star filter / sort on pack select
  - "Continue" = next unsolved puzzle in order

**Session notes (#6):**
- Rating rubric, ambiguity rule, target mix, and ordering written up in `PUZZLES.md` (the #12 seed bank goes in the same file). The mix and the small-but-hard count are tracked by `validate-puzzles.mjs`; actually hitting the targets is #12's content work.
- Pack select (`pack/:pack`, `src/app/pack/`): numbered grid with stars, grid size, and solved state (sage fill + stitched ring + check badge); star filter chips (All / 1★–5★, remembered under `bsd.thr.pack_star_filter`); sort chip cycles In order → Easiest first → Hardest first.
- "Continue" = `GameService.nextUnsolved()`: first unsolved puzzle in authored order across packs, loading packs lazily and stopping at the first hit. `nextAfter()` powers "Next puzzle" (#7). Both unit-tested.
- Home hero now shows "Continue · #N" + a Pack button (full home layout in #11).

---

## #8 — Energy (port from Trivily, retune)

- [x] Port `EnergyService` + spec. Constants:
  - `ENERGY_MAX = 120`
  - `ENERGY_PER_GAME = 10`
  - `ENERGY_REFILL_INTERVAL_MS = 6 min`
  - `AD_ENERGY_GRANT = 5`
- [x] Replace the rolling-hour cap with **`AD_ENERGY_MAX_PER_DAY = 5`**. Reset at local midnight; store `{date, count}` under `bsd.thr.energy_ad_*`.
- [x] Remove the energy-continue path.
- [x] Header meter. Out-of-energy modal shows a countdown plus "Watch ad +5 (N/5 left today)".
- [x] Tests: the daily cap, the midnight reset, and offline refill. Commit.

**Session notes (#8):**
- `EnergyService` (ported from Trivily): `ENERGY_MAX = 120`, `ENERGY_PER_GAME = 10`, 1 point / 6 min, `AD_ENERGY_GRANT = 5`.
- Rolling-hour cap replaced by `AD_ENERGY_MAX_PER_DAY = 5`, stored as `{date, count}` under `bsd.thr.energy_ad_daily` with a **local** `YYYY-MM-DD` date. `adsWatchedToday` is computed off the 1-second ticker, so the cap lifts at local midnight even while the app stays open.
- Energy-continue path and its constants removed (#1).
- New `adsLeftToday()` and `timeToAfford(cost)`. Home header meter shows energy + countdown + an ad button with "N/5" left today. The out-of-energy alert (when starting a puzzle) shows "Enough refills in M:SS" and "Watch ad +5 (N/5 left today)", hidden once today's ads are used.
- Tests: daily cap, ads-left countdown, persistence shape, reset after a stored "yesterday", rollover while open across midnight, override bypass, time-to-afford, plus the ported offline-refill / clamp / countdown tests.

---

## #7 — Game loop (full build on top of the #2 prototype)

- [x] Tap tile → tap category to place. Tap a placed tile to return it.
- [x] Lock In is enabled only when the category is full.
- [x] Correct: color-fill lock + small celebration.
- [x] Wrong: −1 heart + shake; tiles return to the pool.
- [x] **One away:** when exactly 1 tile is wrong, show a "One away…" toast (still costs the heart).
- [x] Remember wrong combinations already tried, so locking in the same set again shows "Already guessed" and costs no heart (NYT behavior).
- [x] All locked → win screen (coins, "Next puzzle") → interstitial check.
- [x] 0 hearts → modal:
  - **Watch ad: +3 hearts** (board kept, no cap)
  - **Give up** (energy already spent)
- [x] Hint button (coins): auto-place one correct tile.
- [x] Unit tests:
  - lock-in correctness
  - one-away detection
  - duplicate-guess detection
  - heart decrement
  - ad refill
  - hint placement
  - win detection
  - shuffle
- [x] Play it end to end in the browser. Commit.

**Session notes (#7):**
- Built on the #2 board. Start: `paramMap` subscription (so "Next puzzle" works whether Ionic reuses the page or makes a new one — the first version double-charged energy; caught in the browser playthrough and fixed), charge `ENERGY_PER_GAME`, set the Continue pointer, interstitial check, deal a shuffled board.
- Correct lock: row fills with its yarn tone + stitched border, pop animation, three sparkles; the active row hops to the next open category. Wrong: −1 heart + shake, tiles back to the pool. One away toast; "Already guessed" for a repeated wrong set (keyed by category + sorted tiles) costs nothing.
- Win: 🧶 card with mistakes count, coins (+25 first clear / +1 replay), "Next puzzle" (crosses into the next pack) and "Pack N". The interstitial check runs as the next puzzle starts, never over the win card.
- 0 hearts: "Out of hearts" card — **Watch ad · +3 hearts** (board kept, no cap; an unfinished ad grants nothing) or **Give up** (back to the pack; energy already spent). Input is frozen while the card is up.
- Hint (💡 25¢ in the header): confirm alert, then auto-places one correct tile and pins it (double border, can't be removed). Not enough coins → a toast with the cost and balance.
- Trademark ⓘ disclaimer in the header when a puzzle has `warning`.
- Pack 0 (layout-test boards) is free practice: no energy, coins, or progress.
- Unit tests: board rules (lock-in, one-away, duplicate guess, heart decrement, ad refill, hint placement + bounce, win, shuffle) in `board.spec.ts`; component flows in `game.component.spec.ts` (energy charge/block, place/unplace, win coins, replay coins, out-of-hearts → ad, failed ad, already-guessed, hint spend/cancel/insufficient, next puzzle, practice).
- Browser playthrough at 360×640 (Playwright): solved #1 (+25, solved [1]); #2 wrong → one-away (toast) → repeat (no heart) → 3rd miss → out-of-hearts → ad (+3) → hint (−25, 1 pinned) → solved; replay #1 (+1); reload → coins 26, energy 90, Continue · #3. No console errors.

---

## #9 — Ads, Remove Ads, and marketing site

The code is identical to Trivily (AdMob + RevenueCat, `ad_free` entitlement, interstitial caps), so port `AdService` + `PurchaseService`. Wire two rewarded flows: **+3 hearts** and **+5 energy**. Ad-free behaves exactly as it does in Trivily.

- [x] Write **`MONETIZATION_INSTRUCTIONS.md`** for Threadily: a fresh step-by-step copy of Trivily's, with every id swapped to `com.bigsimple.threadily`.
  1. **AdMob:**
     - register the Threadily app on iOS + Android
     - create the ad units (interstitial, rewarded-hearts, rewarded-energy, or one shared rewarded unit as Trivily does)
     - say exactly where to paste each id in `constants.ts`
  2. **Store IAP:** the "Remove Ads" non-consumable in App Store Connect and Play Console (product id, price tier, review screenshot).
  3. **RevenueCat:**
     - new project + both apps
     - API keys
     - `ad_free` entitlement
     - attach products
     - offering / package
     - where to paste the keys
  4. **Small Business Program** for both stores (check whether existing enrollment already covers the new app).
  5. **app-ads.txt:** `bigsimple.dev/app-ads.txt` already has `google.com, pub-5241648641136523, DIRECT, f08c47fec0942fa0`. Same AdMob account, so no new line is needed. Steps: verify it in AdMob for the new app, and set the store listing "Website" to `bigsimple.dev`.
  6. **Final release checklist:** live ids in, test ids out, test devices removed.
- [x] Add a **Marketing site updates** section to the same doc. Repo: `apex_apps/bigsimplesite/bigsimpledev`.
  - `games/threadily/privacy.html`: copy `games/trivily/privacy.html` and swap name / app id / data practices.
  - `images/games/threadily/threadily-icon.png`: drop the app icon.
  - `index.html` games section:
    - add a Threadily game card (copy the Trivily card around line 964)
    - add a `.logo-threadily` style (around line 928)
    - App Store link (fill in once the Apple id exists)
    - Google Play link `https://play.google.com/store/apps/details?id=com.bigsimple.threadily`
    - Privacy link
  - `index.html` footer link list (around line 1049): add "Threadily · Privacy".
  - `legal.html`:
    - add Threadily to the meta description and the intro paragraph (lines 6 and 116)
    - add the privacy link (around line 140)
  - `sitemap.xml`: add `https://bigsimple.dev/games/threadily/privacy`.
  - Deploy with the site's `deploy.sh` / Vercel, then check that the URLs resolve.
  - Store listings: set the privacy policy URL to `https://bigsimple.dev/games/threadily/privacy` in both consoles.
- [x] The session may make the site edits itself in that repo and commit there, but only once Brian confirms. Store links stay `TODO` until the apps exist.

**Session notes (#9):**
- `AdService` + `PurchaseService` ported unchanged in behavior (ad-free skips interstitials only; rewarded stays for everyone). Rewarded flows wired: **+3 hearts** (game, no cap) and **+5 energy** (home button + out-of-energy prompt, 5/day).
- Pre-setup safety: Google **test** ad units in `ad.service.ts`, Google **sample** AdMob app id in the Android manifest, and `TODO_…` RevenueCat keys that keep RevenueCat unconfigured, so nothing hits Trivily's AdMob units or RevenueCat project.
- `MONETIZATION_INSTRUCTIONS.md` written: AdMob (2 apps, 1 interstitial + 1 shared rewarded unit each), the `threadily_remove_ads` IAP on both stores, RevenueCat (`ad_free` / `remove_ads`), Small Business Program (account-level, so likely already covered), app-ads.txt (no new line), the marketing-site steps, a release checklist, and a value-location table.
- **Site edits not made** (needs Brian's go-ahead — see "#9b" in agenda.md). A ready privacy page is drafted at `site-drafts/games/threadily/privacy.html`.

---

## #10 — Coins, gacha, collection (port)

- [x] Port `GachaService`, the collection screen, and the featured trinket on home.
- [x] Economy:
  - first clear 25
  - replay 5%
  - roll 50 + multi-roll
  - dupe refund 5
  - dupe chance 35%
  - rarity 78 / 14 / 6 / 2
- [x] Hint cost **25 coins** (`HINT_COST`). Retune after playtest. Commit.

**Session notes (#10):**
- `GachaService` ported (weighted rarity, 35% intentional-dupe chance, otherwise prefers unowned, multi-roll stops when coins run out). Its event-legendary lock is a stub until #14.
- Economy constants all in `constants.ts` and matching the spec: `COINS_FIRST_CLEAR = 25`, `REPLAY_COIN_MULTIPLIER = 0.05` (→ 1 coin), `ROLL_COST = 50`, `ROLL_MULTIPLIERS = [1,2,3,5,10]`, `DUPLICATE_REFUND = 5`, `DUPLICATE_ROLL_CHANCE = 0.35`, rarity 78/14/6/2, `HINT_COST = 25`.
- Collection screen: cells are now square (Threadily art is 1:1), and the Roll button is explicitly primary (inside an `ion-toolbar` it was inheriting the toolbar's dark color).
- Featured trinket: set from the collection's inspect card; home shows it in a dashed gold "stitch" ring (#11).
- Browser check: 5× roll from 260¢ → 5 reveals, dupes redeemed, featured trinket persisted and shown on home.

---

## #11 — Screens

- [x] **Home:**
  - "Continue" hero (next unsolved puzzle)
  - pack cards with progress
  - energy, coins, featured trinket
  - event row (empty until #14)
- [x] **Pack select:** a numbered grid with star rating and cleared state, plus a star filter.
- [x] **Game** (#7) and **Win** screens.
- [x] **Collection:** port from Trivily.
- [x] **Settings:**
  - dark mode
  - restore purchases
  - remove ads
  - how to play
  - privacy link
- [x] **First-launch tutorial** on puzzle 1: place → lock in → one away → hearts.
- [x] Palette: keep the family indigo `#4F3AF4` as primary. Category-lock fill colors (yarn tones) are the session's call: coral, mustard, sage, sky, and plum, one per category slot up to 5.
- [x] 360px width check: no horizontal scroll. Commit.

**Session notes (#11):**
- **Home:** logo + wordmark; coins chip (→ trinkets) and settings gear; energy row with value/120, "+1 in M:SS", a gold meter, and "▶ +5 · N/5" ad button; featured trinket; Continue hero (pack · #, title, stars, grid size, Play ⚡10, Pack N); all-solved card; Trinkets row (owned / 144); pack cards with progress bar and per-rating counts. Event row comes with #14.
- **Pack select** (#6), **Game + Win** (#7), **Collection** (#10).
- **Settings** (`/settings`): dark mode switch, How to play (modal; shares copy with the tutorial via `entities/how-to.ts`, plus "Replay the tutorial"), Remove ads (price from RevenueCat; shows "Ads removed" when ad-free), Restore purchases, Privacy policy (`bigsimple.dev/games/threadily/privacy`), and **Board size test** (the #2 practice boards, for Brian's #2b phone check).
- **First-launch tutorial** on pack 1 #1: a card under the pool. Steps 1 (place) and 2 (lock in) advance on the real action; 3 (one away) and 4 (hearts, ads, hint) on Next / Got it. Skip anytime; winning also marks it seen (`bsd.thr.tutorial_seen`). Unit-tested and played in the browser.
- **Palette:** family indigo `#4F3AF4` primary. Category yarn tones in slot order: coral `#E9765B`, mustard `#D9A21F`, sage `#6FA07B`, sky `#4F9BD1`, plum `#9A62B3`. Solved-puzzle sage fill reuses the stitched ring.
- **Fix:** component-level `html.dark …` selectors never matched under view encapsulation; now `:host-context(.dark)`.
- **360px check:** home, settings, pack, collection, tutorial board, and 4×4 board, in light and dark — no horizontal overflow, no console errors.

---

## #12 — Content: 1,000 puzzles

- [x] Write `PUZZLES.md` seed bank: categories by domain (geography, sports, food, music, movies, science, nature, words-that-are-also-X, homophones, hidden words…), with dual-meaning tile candidates noted.
- [x] Author 10 packs of 100 following #6 (rating mix, 100+ small-but-hard puzzles). Run the validator after every pack. Commit per pack.
- [x] Content rules:
  - no full copyrighted lyrics
  - every tile has exactly **one** correct category (herrings plausible, never truly ambiguous)
  - facts current (team relocations, renamed places)
  - `warning` on brand-heavy puzzles
- [x] Ambiguity review pass on every herring.
- [x] Play 10 puzzles per star level in the browser to check the rating feel.

**Session notes (#12):**
- 10 packs × 100 = 1,000 puzzles in `content/pack01–10.txt`. Final mix exactly on target: 1★ 150 · 2★ 250 · 3★ 300 · 4★ 200 · 5★ 100. Small-but-hard (≤3 categories at ≥4★): 119. Grids: 2×4 215 · 3×4 421 · 4×4 294 · 5×4 70.
- Duplicate sweep: packs 9–10 had repeated many category sets from earlier packs (written after a context reset). A tile-overlap check across all 12,876 tiles found them; 97 puzzles were rewritten with new themes at the same rating and size. About 35 overlaps remain where one category shares 3 tiles with an older puzzle (for example, two different "Farm animals" lists). These are left as acceptable.
- Herring review: every herring (~500) was checked against its puzzle's other categories. Fixed real ambiguities, for example Hardy (also a poet), Arc light, Compass (also a drawing tool), Gondola (also a ski lift), Ciao (hello and bye), Radio (fire and police), and Pumpkin (a fruit).
- Brand-heavy puzzles carry `warning=` (car makers, consoles, toy makers, verbs from brands).
- Playtest: `rateplay.mjs` (Playwright, 390px mobile) played 10 puzzles per star level. Each run did one deliberate wrong lock-in using a herring where one exists: the heart dropped and the tiles went back to the pool. Then it did a full solve: 50/50 won, no console errors. Dense 5×4 boards with 12-character tiles were checked at 360px and fit; long tiles shrink their font.
- Fixed the sloppy "Sounds like a number" seed line in PUZZLES.md.

---

## #13 — Release config

- [x] Run `npx cap add android` and `npx cap add ios`. Verify `com.bigsimple.threadily` in Gradle and in Xcode. Display name `Threadily`.
- [x] Store listing title **`Threadily: Word Groups`**.
- [x] Store assets: screenshots (phone + tablet), feature graphic, short and full description (keywords: word groups, word puzzle, categories, sort, brain teaser — no "Connections").
- [x] Data safety / App Privacy forms (AdMob device identifiers). Privacy URL from #9.
- [x] Portrait lock + status bar (Trivily bootstrap). Release checklist from `MONETIZATION_INSTRUCTIONS.md`. Commit and tag.

**Session notes (#13):**
- `npx cap add ios` ran on Windows. Capacitor 8 uses Swift Package Manager, so there's no CocoaPods and no `pod install` on the Mac. The bundle id is `com.bigsimple.threadily` in both Gradle and `project.pbxproj`, and the display name is `Threadily` on both platforms.
- iOS `Info.plist`: iPhone is portrait only (iPad keeps all four orientations, which iPad multitasking needs). Added `NSUserTrackingUsageDescription`, `SKAdNetworkItems`, and `GADApplicationIdentifier`. That last one is **Google's sample id with a TODO** until Brian creates the iOS AdMob app.
- ATT: Capacitor 8's template is scene-based, so `applicationDidBecomeActive` never fires. Trivily's native ATT request was ported into `SceneDelegate.sceneDidBecomeActive` instead. **Not compiled yet (no Mac here). Brian: build once in Xcode.**
- iOS icon and light/dark splash generated with `@capacitor/assets`.
- Portrait lock and status bar were already in `app.component.ts` from the Trivily bootstrap.
- `STORE_LISTING.md`: title, subtitle, short and full description, keywords (length-checked, no "Connections"), content-rating answers, Play data safety and App Store App Privacy tables, export compliance, and release steps.
- Screenshots: `store-screenshots.mjs` → `resources/store/{play-phone,play-tablet,ios-6.9,ios-ipad-13}/` with 7 shots each. They use the brand-free "Find the Thread" puzzle; the first pick showed MLB/NBA team names. **No trinket-album shot yet:** the art is still placeholder SVGs. Reshoot after the ChatGPT art lands.
- Tablet fix found while shooting: on iPad the phone-sized board left about 60% of the screen empty. A `(min-width: 700px) and (min-height: 900px)` breakpoint now scales tiles (6.4vh), type, and the header. Checked: a 5×4 board fits at 800×1280 and 1032×1376. Phones are unchanged.
- Release checklist in `MONETIZATION_INSTRUCTIONS.md` updated (SPM, STORE_LISTING step). Tagged **`v1.0.0-rc1`**. The final `v1.0.0` tag should go on the commit that swaps in the real AdMob and RevenueCat ids.
