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

## #9b — Brian: store/console setup + OK the site edits

- [ ] Brian: follow `MONETIZATION_INSTRUCTIONS.md` Parts 1–4 (AdMob, IAP, RevenueCat, Small Business check) and paste the ids where it says.
- [ ] Brian: say "go" on the bigsimple.dev edits (Part 5). A session then copies `site-drafts/games/threadily/privacy.html`, adds the game card, footer, legal, and sitemap entries, and commits in the site repo. Brian deploys.

---

## #15 — Daily puzzle + share results

**Goal:** organic growth. Everyone gets the same puzzle each day; a one-tap spoiler-free result card gets shared to group chats and socials. Same design in Trivily (#8) and Decryptly (#8): keep the share format and streak rules consistent across the three.

### Daily puzzle

- [x] **`DailyService`** (`src/app/services/daily.service.ts`).
  - `dayNumber()` = whole days since `DAILY_EPOCH` (new const in `constants.ts`, set to the day this ships = Daily #1).
  - Compute from the **local** calendar date: build `Date.UTC(y, m, d)` from local Y/M/D, so DST never skips or repeats a day. New puzzle at local midnight, like Wordle.
- [x] **Schedule file** `src/assets/daily/schedule.json`: an array of puzzle ids; index `dayNumber - 1` is that day's puzzle.
  - Generated by a new `scripts/build-daily.mjs` (add an `npm run daily` script). Fixed-seed shuffle of main-pack ids only. **Never event packs** (> `MAX_PACK`).
  - **Append-only:** the script keeps existing entries and only appends, so past dailies never change. Cover at least 3 years (1,095 days).
  - Difficulty ramp by weekday: Mon/Tue 1–2★, Wed/Thu 3★, Fri–Sun 4–5★. Fall back to any rating when a bucket runs dry.
  - Past the end of the file: wrap with modulo and `console.warn`.
- [x] **Rules.**
  - Daily is **free**: no energy cost.
  - Normal hearts. Hints are allowed. A rewarded-ad heart refill is allowed, but it is recorded and shows in the share.
  - Solving the daily also marks that puzzle id solved and pays normal coins plus `DAILY_BONUS_COINS`.
- [x] **Persisted state** (`LOCAL_STORAGE_KEYS`, `bsd.thr.daily*`):
  - Per-day result `{ day, status: 'won' | 'lost', attempts: ('hit' | 'oneAway' | 'miss')[], heartsLeft, hints, adContinues }`. Keep the last 60 days.
  - `streakCurrent`, `streakBest`, `lastDailyWon`.
- [x] **Streak.**
  - Win today when `lastDailyWon` is yesterday → +1. Otherwise it resets to 1.
  - A loss, or a missed day, resets it to 0. Missing a day is computed lazily on boot.
  - Milestone coins at 3 / 7 / 30 / 100 days (`DAILY_STREAK_REWARDS` in constants).
- [x] **Home: Daily card** at the top of home, above Continue. It shows:
  - `Daily #N`
  - 🔥 streak
  - the state: **Play**, or ✓ with a **Share** button plus a countdown to the next puzzle
- [x] **Route `daily`**: reuses `GameComponent` in daily mode, with no new board code. After the daily is finished, opening it again shows the result screen, not a replay.

### Share

- [x] Add `@capacitor/share` (`npm i @capacitor/share && npx cap sync`).
- [x] **`ShareService.shareText(text)`**:
  - **Native:** `Share.share({ text })`.
  - **Web:** `navigator.share` if present. Otherwise copy to the clipboard and show a "Copied!" toast.
- [x] **Format.** No tile words or category names: zero spoilers. One square per Lock In attempt: 🟩 correct, 🟨 one away, 🟥 wrong. Free "Already guessed" resubmits are not recorded.
  ```
  Threadily Daily #42 🧵
  🟩🟨🟩🟥🟩
  ❤️❤️🖤 · 💡1
  bigsimple.dev/games/threadily
  ```
  - Lost → the hearts line reads `✖ 3 misses`.
  - An ad continue appends ` · +❤️`.
  - Text only. Image share cards are a later item.
- [x] The win screen of **normal** puzzles also gets a Share button. Same format, header `Threadily #<id> ★★★` (the authored rating).
- [ ] Link target: `bigsimple.dev/games/threadily`. That landing page is being added on the site side (store badges + device redirect). Until it exists, the link 404s, so don't ship to stores before the site is live.

### Daily reminder (optional sub-step)

- [ ] `@capacitor/local-notifications`, **opt-in**.
  - Ask permission only after the player's **first daily win**: "Remind me tomorrow?"
  - Settings toggle and reminder time (default 9:00 local). One repeating notification: "Today's Threadily is ready 🧵". Cancel it when toggled off.
  - iOS: no extra entitlement. Android 13+: `POST_NOTIFICATIONS` runtime permission.

### Status (2026-11-07)

- Shipped in code: daily, schedule (1,095 days from `DAILY_EPOCH` 2026-11-07), share, home card. **Before release:** set `DAILY_EPOCH` to launch day, delete `src/assets/daily/schedule.json`, run `npm run daily`.
- Open: daily reminder (optional) and the site landing page.

### Done when

- [x] Unit tests:
  - `dayNumber()` across a DST boundary and at midnight
  - streak transitions (win/win, win/skip/win, loss)
  - share text for won, lost, hint and ad-continue cases
  - the schedule script stays append-only (re-running it does not change existing indexes)
- [x] Play it in the browser:
  - Play the daily. Fake the clock forward a day (override `Date` in devtools) and check that the streak increments, then skip a day and check that it resets.
  - Share copies the right text.
  - The Home card states are all correct.
- [x] `npm run build`, `npm test`, `npm run lint` pass. One commit per sub-section.

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
| Grid max | **5×4**, confirmed on Brian's phone (#2b). Tiles ≤ 12 chars |
| Logo | Brian generates in ChatGPT with the #3 prompt; session builds the SVG |
| Ads / IAP | Same as Trivily / Decryptly. Step-by-step + site marketing doc in #9 |
| Session permissions | Commit, or commit + push; run and play the app |
