// Builds src/assets/daily/schedule.json: one main-pack puzzle id per day,
// index N-1 = Daily #N. Append-only — existing entries are kept exactly, so a
// daily that has already run never changes. Event packs (> MAX_PACK) are never
// scheduled.
//
//   node scripts/build-daily.mjs          (extend to at least DAYS entries)
//   node scripts/build-daily.mjs 1460     (extend to 1460 entries)
//   node scripts/build-daily.mjs --rebuild-from 2026-11-20
//       (drop every entry from that date on and re-plan it; for when new packs
//        land. Pick a date past the last shipped build's reach: a daily that
//        already ran, or that a live build still serves, must never change.)
//
// DAILY_EPOCH and MAX_PACK are read from src/app/entities/constants.ts.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { extendSchedule } from './daily-plan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src/assets/daily/schedule.json');
const DAYS = 1095; // three years

const constants = readFileSync(join(ROOT, 'src/app/entities/constants.ts'), 'utf8');
const epoch = constants.match(/DAILY_EPOCH\s*=\s*'(\d{4}-\d{2}-\d{2})'/)?.[1];
const maxPack = +(constants.match(/MAX_PACK\s*=\s*(\d+)/)?.[1] ?? 0);
if (!epoch || !maxPack) {
    console.error('Could not read DAILY_EPOCH / MAX_PACK from constants.ts');
    process.exit(1);
}

const puzzles = [];
for (let pack = 1; pack <= maxPack; pack++) {
    const file = join(ROOT, `src/assets/puzzles/${pack}.json`);
    if (!existsSync(file)) continue;
    for (const p of JSON.parse(readFileSync(file, 'utf8')).puzzles) puzzles.push({ id: p.id, rating: p.rating });
}

const args = process.argv.slice(2);
const fromAt = args.indexOf('--rebuild-from');
const rebuildFrom = fromAt >= 0 ? args.splice(fromAt, 2)[1] : null;

let existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
if (rebuildFrom) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rebuildFrom)) {
        console.error('--rebuild-from needs a YYYY-MM-DD date');
        process.exit(1);
    }
    // Daily #N falls on epoch + (N-1) days, so entries before this date stay.
    const keep = Math.round((Date.parse(rebuildFrom) - Date.parse(epoch)) / 86400000);
    if (keep < 1) {
        console.error(`--rebuild-from must be after DAILY_EPOCH (${epoch})`);
        process.exit(1);
    }
    existing = existing.slice(0, keep);
    console.log(`rebuilding from ${rebuildFrom} (Daily #${keep + 1}); keeping ${existing.length} entries`);
}
const days = Math.max(DAYS, +(args[0] ?? 0));
const schedule = extendSchedule(existing, puzzles, epoch, days);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(schedule) + '\n');
console.log(`schedule.json: ${existing.length} kept, ${schedule.length - existing.length} appended, ${schedule.length} days from ${epoch}`);
