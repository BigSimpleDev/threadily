# Puzzle authoring guide

Puzzles are written in `content/packNN.txt` and compiled with `npm run puzzles`
(build + validate). Format: see the header of `build-puzzles.mjs`.

## Difficulty rating (authored 1–5★)

All puzzles are open, so the rating tells players what they're getting into.
The rating is **authored**, not derived from grid size alone.

**Size sets the floor:**

| Grid | Floor |
|---|---|
| 2×4 | 1★ |
| 3×4 | 2★ |
| 4×4 | 3★ |
| 5×4 | 4★ |

**Wordplay raises it.** Add a star for each of these, capped at 5★:

- a **strong red herring**: a tile that reads at first glance as a member of a
  different category on the board (Florida under "Things with keys", next to a
  states category)
- **tight overlap**: two categories from the same domain (two kinds of
  dog-related categories, two music categories), so every tile needs a second look
- a **wordplay category**: homophones, hidden words, "___ + word" compounds,
  anagrams, words with three meanings — the category name is the riddle

**Small grids can be hard.** A 3×4 built entirely on wordplay can be 4–5★.
At least 100 of the 1,000 must be "small grid, hard wordplay" (≤ 3×4 at ≥ 4★).

**Target mix** across the 1,000: ~15% 1★, 25% 2★, 30% 3★, 20% 4★, 10% 5★.
`validate-puzzles.mjs` prints the running mix and the small-but-hard count.

**Ordering:** pack 1 starts easy and ratings trend upward through the packs, but
every pack mixes ratings so players always have choices. Within a pack, keep the
first ~10 at 1–2★ (first-session players open pack 1 #1 via Continue).

## The one hard rule: no true ambiguity

Every tile has **exactly one** correct category on its board.

- A herring may *look* like it belongs to another category, but it must never
  *genuinely* be a member of it. ✗ "Cobra" on a board with both "Snakes" and
  "Yoga poses" — a cobra really is a snake and Cobra really is a pose.
  ✓ "Tree" with "Yoga poses" and "Tree parts" — a tree isn't a part of a tree.
- Don't rely on counting to resolve a tile ("Orange" with both "Fruits" and
  "Colors" is ambiguous even if the other slots force it).
- Check each tile against **every** category name on its board, not just the
  one it's in.
- Facts must be current (team relocations, renamed places). Prefer timeless facts.
- No full copyrighted lyrics. Song/film titles as single tiles are fine.
- Brand-heavy puzzles (sports leagues, companies, franchises) get a `warning=`
  naming the rights-holder(s) for the no-affiliation disclaimer.
- Tiles ≤ 12 characters, 4 per category, 2–5 categories.
- Never use the word "Connections" anywhere in content.
