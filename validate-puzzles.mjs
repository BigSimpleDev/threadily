// Validates every pack under src/assets/puzzles/. Run after every content edit:
//   node validate-puzzles.mjs          (errors fail the run; stats printed)
//   node validate-puzzles.mjs --quiet  (errors only)
//
// Limits come from src/app/entities/constants.ts so the validator and the board
// can never disagree about what fits.
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUZZLE_DIR = join(__dirname, 'src/assets/puzzles');
const quiet = process.argv.includes('--quiet');

const constantsSrc = readFileSync(join(__dirname, 'src/app/entities/constants.ts'), 'utf8');
function constant(name) {
    const m = constantsSrc.match(new RegExp(`export const ${name} = (\\d+);`));
    if (!m) throw new Error(`Could not read ${name} from constants.ts`);
    return +m[1];
}
const MAX_CATEGORIES = constant('MAX_CATEGORIES');
const TILES_PER_CATEGORY = constant('TILES_PER_CATEGORY');
const TILE_MAX_CHARS = constant('TILE_MAX_CHARS');
const PUZZLES_PER_PACK = constant('PUZZLES_PER_PACK');
const MAX_PACK = constant('MAX_PACK');
const MIN_CATEGORIES = 2;

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const files = existsSync(PUZZLE_DIR)
    ? readdirSync(PUZZLE_DIR).filter(f => /^\d+\.json$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b))
    : [];

const seenIds = new Map();        // id -> file
const seenSignatures = new Map(); // board signature -> where
const stats = { puzzles: 0, byRating: [0, 0, 0, 0, 0, 0], bySize: {}, smallHard: 0, tiles: 0 };

for (let n = 1; n <= MAX_PACK; n++) {
    if (!files.includes(`${n}.json`)) err(`pack ${n}`, `missing src/assets/puzzles/${n}.json (MAX_PACK is ${MAX_PACK})`);
}

const norm = s => s.trim().toLowerCase();

for (const file of files) {
    const packNo = parseInt(file);
    let data;
    try {
        data = JSON.parse(readFileSync(join(PUZZLE_DIR, file), 'utf8'));
    } catch (e) {
        err(file, `invalid JSON — ${e.message}`);
        continue;
    }
    if (data.pack !== packNo) err(file, `"pack" is ${data.pack}, expected ${packNo}`);
    if (!Array.isArray(data.puzzles) || data.puzzles.length === 0) {
        err(file, '"puzzles" must be a non-empty array');
        continue;
    }
    if (data.puzzles.length > PUZZLES_PER_PACK) err(file, `${data.puzzles.length} puzzles; max ${PUZZLES_PER_PACK}`);
    if (packNo <= MAX_PACK && data.puzzles.length !== PUZZLES_PER_PACK) {
        warn(file, `${data.puzzles.length} puzzles (a full pack holds ${PUZZLES_PER_PACK})`);
    }

    const lo = (packNo - 1) * PUZZLES_PER_PACK + 1;
    const hi = packNo * PUZZLES_PER_PACK;

    data.puzzles.forEach((p, i) => {
        const where = `${file} #${i} (id ${p?.id})`;
        if (!p || typeof p !== 'object') { err(where, 'not an object'); return; }

        // ── schema ──
        if (!Number.isInteger(p.id)) err(where, '"id" must be an integer');
        else {
            if (p.id < lo || p.id > hi) err(where, `id out of range for pack ${packNo} (${lo}–${hi})`);
            if (p.id !== lo + i) err(where, `ids must run in order; expected ${lo + i}`);
            if (seenIds.has(p.id)) err(where, `duplicate id (also in ${seenIds.get(p.id)})`);
            seenIds.set(p.id, file);
        }
        if (!Number.isInteger(p.rating) || p.rating < 1 || p.rating > 5) err(where, '"rating" must be an integer 1–5');
        if (p.title !== undefined && (typeof p.title !== 'string' || !p.title.trim())) err(where, '"title" must be a non-empty string when present');
        if (p.note !== undefined && typeof p.note !== 'string') err(where, '"note" must be a string');
        if (p.warning !== undefined && (typeof p.warning !== 'string' || !p.warning.trim())) err(where, '"warning" must be a non-empty string when present');
        const known = new Set(['id', 'rating', 'title', 'categories', 'herrings', 'note', 'warning']);
        Object.keys(p).filter(k => !known.has(k)).forEach(k => err(where, `unknown field "${k}"`));

        if (!Array.isArray(p.categories)) { err(where, '"categories" must be an array'); return; }
        if (p.categories.length < MIN_CATEGORIES || p.categories.length > MAX_CATEGORIES) {
            err(where, `${p.categories.length} categories; allowed ${MIN_CATEGORIES}–${MAX_CATEGORIES}`);
        }

        const allTiles = [];
        const catNames = new Set();
        p.categories.forEach((c, ci) => {
            const cw = `${where} cat ${ci}`;
            if (!c || typeof c.name !== 'string' || !c.name.trim()) { err(cw, 'needs a non-empty "name"'); return; }
            if (c.name !== c.name.trim()) err(cw, `name has stray whitespace: "${c.name}"`);
            if (catNames.has(norm(c.name))) err(cw, `duplicate category name "${c.name}"`);
            catNames.add(norm(c.name));
            Object.keys(c).filter(k => k !== 'name' && k !== 'tiles').forEach(k => err(cw, `unknown field "${k}"`));
            if (!Array.isArray(c.tiles)) { err(cw, '"tiles" must be an array'); return; }
            // Tiles-per-category is consistent across the whole game (the board
            // draws TILES_PER_CATEGORY slots per row).
            if (c.tiles.length !== TILES_PER_CATEGORY) err(cw, `"${c.name}" has ${c.tiles.length} tiles; every category needs ${TILES_PER_CATEGORY}`);
            c.tiles.forEach(t => {
                if (typeof t !== 'string' || !t.trim()) { err(cw, 'empty tile'); return; }
                if (t !== t.trim()) err(cw, `tile has stray whitespace: "${t}"`);
                if (t.length > TILE_MAX_CHARS) err(cw, `tile "${t}" is ${t.length} chars; max ${TILE_MAX_CHARS}`);
                allTiles.push(t);
                if (norm(t) === norm(c.name)) warn(cw, `tile "${t}" repeats its own category name`);
            });
        });

        // ── unique tiles within the puzzle (case-insensitive) ──
        const seenTiles = new Set();
        for (const t of allTiles) {
            if (seenTiles.has(norm(t))) err(where, `duplicate tile "${t}"`);
            seenTiles.add(norm(t));
        }

        if (p.herrings !== undefined) {
            if (!Array.isArray(p.herrings)) err(where, '"herrings" must be an array');
            else p.herrings.forEach(h => {
                if (!seenTiles.has(norm(String(h)))) err(where, `herring "${h}" is not a tile in this puzzle`);
            });
        }

        // ── no duplicate boards across packs ──
        const sig = p.categories
            .map(c => (c.tiles ?? []).map(norm).sort().join('|'))
            .sort()
            .join(' / ');
        if (seenSignatures.has(sig)) err(where, `same board as ${seenSignatures.get(sig)}`);
        seenSignatures.set(sig, where);

        // ── stats ──
        if (packNo <= MAX_PACK) {
            stats.puzzles++;
            stats.tiles += allTiles.length;
            if (p.rating >= 1 && p.rating <= 5) stats.byRating[p.rating]++;
            const size = `${p.categories.length}×${TILES_PER_CATEGORY}`;
            stats.bySize[size] = (stats.bySize[size] ?? 0) + 1;
            if (p.categories.length <= 3 && p.rating >= 4) stats.smallHard++;
        }
    });
}

if (!quiet && warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    warnings.forEach(w => console.log('  ⚠ ' + w));
}
if (!quiet) {
    const pct = n => stats.puzzles ? `${Math.round((n / stats.puzzles) * 100)}%` : '0%';
    console.log(`\n${files.length} pack file(s), ${stats.puzzles} main puzzle(s), ${stats.tiles} tiles.`);
    console.log('Rating mix (target 15/25/30/20/10%): ' +
        [1, 2, 3, 4, 5].map(r => `${r}★ ${stats.byRating[r]} (${pct(stats.byRating[r])})`).join(' · '));
    console.log('Grid sizes: ' + Object.entries(stats.bySize).sort().map(([k, v]) => `${k} ${v}`).join(' · '));
    console.log(`Small-but-hard (≤3 categories at ≥4★, target ≥100 overall): ${stats.smallHard}`);
}
if (errors.length) {
    console.error(`\n${errors.length} error(s):`);
    errors.forEach(e => console.error('  ✖ ' + e));
    process.exit(1);
}
console.log('\n✔ puzzles valid');
