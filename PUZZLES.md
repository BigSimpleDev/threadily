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

## Per-pack recipe (packs 2–10)

Pack 1 skews easy (18/37/28/13/4 %). To land the 1,000-puzzle mix, packs 2–10
each aim for roughly:

| Rating | Count | Grids |
|---|---|---|
| 1★ | 15 | 2×4 ×11, 3×4 ×4 |
| 2★ | 23 | 3×4 ×14, 2×4 ×3, 4×4 ×6 |
| 3★ | 30 | 4×4 ×20, 3×4 ×6 (wordplay), 5×4 ×4 |
| 4★ | 21 | 5×4 ×8, 4×4 ×6, 3×4 ×7 (small-but-hard) |
| 5★ | 11 | 5×4 ×5, 4×4 ×1, 3×4 ×4, 2×4 ×1 (small-but-hard) |

That gives ~12 small-but-hard per pack (~117 overall).

## Seed bank

Categories by domain. *Italics* mark tiles with a second meaning that make
good herrings — but only on boards where that second meaning is **not** one
of the categories.

**Food & drink** — fruits, vegetables, berries, citrus, nuts, grains, beans,
herbs, spices, cheeses, breads, pasta shapes, desserts by country, candy,
cookies, soups, sauces, sandwiches, salads, breakfast foods, coffee drinks,
teas, wines, cocktails, cuts of beef, cooking methods, knife cuts, kitchen
tools, pizza styles. Herrings: *Date*, *Kiwi* (bird), *Turkey* (country),
*Java* (island), *Mocha* (city), *Cobbler* (job), *Trifle*, *Fudge* (verb),
*Squash* (sport), *Mint* (coin factory), *Sage* (wise person), *Pepper*.

**Animals** — pets, farm, zoo, birds of prey, songbirds, waterbirds, insects,
fish, sharks, whales, shellfish, reptiles, big cats, primates, dog / cat /
horse / chicken / cattle breeds, baby animals, animal groups, homes, sounds.
Herrings: *Boxer*, *Pointer*, *Jersey*, *Persian*, *Mustang*, *Bengal*,
*Jaguar* (car), *Crane*, *Swallow*, *Duck*, *Seal*, *Bat*, *Mole*, *Kid*.

**Places** — capitals by continent, US states, US / Canadian / Mexican cities,
rivers, mountains, lakes, deserts, islands, oceans, landmarks, bridges,
palaces, temples. Herrings: *Jordan*, *Georgia*, *Turkey*, *Chile*, *Nice*,
*Reading*, *Bath*, *Split*, *Mobile*, *Phoenix*, *Victoria*.

**Sports & games** — terms by sport, equipment, venues, card / board / dice /
party games, chess pieces, poker hands, yoga poses, dances, martial arts,
Olympic events. Herrings: *Love*, *Ace*, *Eagle*, *Birdie*, *Bishop*,
*Knight*, *Bridge*, *Hearts*, *Go*, *Pitch*, *Court*, *Net*.

**Arts & culture** — instruments by family, music genres, music terms,
painters, composers, writers, Shakespeare, fairy tales, mythology (Greek,
Roman, Norse, Egyptian), mythical creatures, movie genres, theater, film crew.
Herrings: *Grip*, *Wings*, *Bach* (sounds like "batch"), *Thor*, *Apollo*.

**Science & nature** — planets, moons, constellations, elements, metals,
gemstones, weather, clouds, rocks, bones, organs, muscles, teeth, trees,
flowers. Herrings: *Mercury*, *Iris* (eye), *Lily*, *Ruby*, *Amber*, *Jade*,
*Canine*, *Colon*, *Palm*.

**Everyday life** — clothing by type, shoes, hats, fabrics, patterns, rooms,
furniture, tools, office supplies, school subjects, punctuation, units of
measure, vehicles, car / bike parts, road signs, jobs, emotions.

**Wordplay (category name is the riddle)**
- Sounds like a letter: Bee, Sea, Tea, Queue, Why, Eye, Pea, Jay, You, Are, Owe, Ex
- Sounds like a number: Won, Too, Fore, Ate, Tin? (no), Sicks? (avoid forced ones)
- Hidden words (animals, colors, numbers, body parts, birds, fish, insects)
- `___ball`, `___fly`, `___cake`, `___man`, `___board`, `___book`, `___light`,
  `___house`, `___fish`, `___bird`, `___stone`, `Fire___`, `Sun___`, `Cat___`,
  `Jack___`, `Back___`, `Head___`, `Water___`, `Butter___`
- Palindromes; words that spell another word backward; anagram sets
- Animals that are also verbs; names that are also words (Bill, Mark, Rob,
  Pat, Sue, Frank, Grant, Will, Art, Peg, Jack, Bob)
- Currencies that are words (Won, Real, Rand, Mark, Pound — mind the weight unit)
- "Things with ___" (keys, shells, bark, needles, rings, trunks, teeth,
  scales, hands, faces, eyes, tongues, necks, beds, banks, crowns, heads,
  stems, wings, chips, plates) — the richest herring source, and the easiest
  to make ambiguous: check every tile against every "things with" on the board.
