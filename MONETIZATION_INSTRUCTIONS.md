# Threadily — Monetization Setup Instructions

This guide covers everything Brian does **outside the code** to turn on real ads and the "Remove Ads" purchase, enroll in the reduced-fee Small Business Programs, and publish the Threadily pages on bigsimple.dev.

The app code already has the wiring. What's left is creating accounts and ids and pasting them into a few files. Every place you edit has an obvious placeholder.

> **Threadily ad usage recap.** One **interstitial** unit is shown as a puzzle starts: never on the first puzzle of a session, then at most every 2 puzzle starts and at least 90 seconds apart. It is skipped for ad-free buyers. One **rewarded** unit is reused for **two** opt-in rewards: **+3 hearts** (when you run out mid-puzzle; no cap) and **+5 energy** (capped at 5 per day). Ad-free removes only the interstitials. The rewarded options stay for everyone.

**Ids used everywhere below**

| Thing | Value |
|---|---|
| Android package / iOS bundle id | `com.bigsimple.threadily` |
| App name | `Threadily` |
| Store listing name | `Threadily: Word Groups` |
| IAP product id (both stores) | `threadily_remove_ads` |
| RevenueCat entitlement | `ad_free` |
| RevenueCat package | `remove_ads` |
| AdMob publisher | `pub-5241648641136523` (same account as Decryptly / Trivily) |

**Current state of the code (pre-setup)**

- `ad.service.ts` uses **Google's public test ad units**.
- `AndroidManifest.xml` uses **Google's sample AdMob app id** (`ca-app-pub-3940256099942544~3347511713`).
- `purchase.service.ts` has `TODO_…` RevenueCat keys. While they're placeholders, RevenueCat is never configured, so Remove Ads and Restore fail softly instead of hitting the wrong project.

---

## Overview — what you're setting up

| Thing | Provider | Why | Fee |
|---|---|---|---|
| AdMob apps + ad units | Google AdMob | Serves interstitial + rewarded ads | Google keeps a cut of ad revenue |
| Store IAP product | App Store + Play Console | The "Remove Ads" product users buy | 15% with Small Business Program |
| RevenueCat project + entitlement | RevenueCat | Handles the purchase + restore on both stores | Free under $2,500/mo tracked revenue, then ~1% |
| Small Business Program | Apple + Google | Drops store commission from 30% → 15% | Saves you money |

> **Order matters.** AdMob first (quickest), then the store IAP products, then RevenueCat (it references the store products), then the Small Business Programs. The Play Console and App Store Connect apps must exist before step 2 — create them as part of #13 if they don't yet.

---

## Part 1 — AdMob (ads)

### 1.1 Use the existing AdMob account
1. Go to <https://admob.google.com> and sign in with the account that already serves Decryptly and Trivily.
2. Don't create a second account — add Threadily to the existing one.

### 1.2 Register the app (twice)
1. AdMob → **Apps** → **Add app**. **Do this twice: once for Android, once for iOS.**
2. "Is your app listed on a supported app store?" → **No** (link it after the store listing goes live).
3. App name: **Threadily**.
4. AdMob shows an **App ID** with a `~` tilde, e.g. `ca-app-pub-5241648641136523~1234567890`. Copy the Android one and the iOS one.

### 1.3 Create the ad units
Threadily uses **one shared rewarded unit** for both rewards, the same as Trivily. For **each** platform app, create two units:

1. App → **Ad units** → **Add ad unit**.
2. **Interstitial**, named `Threadily Interstitial`.
3. **Rewarded**, named `Threadily Rewarded` (serves +3 hearts and +5 energy). Leave the reward amount at the default; the app decides what the reward is.
4. Each gives an **Ad unit ID** with a `/` slash, e.g. `ca-app-pub-5241648641136523/9876543210`. You'll have 4 total: Android interstitial, Android rewarded, iOS interstitial, iOS rewarded.

### 1.4 Paste the ids into the code

**App ids (`~`) → native config**
- `android/app/src/main/AndroidManifest.xml` → the `com.google.android.gms.ads.APPLICATION_ID` meta-data → replace the sample id with your **Android** app id.
- `ios/App/App/Info.plist` (exists after `npx cap add ios` in #13) → add or replace the `GADApplicationIdentifier` key → your **iOS** app id. Copy Trivily's `Info.plist` AdMob block (`GADApplicationIdentifier`, `SKAdNetworkItems`, `NSUserTrackingUsageDescription`) as the template.

**Ad unit ids (`/`) → `src/app/services/ad.service.ts`**, the constants near the top:

```ts
const INTERSTITIAL_AD = {
  android: 'ca-app-pub-5241648641136523/…',   // Android "Threadily Interstitial"
  ios: 'ca-app-pub-5241648641136523/…'        // iOS "Threadily Interstitial"
};
const REWARDED_AD = {
  android: 'ca-app-pub-5241648641136523/…',   // Android "Threadily Rewarded"
  ios: 'ca-app-pub-5241648641136523/…'        // iOS "Threadily Rewarded"
};
```

Then update the comment above them (it currently says "Google's public test ad units") and run `npx cap sync`.

> **Keep test ids while developing.** Clicking your own live ads can get the account flagged. Either swap the live ids in only at ship time, or register your phone as a test device in AdMob → **Settings → Test devices** first.

### 1.5 app-ads.txt (already covered)
`https://bigsimple.dev/app-ads.txt` already contains:
```
google.com, pub-5241648641136523, DIRECT, f08c47fec0942fa0
```
Threadily is on the same AdMob account, so **no new line is needed**. Steps:
1. **Play Console → Store presence → Store settings → Website** = `https://bigsimple.dev`. In App Store Connect, set the **Marketing URL** to `https://bigsimple.dev`.
2. Once the store listings are live, link each AdMob app to its store listing (AdMob → Apps → Threadily → **App settings → Add store**).
3. AdMob → Apps → Threadily → **app-ads.txt** tab → should show **Verified**. Google can take a few days to recrawl.

---

## Part 2 — Store IAP products ("Remove Ads")

Create one **non-consumable** product, Remove Ads, on both stores. Threadily sells only this one IAP; hearts and energy are ad-gated, not sold.

### 2.1 Apple — App Store Connect
1. <https://appstoreconnect.apple.com> → **Threadily** → **Monetization → In-App Purchases** → **+** → **Non-Consumable**.
2. **Reference Name:** `Remove Ads`. **Product ID:** `threadily_remove_ads`.
3. Price: same tier as Trivily (e.g. $2.99). Add the en-US display name `Remove Ads` and the description `Removes the ads shown between puzzles. Optional reward ads stay available.`
4. Review screenshot: a screenshot of the app home screen is fine (Apple only needs to see where the purchase lives). Settings → Remove Ads once #11 lands.
5. Save. Status "Ready to Submit"; it gets approved with the first app submission (attach it on the version page under **In-App Purchases and Subscriptions**).

> **Paid Apps agreement + banking/tax** in App Store Connect → **Business** must already be active (they are, from Trivily/Decryptly).

### 2.2 Google — Play Console
1. <https://play.google.com/console> → **Threadily** → **Monetize with Play → Products → One-time products** → **Create one-time product**.
2. **Product ID:** `threadily_remove_ads` (RevenueCat matches on this, so it must be exact).
3. **Purchase option ID:** `buy`. **Purchase type:** Buy. Name `Remove Ads`, the same description as Apple, and the same price.
4. **Activate** it.

> Play only lets you create products after the app has an uploaded build with the billing library. Upload the first internal-testing AAB (#13) before this step if the page is greyed out.

---

## Part 3 — RevenueCat

### 3.1 Create the project
1. <https://app.revenuecat.com> → **Create new project** → name it `Threadily`.

### 3.2 Add the apps + get API keys
1. Project → **Apps** → **+ New**.
2. **App Store** app: bundle id `com.bigsimple.threadily`. Upload the App Store Connect **In-App Purchase key** (.p8). You can reuse the key file from the Trivily setup; it's per developer account.
3. **Play Store** app: package `com.bigsimple.threadily`. Upload the Play **service account JSON** (reuse Trivily's service account and grant it access to Threadily in Play Console → **Users and permissions**).
4. Each app shows a **public SDK key**: `appl_…` and `goog_…`. They are public keys and safe to ship.

### 3.3 Entitlement
**Product catalog → Entitlements → + New** → identifier **`ad_free`** (exact; the code reads `ENTITLEMENT_AD_FREE` in `constants.ts`).

### 3.4 Products
**Product catalog → Products** → import `threadily_remove_ads` for **both** stores → open `ad_free` → **Attach** both.

### 3.5 Offering + package
**Offerings** → the **default** offering (make sure it's marked current) → **+ New package** → identifier **`remove_ads`** (exact; `REMOVE_ADS_PACKAGE_ID` in `purchase.service.ts`) → attach both products.

### 3.6 Paste the keys
`src/app/services/purchase.service.ts`:
```ts
const REVENUECAT_API_KEY = {
  android: 'goog_…',
  ios: 'appl_…'
};
```
Once the keys no longer start with `TODO`, `configure()` turns RevenueCat on automatically.

---

## Part 4 — Small Business Programs

These are **per developer account, not per app**, so Brian's existing enrollment from Decryptly/Trivily should already cover Threadily. Check:

- **Apple:** <https://developer.apple.com/account> → **Membership details / Agreements** → "App Store Small Business Program: Enrolled". If it is, nothing to do. New apps inherit the 15% rate.
- **Google:** Play Console → **Setup → Payments profile** (account level) → the 15% service-fee tier applies to the first $1M across all your apps automatically once the account is in an eligible account group. Nothing to do per app.

---

## Part 5 — Marketing site updates (bigsimple.dev)

Repo: `C:\Users\bhine\source\repos\apex_apps\bigsimplesite\bigsimpledev`. **A session may make these edits only after Brian says so.** A ready-to-copy privacy page is drafted in this repo at `site-drafts/games/threadily/privacy.html`: Trivily's page with the name, app description, stored data (solved puzzles, coins, trinkets, energy, settings), ad rewards (+3 hearts / +5 energy), and dates swapped.

1. **Privacy page:** copy `site-drafts/games/threadily/privacy.html` → `games/threadily/privacy.html`. Re-read sections 2–3 once more against the shipped app.
2. **Icon:** copy `resources/icon.png` → `images/games/threadily/threadily-icon.png` (resize to 256×256; Trivily's is small).
3. **`index.html` games section** (Trivily card is around line 964): duplicate the Trivily `game-card` block and change:
   - `src="/images/games/threadily/threadily-icon.png"`, `alt="Threadily app icon"`
   - name `Threadily`, blurb `Word-group puzzles — sort every tile into its category. iOS &amp; Android.`
   - App Store link: `TODO` until the Apple id exists (`https://apps.apple.com/us/app/threadily/id…`). Hide the anchor until then.
   - Google Play link: `https://play.google.com/store/apps/details?id=com.bigsimple.threadily`
   - Privacy link: `/games/threadily/privacy`
4. **`index.html` styles** (around line 928): add `.games .game-card .logo-threadily { background: linear-gradient(135deg, #5B45F7, #4F3AF4); box-shadow: 0 4px 14px rgba(79,58,244,0.3); }`. Only needed if the card uses a CSS logo; the image-logo card doesn't.
5. **`index.html` footer** (around line 1049): add `<li><a href="/games/threadily/privacy">Threadily · Privacy</a></li>` after Trivily.
6. **`legal.html`:**
   - line 6 meta description: "…and the Decryptly, Trivily and Threadily games…"
   - line 116 intro: "…plus the Decryptly, Trivily and Threadily games."
   - Games list (around line 140): add `<li><a href="/games/threadily/privacy">Threadily · Privacy Policy</a></li>`
7. **`sitemap.xml`:** add
   ```xml
   <url>
     <loc>https://bigsimple.dev/games/threadily/privacy</loc>
     <changefreq>yearly</changefreq>
     <priority>0.3</priority>
   </url>
   ```
8. **Deploy:** run the site's `deploy.sh` (Vercel). Then check that `https://bigsimple.dev/games/threadily/privacy` and `https://bigsimple.dev/app-ads.txt` both load.
9. **Store listings:** set the privacy policy URL to `https://bigsimple.dev/games/threadily/privacy` in Play Console (**App content → Privacy policy**) and App Store Connect (**App Privacy → Privacy Policy URL**).

---

## Final release checklist

- [ ] AdMob **app ids** in `AndroidManifest.xml` + `Info.plist` (real, `~` format, not the `3940256099942544` sample)
- [ ] AdMob **unit ids** in `ad.service.ts` (real, `/` format), comment updated
- [ ] Test devices removed from AdMob, or kept only for your own phones
- [ ] AdMob shows app-ads.txt **Verified** for both Threadily apps
- [ ] `threadily_remove_ads` active on **both** stores, attached to the iOS version
- [ ] RevenueCat `appl_` / `goog_` keys in `purchase.service.ts`
- [ ] RevenueCat `ad_free` entitlement + `remove_ads` package with both products
- [ ] Small Business Program enrollment confirmed (account level)
- [ ] Privacy page live; privacy URL set in both consoles
- [ ] `npx cap sync`; iOS `cd ios/App && pod install` on the Mac
- [ ] Sandbox purchase + restore tested on a real device; a rewarded ad (hearts and energy) tested with test ids

## Where each value lives

| Value | File | Constant / key |
|---|---|---|
| AdMob Android app id (`~`) | `android/app/src/main/AndroidManifest.xml` | `com.google.android.gms.ads.APPLICATION_ID` |
| AdMob iOS app id (`~`) | `ios/App/App/Info.plist` | `GADApplicationIdentifier` |
| AdMob unit ids (`/`) | `src/app/services/ad.service.ts` | `INTERSTITIAL_AD`, `REWARDED_AD` |
| RevenueCat SDK keys | `src/app/services/purchase.service.ts` | `REVENUECAT_API_KEY` |
| Entitlement id | `src/app/entities/constants.ts` | `ENTITLEMENT_AD_FREE` (= `ad_free`) |
| Package id | `src/app/services/purchase.service.ts` | `REMOVE_ADS_PACKAGE_ID` (= `remove_ads`) |
| Product id (both stores) | store dashboards | `threadily_remove_ads` |
| Interstitial caps | `src/app/entities/constants.ts` | `INTERSTITIAL_MIN_LEVELS`, `INTERSTITIAL_MIN_SECONDS` |
| Rewards | `src/app/entities/constants.ts` | `AD_HEARTS_GRANT` (3), `AD_ENERGY_GRANT` (5), `AD_ENERGY_MAX_PER_DAY` (5) |
