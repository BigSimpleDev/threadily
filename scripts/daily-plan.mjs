// Pure planning logic for the daily schedule, split out of build-daily.mjs so
// node --test can exercise it without touching the real files.

const DAY_MS = 86400000;

// Weekday (0 = Sun … 6 = Sat) → the star ratings that day draws from.
// Mon/Tue easy, Wed/Thu middle, Fri–Sun hard.
export const WEEKDAY_RATINGS = [[4, 5], [1, 2], [1, 2], [3], [3], [4, 5], [4, 5]];

// How many recent days a recycled puzzle must stay clear of once every id has
// been used once.
const RECYCLE_GAP = 365;

// mulberry32: tiny seeded PRNG, so a given history always extends the same way.
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffle(items, random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// Weekday of day number n (1-based) for an epoch 'YYYY-MM-DD'.
export function weekdayOf(epoch, n) {
    const [y, m, d] = epoch.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d) + (n - 1) * DAY_MS).getUTCDay();
}

// Returns `existing` with entries appended until it holds `days` ids. Existing
// entries are never touched. `puzzles` is [{ id, rating }] for main packs only.
export function extendSchedule(existing, puzzles, epoch, days, seed = 0x7448) {
    const out = [...existing];
    if (out.length >= days || puzzles.length === 0) return out;
    // Fixed seed (offset by history length): the same input always appends the
    // same entries, so re-running the script is a no-op.
    const random = rng(seed + out.length);
    const rating = new Map(puzzles.map(p => [p.id, p.rating]));
    const used = new Set(out);
    let fresh = shuffle(puzzles.map(p => p.id).filter(id => !used.has(id)), random);

    while (out.length < days) {
        if (fresh.length === 0) {
            // Every puzzle has run once: recycle, keeping clear of the last year.
            const recent = new Set(out.slice(-RECYCLE_GAP));
            fresh = shuffle(puzzles.map(p => p.id).filter(id => !recent.has(id)), random);
            if (fresh.length === 0) fresh = shuffle(puzzles.map(p => p.id), random);
        }
        const want = WEEKDAY_RATINGS[weekdayOf(epoch, out.length + 1)];
        let k = fresh.findIndex(id => want.includes(rating.get(id)));
        // Bucket ran dry: take any rating.
        if (k < 0) k = 0;
        out.push(fresh[k]);
        fresh.splice(k, 1);
    }
    return out;
}
