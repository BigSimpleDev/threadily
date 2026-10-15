# Agenda

Open work items for **Threadily**. When an item ships, move it to `agenda_completed.md` with its original prompt.
Work top to bottom — items are ordered by dependency.

---

## Session rules

Sessions working from this agenda are allowed to:

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
- For on-phone checks, build and install with `debug_android_wireless.ps1` / `.sh` (ported from Trivily), then ask Brian to look at it on his phone.
- **Before marking an item done:** run `npm run build`, `npm test`, and `npm run lint`, and play through the affected flow.

Brian runs these outside the session; the session gives him step-by-step instructions instead:
- store-console setup (Play Console, App Store Connect, AdMob, RevenueCat)
- account / credential work
- art generation in ChatGPT

---

## App identity

| Field | Value |
|---|---|
| App name (home screen / `appName`) | `Threadily` |
| Store listing name | `Threadily: Word Groups` (App Store + Google Play) |
| Package / bundle id (`appId`) | `com.bigsimple.threadily` |
| localStorage key prefix | `bsd.thr.*` (Trivily uses `bsd.trv.*`, Decryptly `bsd.dcy.*`) |
| CSS prefix for new classes | `thr-` (keep inherited `dly-` / `trv-` classes where they already exist) |
| Marketing / privacy | `bigsimple.dev/games/threadily/privacy`, plus a game card on `bigsimple.dev` (see #9) |
| Stack | Ionic 8 + latest Angular (Trivily is on 22), standalone components, Signals, zoneless, `@if/@for/@switch`, Capacitor 8 for iOS/Android. Fully client-side, no backend. |
| Source to port from | `../trivily` (closest sibling: energy, events, trinkets). `../decodergame/decryptly` for anything Trivily dropped. |
| Marketing site repo | `C:\Users\bhine\source\repos\apex_apps\bigsimplesite\bigsimpledev` |

**Naming rule:** never use the word "Connections" in the store title, subtitle, or in-app copy (NYT trademark). "Word Groups", "group puzzle", and "find the thread" are fine.

---

## Game spec (locked)

- **Puzzle:** the player gets **X tiles** and **Y named categories** and sorts every tile into its category.
  Example: 4 categories (Texas, Ohio, Florida, Arizona), 16 tiles (cities, landmarks, parks, teams…).
- **Categories are shown up front.** The challenge is **wordplay**: tiles with a dual meaning that look like they fit more than one category.
- **Lock in:** the player fills a category's slots and taps **Lock In**.
  - **Correct:** the category locks and its tiles freeze.
  - **Wrong:** −1 heart and the tiles return to the pool.
  - **"One away" feedback** (like NYT): when exactly one tile is wrong, show a "One away…" toast. It still costs the heart.
- **Hearts:** 3 per attempt. At 0 the puzzle fails.
  - **Refill only by rewarded ad:** 1 ad = **+3 hearts**, board state kept.
  - **No energy-for-hearts continue** (differs from Trivily).
  - No cap on heart ads per attempt.
- **Energy:**
  - `ENERGY_MAX = 120`
  - `ENERGY_PER_GAME = 10` (12 puzzles banked)
  - Passive refill **1 energy / 6 min** (10/hour, Trivily rate)
  - Rewarded ad = **+5 energy**, capped at **5 ads per day** (resets at local midnight)
- **Hint (coin sink):** auto-places one correct tile into its category.
- **All puzzles unlocked from the start.** Every puzzle shows a **difficulty rating** (see #6).
- **1,000+ puzzles.**
- **Coins, gacha, and trinkets** carry over from Trivily.
- **Trinket art style: Threadily style.** Crochet / amigurumi / felt plush with visible stitches and yarn texture. Decryptly = emoji, Trivily = claymation, Threadily = yarn.

---

## #2b — Brian: phone check of the 5×4 board

The browser test passed (notes in `agenda_completed.md` #2); this needs Brian's hands.

- [ ] Brian: on the phone, turn on Wireless debugging → **Pair device with pairing code**, then on the PC run `adb pair <ip>:<pairPort> <code>`.
- [ ] Brian: run `DEVICE_IP=<ip> PORT=<connectPort> ./debug_android_wireless.sh` (or the `.ps1`) from the repo root. It builds, installs, and launches Threadily.
- [ ] Brian: on home, scroll to **Layout test (#2)** and play both 5×4 boards (Road Trip, Double Duty). Check: no scrolling, tiles readable, Lock In easy to hit, one-away toast visible.
- [ ] Confirm or change the provisional answers (5×4 max, 12-char tiles, 14px / 11.5px font, pool shrinks, rows don't collapse).

## #9 — Ads, Remove Ads, and marketing site

The code is identical to Trivily (AdMob + RevenueCat, `ad_free` entitlement, interstitial caps), so port `AdService` + `PurchaseService`. Wire two rewarded flows: **+3 hearts** and **+5 energy**. Ad-free behaves exactly as it does in Trivily.

- [ ] Write **`MONETIZATION_INSTRUCTIONS.md`** for Threadily: a fresh step-by-step copy of Trivily's, with every id swapped to `com.bigsimple.threadily`.
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
- [ ] Add a **Marketing site updates** section to the same doc. Repo: `apex_apps/bigsimplesite/bigsimpledev`.
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
- [ ] The session may make the site edits itself in that repo and commit there, but only once Brian confirms. Store links stay `TODO` until the apps exist.

## #10 — Coins, gacha, collection (port)

- [ ] Port `GachaService`, the collection screen, and the featured trinket on home.
- [ ] Economy:
  - first clear 25
  - replay 5%
  - roll 50 + multi-roll
  - dupe refund 5
  - dupe chance 35%
  - rarity 78 / 14 / 6 / 2
- [ ] Hint cost **25 coins** (`HINT_COST`). Retune after playtest. Commit.

## #11 — Screens

- [ ] **Home:**
  - "Continue" hero (next unsolved puzzle)
  - pack cards with progress
  - energy, coins, featured trinket
  - event row (empty until #14)
- [ ] **Pack select:** a numbered grid with star rating and cleared state, plus a star filter.
- [ ] **Game** (#7) and **Win** screens.
- [ ] **Collection:** port from Trivily.
- [ ] **Settings:**
  - dark mode
  - restore purchases
  - remove ads
  - how to play
  - privacy link
- [ ] **First-launch tutorial** on puzzle 1: place → lock in → one away → hearts.
- [ ] Palette: keep the family indigo `#4F3AF4` as primary. Category-lock fill colors (yarn tones) are the session's call: coral, mustard, sage, sky, and plum, one per category slot up to 5.
- [ ] 360px width check: no horizontal scroll. Commit.

## #12 — Content: 1,000 puzzles

- [ ] Write `PUZZLES.md` seed bank: categories by domain (geography, sports, food, music, movies, science, nature, words-that-are-also-X, homophones, hidden words…), with dual-meaning tile candidates noted.
- [ ] Author 10 packs of 100 following #6 (rating mix, 100+ small-but-hard puzzles). Run the validator after every pack. Commit per pack.
- [ ] Content rules:
  - no full copyrighted lyrics
  - every tile has exactly **one** correct category (herrings plausible, never truly ambiguous)
  - facts current (team relocations, renamed places)
  - `warning` on brand-heavy puzzles
- [ ] Ambiguity review pass on every herring.
- [ ] Play 10 puzzles per star level in the browser to check the rating feel.

## #13 — Release config

- [ ] Run `npx cap add android` and `npx cap add ios`. Verify `com.bigsimple.threadily` in Gradle and in Xcode. Display name `Threadily`.
- [ ] Store listing title **`Threadily: Word Groups`**.
- [ ] Store assets: screenshots (phone + tablet), feature graphic, short and full description (keywords: word groups, word puzzle, categories, sort, brain teaser — no "Connections").
- [ ] Data safety / App Privacy forms (AdMob device identifiers). Privacy URL from #9.
- [ ] Portrait lock + status bar (Trivily bootstrap). Release checklist from `MONETIZATION_INSTRUCTIONS.md`. Commit and tag.

## #14 — Seasonal events (post-launch)

- [ ] Port `EVENTS` / `EventService` / `EventComponent` from Trivily:
  - month/day window, no app update to remove
  - legendary withheld from the gacha while live
  - `ENERGY_PER_EVENT_GAME`
- [ ] Event puzzles live in pack files numbered above the main range.
- [ ] Each event gets a 12-trinket yarn-style set.
- [ ] Candidates: Halloween, Thanksgiving, and Christmas.

---

## Decisions log

| Topic | Decision |
|---|---|
| Trinket style | Threadily yarn style: crochet / amigurumi / felt |
| Trinket count | 12 sets × 12 = 144, emoji placeholders first |
| One-away feedback | Yes, NYT-style |
| Passive energy refill | 1 / 6 min |
| Hint | Auto-place one correct tile, 25 coins |
| Unlocks | All puzzles open from the start |
| Difficulty | Authored 1–5★: size sets the floor, wordplay raises it; 100+ small-but-hard puzzles |
| Heart ads | +3 hearts per ad, no cap |
| Grid max | **5×4** (provisional: fits 360×640 in the browser; Brian to confirm on phone, #2b). Tiles ≤ 12 chars |
| Logo | Brian generates in ChatGPT with the #3 prompt; session builds the SVG |
| Ads / IAP | Same as Trivily / Decryptly. Step-by-step + site marketing doc in #9 |
| Session permissions | Commit, or commit + push; run and play the app |
