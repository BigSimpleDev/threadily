import { puzzle } from '../entities/entities';
import {
    addHearts, board_state, categoryOf, hint, isWon, lockIn, newBoard, place, shuffle, unplace
} from './board';

const P: puzzle = {
    id: 7, rating: 3,
    categories: [
        { name: 'Card games', tiles: ['Hearts', 'Spades', 'Rummy', 'Solitaire'] },
        { name: 'Tree parts', tiles: ['Trunk', 'Bark', 'Branch', 'Root'] },
        { name: 'Yoga poses', tiles: ['Cobra', 'Warrior', 'Tree', 'Crow'] }
    ]
};

function fill(s: board_state, ci: number, tiles: string[]): board_state {
    return tiles.reduce((acc, t) => place(acc, t, ci), s);
}

describe('board rules', () => {
    let s: board_state;

    beforeEach(() => {
        s = newBoard(P, 3);
    });

    describe('newBoard + shuffle', () => {
        it('puts every tile in the pool once, with empty categories', () => {
            expect(s.pool.length).toBe(12);
            expect(new Set(s.pool).size).toBe(12);
            expect(s.categories.every(c => c.slots.length === 0 && !c.locked)).toBeTrue();
            expect(s.hearts).toBe(3);
        });

        it('shuffle is a permutation and leaves the input untouched', () => {
            const src = [1, 2, 3, 4, 5, 6];
            const out = shuffle(src, () => 0);
            expect(out.sort()).toEqual([1, 2, 3, 4, 5, 6]);
            expect(src).toEqual([1, 2, 3, 4, 5, 6]);
        });

        it('shuffle actually reorders with a non-trivial rng', () => {
            const out = shuffle([1, 2, 3, 4], () => 0);
            expect(out).not.toEqual([1, 2, 3, 4]);
        });
    });

    describe('place / unplace', () => {
        it('moves a tile from the pool into a category', () => {
            s = place(s, 'Hearts', 0);
            expect(s.categories[0].slots).toEqual(['Hearts']);
            expect(s.pool).not.toContain('Hearts');
        });

        it('moves a tile between open categories', () => {
            s = place(s, 'Tree', 1);
            s = place(s, 'Tree', 2);
            expect(categoryOf(s, 'Tree')).toBe(2);
            expect(s.categories[1].slots).toEqual([]);
        });

        it('refuses a full category', () => {
            s = fill(s, 0, ['Hearts', 'Spades', 'Rummy', 'Solitaire']);
            const before = s;
            s = place(s, 'Trunk', 0);
            expect(s).toBe(before);
        });

        it('unplace returns the tile to the end of the pool', () => {
            s = place(s, 'Hearts', 0);
            s = unplace(s, 'Hearts');
            expect(s.categories[0].slots).toEqual([]);
            expect(s.pool[s.pool.length - 1]).toBe('Hearts');
        });
    });

    describe('lockIn', () => {
        it('refuses a category that is not full', () => {
            s = place(s, 'Hearts', 0);
            expect(lockIn(s, 0).result).toBe('not-full');
        });

        it('locks a correct category and freezes its tiles', () => {
            s = fill(s, 0, ['Hearts', 'Spades', 'Rummy', 'Solitaire']);
            const r = lockIn(s, 0);
            expect(r.result).toBe('correct');
            expect(r.state.categories[0].locked).toBeTrue();
            expect(r.state.hearts).toBe(3);
            // Frozen: can't pull a tile back out or drop one in.
            expect(unplace(r.state, 'Hearts')).toBe(r.state);
            expect(place(r.state, 'Hearts', 1)).toBe(r.state);
        });

        it('a wrong set costs a heart and returns the tiles to the pool', () => {
            s = fill(s, 1, ['Trunk', 'Hearts', 'Cobra', 'Tree']);
            const r = lockIn(s, 1);
            expect(r.result).toBe('wrong');
            expect(r.state.hearts).toBe(2);
            expect(r.state.categories[1].slots).toEqual([]);
            expect(r.state.pool.length).toBe(12);
        });

        it('reports one-away when exactly one tile is wrong (still costs the heart)', () => {
            s = fill(s, 1, ['Trunk', 'Bark', 'Branch', 'Tree']);
            const r = lockIn(s, 1);
            expect(r.result).toBe('one-away');
            expect(r.state.hearts).toBe(2);
        });

        it('a repeated wrong set says already-guessed and costs nothing', () => {
            s = fill(s, 1, ['Trunk', 'Bark', 'Branch', 'Tree']);
            s = lockIn(s, 1).state;
            // Same four, different placement order.
            s = fill(s, 1, ['Tree', 'Branch', 'Bark', 'Trunk']);
            const r = lockIn(s, 1);
            expect(r.result).toBe('already');
            expect(r.state.hearts).toBe(2);
            expect(r.state.categories[1].slots.length).toBe(4);
        });

        it('the same tiles in a different category are a fresh guess', () => {
            s = fill(s, 1, ['Trunk', 'Bark', 'Branch', 'Tree']);
            s = lockIn(s, 1).state;
            s = fill(s, 2, ['Trunk', 'Bark', 'Branch', 'Tree']);
            expect(lockIn(s, 2).result).toBe('wrong');
        });

        it('hearts never go below zero', () => {
            s = { ...s, hearts: 0 };
            s = fill(s, 1, ['Trunk', 'Bark', 'Branch', 'Tree']);
            expect(lockIn(s, 1).state.hearts).toBe(0);
        });
    });

    describe('addHearts (ad refill)', () => {
        it('adds hearts and keeps the board', () => {
            s = place({ ...s, hearts: 0 }, 'Hearts', 0);
            const r = addHearts(s, 3);
            expect(r.hearts).toBe(3);
            expect(r.categories[0].slots).toEqual(['Hearts']);
        });
    });

    describe('hint', () => {
        it('places and pins one correct tile', () => {
            const r = hint(s)!;
            expect(r).not.toBeNull();
            const c = r.state.categories[r.category];
            expect(c.answer).toContain(r.tile);
            expect(c.slots).toContain(r.tile);
            expect(c.pinned).toEqual([r.tile]);
            expect(r.state.pool).not.toContain(r.tile);
            // Pinned tiles can't be removed.
            expect(unplace(r.state, r.tile)).toBe(r.state);
        });

        it('pulls the tile out of a wrong category', () => {
            // Every Tree-parts tile is placed elsewhere except Root.
            s = fill(s, 2, ['Trunk', 'Bark', 'Branch']);
            s = fill(s, 0, ['Hearts', 'Spades', 'Rummy', 'Solitaire']);
            s = lockIn(s, 0).state;
            const r = hint(s)!;
            // Tree parts has 4 missing, the most → hint targets it.
            expect(r.category).toBe(1);
            expect(categoryOf(r.state, r.tile)).toBe(1);
        });

        it('fixes a full wrong row by bouncing its wrong tile', () => {
            // Make tree parts the only open category with missing tiles.
            s = fill(s, 0, ['Hearts', 'Spades', 'Rummy', 'Solitaire']);
            s = lockIn(s, 0).state;
            s = fill(s, 2, ['Cobra', 'Warrior', 'Crow', 'Root']);
            s = fill(s, 1, ['Trunk', 'Bark', 'Branch', 'Tree']);
            // Yoga misses Tree (1), Tree parts misses Root (1); tie → lower index (1).
            const r = hint(s)!;
            expect(r.category).toBe(1);
            expect(r.tile).toBe('Root');
            const tp = r.state.categories[1];
            expect(tp.slots).toContain('Root');
            expect(tp.slots.length).toBe(4);
            expect(tp.slots).not.toContain('Tree');
            expect(r.state.pool).toContain('Tree');
        });

        it('returns null once everything is locked', () => {
            for (let ci = 0; ci < 3; ci++) {
                s = fill(s, ci, P.categories[ci].tiles);
                s = lockIn(s, ci).state;
            }
            expect(hint(s)).toBeNull();
        });
    });

    describe('isWon', () => {
        it('is true only when every category is locked', () => {
            expect(isWon(s)).toBeFalse();
            for (let ci = 0; ci < 3; ci++) {
                s = fill(s, ci, P.categories[ci].tiles);
                s = lockIn(s, ci).state;
            }
            expect(isWon(s)).toBeTrue();
        });
    });
});
