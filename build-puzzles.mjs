// Compiles the human-friendly puzzle sources in content/packNN.txt into the
// JSON packs the app loads (src/assets/puzzles/<n>.json), then you run
// validate-puzzles.mjs. Ids are assigned from the pack number and position, so
// reordering puzzles in a source file renumbers them.
//
//   node build-puzzles.mjs         (every content/pack*.txt)
//   node build-puzzles.mjs 3       (just pack 3)
//
// Source format — one block per puzzle, blocks separated by blank lines:
//
//   @ 3 | Lone Star & Friends | warning=MLB | note=Austin is also a first name
//   Texas: Austin, Alamo, Big Bend, Rangers
//   Ohio: Columbus, Cedar Point, Cuyahoga, Browns
//   ~ Austin, Columbus
//
// `@ <rating>` starts a puzzle; title, warning= and note= are optional.
// Each `Name: tile, tile, tile, tile` line is a category in authored order.
// `~` lists deliberate red-herring tiles. Lines starting with # are comments.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'content');
const OUT = join(__dirname, 'src/assets/puzzles');
const PER_PACK = 100;

const only = process.argv[2] ? +process.argv[2] : null;
const files = readdirSync(SRC).filter(f => /^pack\d+\.txt$/.test(f))
    .filter(f => only === null || parseInt(f.slice(4)) === only);
mkdirSync(OUT, { recursive: true });

let failed = false;
for (const f of files) {
    const pack = parseInt(f.slice(4));
    const lines = readFileSync(join(SRC, f), 'utf8').split(/\r?\n/);
    const puzzles = [];
    let cur = null;
    lines.forEach((raw, ln) => {
        const line = raw.trim();
        const where = `${f}:${ln + 1}`;
        if (!line || line.startsWith('#')) return;
        if (line.startsWith('@')) {
            const [head, ...rest] = line.slice(1).split('|').map(s => s.trim());
            cur = { id: (pack - 1) * PER_PACK + puzzles.length + 1, rating: +head };
            for (const part of rest) {
                if (part.startsWith('warning=')) cur.warning = part.slice(8).trim();
                else if (part.startsWith('note=')) cur.note = part.slice(5).trim();
                else if (part) cur.title = part;
            }
            cur.categories = [];
            puzzles.push(cur);
            return;
        }
        if (!cur) { console.error(`${where}: content before the first @`); failed = true; return; }
        if (line.startsWith('~')) {
            cur.herrings = line.slice(1).split(',').map(s => s.trim()).filter(Boolean);
            return;
        }
        const colon = line.indexOf(':');
        if (colon < 0) { console.error(`${where}: expected "Category: tile, tile, …"`); failed = true; return; }
        cur.categories.push({
            name: line.slice(0, colon).trim(),
            tiles: line.slice(colon + 1).split(',').map(s => s.trim()).filter(Boolean)
        });
    });

    // Stable key order in the JSON output.
    const ordered = puzzles.map(p => {
        const o = { id: p.id, rating: p.rating };
        if (p.title) o.title = p.title;
        o.categories = p.categories;
        if (p.herrings) o.herrings = p.herrings;
        if (p.note) o.note = p.note;
        if (p.warning) o.warning = p.warning;
        return o;
    });
    writeFileSync(join(OUT, `${pack}.json`), JSON.stringify({ pack, puzzles: ordered }, null, 1) + '\n');
    console.log(`${f} → src/assets/puzzles/${pack}.json (${ordered.length} puzzles)`);
}
if (failed) process.exit(1);
