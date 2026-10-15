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
- [ ] Brian: open **Settings → Board size test** (starts on the first 5×4; "Next puzzle" goes to the second) and play both 5×4 boards (Road Trip, Double Duty). Check: no scrolling, tiles readable, Lock In easy to hit, one-away toast visible.
- [ ] Confirm or change the provisional answers (5×4 max, 12-char tiles, 14px / 11.5px font, pool shrinks, rows don't collapse).

## #9b — Brian: store/console setup + OK the site edits

- [ ] Brian: follow `MONETIZATION_INSTRUCTIONS.md` Parts 1–4 (AdMob, IAP, RevenueCat, Small Business check) and paste the ids where it says.
- [ ] Brian: say "go" on the bigsimple.dev edits (Part 5). A session then copies `site-drafts/games/threadily/privacy.html`, adds the game card, footer, legal, and sitemap entries, and commits in the site repo. Brian deploys.

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
