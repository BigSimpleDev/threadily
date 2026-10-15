// Store screenshots → resources/store/<device>/NN-name.png.
// Play: phone 1080x1920, tablet 1600x2560. App Store: 6.9" 1320x2868, 13" iPad 2064x2752.
// Needs the dev server on :8100 (npm start). Run: node store-screenshots.mjs
import fs from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const ROOT = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = `${ROOT}/resources/store`;
const DEVICES = [
  { name: 'play-phone', w: 360, h: 640, s: 3 },
  { name: 'play-tablet', w: 800, h: 1280, s: 2 },
  { name: 'ios-6.9', w: 440, h: 956, s: 3 },
  { name: 'ios-ipad-13', w: 1032, h: 1376, s: 2 },
];
const PACK = 1, INDEX = 23;
const z = JSON.parse(fs.readFileSync(`${ROOT}/src/assets/puzzles/${PACK}.json`, 'utf8')).puzzles[INDEX];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const browser = await chromium.launch({ channel: 'chrome' });
const errs = [];
for (const d of DEVICES) {
  fs.mkdirSync(`${OUT}/${d.name}`, { recursive: true });
  for (const dark of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: d.s, hasTouch: true, isMobile: d.w < 700 });
    await ctx.addInitScript(([dk, TRINKETS]) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.clear();
      localStorage.setItem('bsd.thr.dark_mode', dk ? 'true' : 'false');
      localStorage.setItem('bsd.thr.tutorial_seen', 'true');
      localStorage.setItem('bsd.thr.coins', '240');
      const solved = [];
      for (let i = 1; i <= 64; i++) if (i % 5 !== 0 && i !== 11) solved.push(i);
      localStorage.setItem('bsd.thr.solved', JSON.stringify(solved));
      localStorage.setItem('bsd.thr.ad_free', 'true'); // no ad banners in marketing shots
      localStorage.setItem('bsd.thr.trinkets', TRINKETS);
      sessionStorage.setItem('seeded', '1');
    }, [dark, JSON.stringify(JSON.parse(fs.readFileSync(`${ROOT}/src/assets/trinkets/catalog.json`, 'utf8')).filter((_, i) => i % 4 === 0).map(t => t.id))]);
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(e.message));
    const shot = async n => page.screenshot({ path: `${OUT}/${d.name}/${n}.png` });
    const tile = t => page.locator('.thr-pool .thr-tile', { hasText: new RegExp('^\\s*' + esc(t) + '\\s*$') }).first();
    const catEl = n => page.locator('.thr-cat', { has: page.locator('.thr-cat-name', { hasText: new RegExp('^\\s*' + esc(n) + '\\s*$') }) });
    const place = async (tiles, n) => { for (const t of tiles) { await tile(t).click(); await catEl(n).click(); } };
    const lock = async n => { await catEl(n).locator('.thr-lock-btn').click(); await page.waitForTimeout(900); };

    if (!dark) {
      await page.goto('http://localhost:8100/');
      await page.waitForTimeout(4000);
      await shot('01-home');
      await page.goto('http://localhost:8100/pack/1');
      await page.waitForTimeout(2500);
      await shot('05-packs');
    }
    await page.goto(`http://localhost:8100/play/${PACK}/${INDEX}`);
    await page.locator('.thr-pool .thr-tile').first().waitFor();
    await page.waitForTimeout(dark ? 3500 : 1500);
    const [a, b, c] = z.categories;
    if (dark) {
      await place(a.tiles, a.name); await lock(a.name); await page.waitForTimeout(1500);
      await catEl(c.name).click(); for (const t of c.tiles.slice(0, 2)) await tile(t).click();
      await shot('06-dark');
      await ctx.close();
      continue;
    }
    await shot('02-board');
    // One-away: three right plus the herring that belongs elsewhere.
    const herring = (z.herrings ?? [])[0];
    const owner = z.categories.find(k => k.tiles.includes(herring));
    const target = owner === a ? b : a;
    await place([...target.tiles.slice(0, 3), herring], target.name);
    await catEl(target.name).locator('.thr-lock-btn').click();
    await page.waitForTimeout(350);
    await shot('03-one-away');
    await page.waitForTimeout(1800);
    for (const k of z.categories.slice(0, 2)) { await place(k.tiles, k.name); await lock(k.name); }
    await place(c.tiles.slice(0, 3), c.name);
    await shot('04-progress');
    for (const k of z.categories.slice(2)) {
      const left = k.tiles.filter(() => true);
      for (const t of left) if (await tile(t).count()) { await tile(t).click(); await catEl(k.name).click(); }
      await lock(k.name);
    }
    await page.locator('.thr-win-card').waitFor({ timeout: 8000 });
    await page.waitForTimeout(1200);
    await shot('07-solved');
    await ctx.close();
  }
  console.log('done', d.name);
}
console.log('errors', errs);
await browser.close();
