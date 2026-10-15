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
