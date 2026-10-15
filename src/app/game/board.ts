import { puzzle } from '../entities/entities';

// Pure board rules. Every function takes a state and returns a new one, so the
// component can hold the board in a single signal and the rules stay testable
// without a DOM.

export interface board_category {
    name: string;
    // The authored answer key for this category.
    answer: string[];
    // Tiles the player has placed here, in placement order (≤ answer.length).
    slots: string[];
    locked: boolean;
    // Tiles placed by a hint: correct by construction, so they can't be removed.
    pinned: string[];
}

export interface board_state {
    puzzleId: number;
    categories: board_category[];
    // Unplaced tiles, in their shuffled display order.
    pool: string[];
    hearts: number;
    // Wrong guesses already charged, keyed by category + sorted tiles, so the
    // same wrong set costs no heart twice (NYT behavior).
    tried: string[];
}

export type lock_result = 'correct' | 'wrong' | 'one-away' | 'already' | 'not-full' | 'locked';

export type rng = () => number;

// Fisher–Yates on a copy.
export function shuffle<T>(items: T[], random: rng = Math.random): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export function newBoard(p: puzzle, hearts: number, random: rng = Math.random): board_state {
    const all = p.categories.flatMap(c => c.tiles);
    return {
        puzzleId: p.id,
        categories: p.categories.map(c => ({
            name: c.name,
            answer: [...c.tiles],
            slots: [],
            locked: false,
            pinned: []
        })),
        pool: shuffle(all, random),
        hearts,
        tried: []
    };
}

export function isFull(c: board_category): boolean {
    return c.slots.length >= c.answer.length;
}

export function isWon(s: board_state): boolean {
    return s.categories.every(c => c.locked);
}

// Index of the category currently holding `tile` in its slots, or -1 (pool).
export function categoryOf(s: board_state, tile: string): number {
    return s.categories.findIndex(c => c.slots.includes(tile));
}

// Move a tile (from the pool or another open category) into category `ci`.
// No-op when the target is locked or full, or the tile is frozen.
export function place(s: board_state, tile: string, ci: number): board_state {
    const target = s.categories[ci];
    if (!target || target.locked || isFull(target)) return s;
    const from = categoryOf(s, tile);
    if (from === ci) return s;
    if (from < 0 && !s.pool.includes(tile)) return s;
    if (from >= 0 && (s.categories[from].locked || s.categories[from].pinned.includes(tile))) return s;

    const categories = s.categories.map((c, i) => {
        if (i === from) return { ...c, slots: c.slots.filter(t => t !== tile) };
        if (i === ci) return { ...c, slots: [...c.slots, tile] };
        return c;
    });
    return { ...s, categories, pool: s.pool.filter(t => t !== tile) };
}

// Send a placed tile back to the end of the pool.
export function unplace(s: board_state, tile: string): board_state {
    const from = categoryOf(s, tile);
    if (from < 0) return s;
    const c = s.categories[from];
    if (c.locked || c.pinned.includes(tile)) return s;
    const categories = s.categories.map((x, i) =>
        i === from ? { ...x, slots: x.slots.filter(t => t !== tile) } : x);
    return { ...s, categories, pool: [...s.pool, tile] };
}

// How many placed tiles in a category are wrong.
export function wrongCount(c: board_category): number {
    return c.slots.filter(t => !c.answer.includes(t)).length;
}

function guessKey(ci: number, c: board_category): string {
    return `${ci}:${[...c.slots].sort().join('|')}`;
}

// Lock In a full category. Correct → locked. Wrong → −1 heart and the
// non-pinned tiles return to the pool; exactly one wrong reports 'one-away'.
// A wrong set already tried returns 'already' and changes nothing.
export function lockIn(s: board_state, ci: number): { state: board_state; result: lock_result } {
    const c = s.categories[ci];
    if (!c || c.locked) return { state: s, result: 'locked' };
    if (!isFull(c)) return { state: s, result: 'not-full' };

    const wrong = wrongCount(c);
    if (wrong === 0) {
        const categories = s.categories.map((x, i) => i === ci ? { ...x, locked: true } : x);
        return { state: { ...s, categories }, result: 'correct' };
    }

    const key = guessKey(ci, c);
    if (s.tried.includes(key)) return { state: s, result: 'already' };

    const returned = c.slots.filter(t => !c.pinned.includes(t));
    const categories = s.categories.map((x, i) =>
        i === ci ? { ...x, slots: x.slots.filter(t => x.pinned.includes(t)) } : x);
    return {
        state: {
            ...s,
            categories,
            pool: [...s.pool, ...returned],
            hearts: Math.max(0, s.hearts - 1),
            tried: [...s.tried, key]
        },
        result: wrong === 1 ? 'one-away' : 'wrong'
    };
}

export function addHearts(s: board_state, n: number): board_state {
    return { ...s, hearts: s.hearts + n };
}

// Hint: place one correct tile into its category and pin it there. Prefers the
// first open category with the fewest correct tiles already in place, so the
// hint does real work. If that category is full, a wrong tile is bounced back to
// the pool to make room. Returns null when no hint applies (everything locked).
export function hint(s: board_state): { state: board_state; tile: string; category: number } | null {
    const open = s.categories
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => !c.locked && c.answer.some(t => !c.slots.includes(t) || !c.pinned.includes(t)));
    if (open.length === 0) return null;

    // A correct tile sitting unpinned in the right slot already counts as
    // placed; the hint looks for one that isn't there yet.
    const candidates = open
        .map(({ c, i }) => ({ c, i, missing: c.answer.filter(t => !c.slots.includes(t)) }))
        .filter(x => x.missing.length > 0);

    if (candidates.length === 0) {
        // Every open category already holds its full answer set unlocked — pin
        // one so the hint still visibly does something.
        const { c, i } = open[0];
        const tile = c.answer.find(t => !c.pinned.includes(t))!;
        const categories = s.categories.map((x, k) => k === i ? { ...x, pinned: [...x.pinned, tile] } : x);
        return { state: { ...s, categories }, tile, category: i };
    }

    candidates.sort((a, b) => b.missing.length - a.missing.length || a.i - b.i);
    const { i: ci, missing } = candidates[0];
    const tile = missing[0];

    let state = s;
    // Pull the tile out of wherever it is (a pinned tile is always in its own
    // category, so it can never be the one missing here).
    const from = categoryOf(state, tile);
    if (from >= 0) {
        state = {
            ...state,
            categories: state.categories.map((x, k) => k === from ? { ...x, slots: x.slots.filter(t => t !== tile) } : x),
            pool: [...state.pool, tile]
        };
    }
    // Make room by bouncing a wrong tile.
    const target = state.categories[ci];
    if (isFull(target)) {
        const bounce = target.slots.find(t => !target.answer.includes(t))!;
        state = {
            ...state,
            categories: state.categories.map((x, k) => k === ci ? { ...x, slots: x.slots.filter(t => t !== bounce) } : x),
            pool: [...state.pool, bounce]
        };
    }
    state = {
        ...state,
        categories: state.categories.map((x, k) =>
            k === ci ? { ...x, slots: [...x.slots, tile], pinned: [...x.pinned, tile] } : x),
        pool: state.pool.filter(t => t !== tile)
    };
    return { state, tile, category: ci };
}
