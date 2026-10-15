// Builds every trinket set from trinketart/sets.json:
//   - src/assets/trinkets/<set>/<set>_NN.(png|svg)  — art or a placeholder card
//   - src/assets/trinkets/catalog.json              — { id, name, rarity, set, img }
//   - TRINKETS.md and trinketart/ART_PROMPT.md       — regenerated docs
//
// Art workflow (prompts in trinketart/ART_PROMPT.md):
//   1. Generate a PNG per trinket.
//   2. Drop it in trinketart/<set>/ named <set>_NN.png (NN = position 01–12,
//      which fixes the name and rarity).
//   3. node generate-trinkets.mjs              (every set)
//      node generate-trinkets.mjs ocean_knits  (just one)
//
// Per slot: a freshly dropped PNG wins; otherwise art already in the set's asset
// folder is kept (the drop folders are scratch space and may be emptied after a
// run); otherwise a placeholder SVG is written. Safe to re-run on partial drops.
// Catalog entries for sets this script doesn't know about (e.g. seasonal event
// sets) are left untouched.
import { writeFileSync, readFileSync, readdirSync, copyFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRINKET_DIR = join(__dirname, 'src/assets/trinkets');
const ART_DIR = join(__dirname, 'trinketart');
const { sets: SETS } = JSON.parse(readFileSync(join(ART_DIR, 'sets.json'), 'utf8'));

// Rarity by 1-based position: the fixed 6 / 3 / 2 / 1 spread. Position 12 is
// the set's legendary chase piece.
function rarityFor(pos) {
  if (pos >= 12) return 'legendary';
  if (pos >= 10) return 'epic';
  if (pos >= 7) return 'rare';
  return 'common';
}

const RARITY_RING = { common: '#C9C2B8', rare: '#4F9BD1', epic: '#9A62B3', legendary: '#E0A82E' };

// Placeholder card: the emoji on the set's soft ground inside a dashed "stitch"
// ring in the rarity color, so a half-finished set still reads as yarn-themed.
function placeholderSvg(emoji, ground, rarity) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${ground}"/>
  <circle cx="128" cy="128" r="104" fill="#FFFFFF" fill-opacity="0.55"/>
  <circle cx="128" cy="128" r="104" fill="none" stroke="${RARITY_RING[rarity]}" stroke-width="5" stroke-dasharray="12 8" stroke-linecap="round"/>
  <text x="128" y="134" font-size="120" text-anchor="middle" dominant-baseline="central">${emoji}</text>
</svg>
`;
}

const requested = process.argv.slice(2);
const known = SETS.map(s => s.id);
const unknown = requested.filter(id => !known.includes(id));
if (unknown.length) {
  console.error(`Unknown set(s): ${unknown.join(', ')}. Known: ${known.join(', ')}`);
  process.exit(1);
}
const targets = SETS.filter(s => requested.length === 0 || requested.includes(s.id));

const catalogPath = join(TRINKET_DIR, 'catalog.json');
mkdirSync(TRINKET_DIR, { recursive: true });
const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf8')) : [];

for (const s of targets) {
  if (s.items.length !== 12) throw new Error(`${s.id} has ${s.items.length} items; every set needs 12`);
  const dropDir = join(ART_DIR, s.id);
  const outDir = join(TRINKET_DIR, s.id);
  mkdirSync(outDir, { recursive: true });
  const dropped = existsSync(dropDir) ? readdirSync(dropDir).filter(f => f.toLowerCase().endsWith('.png')) : [];

  let fresh = 0, kept = 0, placeholders = 0;
  s.items.forEach(([name, emoji], i) => {
    const pos = i + 1;
    const num = String(pos).padStart(2, '0');
    const id = `${s.id}-${num}`;
    const base = `${s.id}_${num}`;
    const png = join(outDir, `${base}.png`);
    const rarity = rarityFor(pos);

    // Only one file per slot ever ships, so clear the other form.
    const src = dropped.find(f => f.toLowerCase() === `${base}.png`);
    let rel;
    if (src) {
      copyFileSync(join(dropDir, src), png);
      rmSync(join(outDir, `${base}.svg`), { force: true });
      rel = `assets/trinkets/${s.id}/${base}.png`;
      fresh++;
    } else if (existsSync(png)) {
      rmSync(join(outDir, `${base}.svg`), { force: true });
      rel = `assets/trinkets/${s.id}/${base}.png`;
      kept++;
    } else {
      writeFileSync(join(outDir, `${base}.svg`), placeholderSvg(emoji, s.ground, rarity));
      rel = `assets/trinkets/${s.id}/${base}.svg`;
      placeholders++;
    }

    const entry = { id, name, rarity, set: s.name, img: rel };
    const at = catalog.findIndex(t => t.id === id);
    if (at >= 0) catalog[at] = entry; else catalog.push(entry);
  });
  console.log(`${s.id}: ${fresh} new art, ${kept} kept, ${placeholders} placeholder(s).`);
}

// Keep the catalog in sets.json order (unknown/event sets stay at the end).
const order = id => {
  const k = known.indexOf(id.replace(/-\d+$/, ''));
  return k < 0 ? Number.MAX_SAFE_INTEGER : k;
};
catalog.sort((a, b) => order(a.id) - order(b.id) || a.id.localeCompare(b.id));
writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`Catalog now holds ${catalog.length} items.`);

// ── Docs ──────────────────────────────────────────────────────
const md = [
  '# Trinkets',
  '',
  'Generated by `node generate-trinkets.mjs` from `trinketart/sets.json` — edit the JSON, not this file.',
  '',
  '**Threadily style:** crochet / amigurumi / felt plush with visible stitches and yarn texture.',
  '12 sets × 12 = 144. Every set: 6 common / 3 rare / 2 epic / 1 legendary; position 12 is the chase piece.',
  'Art prompts: `trinketart/ART_PROMPT.md`.',
  ''
];
for (const s of SETS) {
  md.push(`## ${s.emoji} ${s.name} (\`${s.id}\`) — ${s.theme}`, '', '| file | name | rarity | placeholder |', '|---|---|---|---|');
  s.items.forEach(([name, emoji], i) => {
    const num = String(i + 1).padStart(2, '0');
    md.push(`| \`${s.id}_${num}.png\` | ${name} | ${rarityFor(i + 1)} | ${emoji} |`);
  });
  md.push('');
}
writeFileSync(join(__dirname, 'TRINKETS.md'), md.join('\n'));

const prompt = [
  '# Trinket art prompts (Threadily yarn style)',
  '',
  'Generated by `node generate-trinkets.mjs` from `trinketart/sets.json`.',
  '',
  '## How to generate',
  '',
  '1. Open ChatGPT image generation. **For the very first piece**, attach no reference; for every later piece, attach the first finished piece as the style reference (the same role `epic_figure_king_arthur.png` plays for Trivily).',
  '2. Paste the template below, filling in `{SET THEME}`, `{PALETTE}`, and `{ONE-LINE SUBJECT}` from the tables.',
  '3. Save as `trinketart/<set>/<set>_NN.png` (the file name in the table). Square ~1200×1200 PNG.',
  '4. Run `node generate-trinkets.mjs <set>` — the PNG replaces the placeholder. Partial drops are fine.',
  '',
  '**Rules:** one subject per image · keep the subject inside the middle ~80% (cards crop toward a circle) · original characters only (no Disney / franchise look-alikes) · no text, border, watermark, or name plate.',
  '',
  '## Template',
  '',
  '> A handmade crochet amigurumi plush in the style of the attached reference image, photographed as a cozy craft diorama. Everything is made of yarn and felt: visible crochet stitches and knit texture, soft fuzzy fibers, tiny embroidered details, safety-bead or stitched eyes, felt accents, a little stuffing roundness. Square 1:1, ~1200×1200, full-bleed scene: the plush sits on a small round crocheted coaster base with a soft knitted or felt backdrop behind it, warm studio lighting, soft shadows, gentle background blur. Cute rounded proportions, oversized head. **{SET THEME}** theme. Palette: {PALETTE}. No border, no text, no watermark, no name plate.',
  '>',
  '> Subject: **{ONE-LINE SUBJECT}**',
  ''
];
for (const s of SETS) {
  prompt.push(`## ${s.name} — \`${s.id}\``, '', `- **{SET THEME}:** ${s.theme}`, `- **{PALETTE}:** ${s.palette}`, '', '| file | rarity | subject |', '|---|---|---|');
  s.items.forEach(([, , subject], i) => {
    const num = String(i + 1).padStart(2, '0');
    prompt.push(`| \`${s.id}_${num}.png\` | ${rarityFor(i + 1)} | ${subject} |`);
  });
  prompt.push('');
}
writeFileSync(join(ART_DIR, 'ART_PROMPT.md'), prompt.join('\n'));
console.log('Wrote TRINKETS.md and trinketart/ART_PROMPT.md.');
