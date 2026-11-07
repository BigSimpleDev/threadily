import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extendSchedule, weekdayOf, WEEKDAY_RATINGS } from './daily-plan.mjs';

const EPOCH = '2026-11-07'; // a Saturday
const puzzles = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, rating: (i % 5) + 1 }));

test('weekdayOf counts from the epoch', () => {
    assert.equal(weekdayOf(EPOCH, 1), 6);
    assert.equal(weekdayOf(EPOCH, 2), 0);
    assert.equal(weekdayOf(EPOCH, 3), 1);
});

test('re-running never changes existing indexes', () => {
    const first = extendSchedule([], puzzles, EPOCH, 100);
    const again = extendSchedule(first, puzzles, EPOCH, 100);
    assert.deepEqual(again, first);
    const longer = extendSchedule(first, puzzles, EPOCH, 300);
    assert.deepEqual(longer.slice(0, 100), first);
    assert.equal(longer.length, 300);
});

test('same input gives the same schedule', () => {
    assert.deepEqual(extendSchedule([], puzzles, EPOCH, 150), extendSchedule([], puzzles, EPOCH, 150));
});

test('no repeats until every puzzle has run', () => {
    const s = extendSchedule([], puzzles, EPOCH, 200);
    assert.equal(new Set(s).size, 200);
});

test('follows the weekday ramp while buckets last', () => {
    const rating = new Map(puzzles.map(p => [p.id, p.rating]));
    const s = extendSchedule([], puzzles, EPOCH, 21);
    s.forEach((id, i) => assert.ok(WEEKDAY_RATINGS[weekdayOf(EPOCH, i + 1)].includes(rating.get(id))));
});

test('only ever schedules the given ids', () => {
    const ids = new Set(puzzles.map(p => p.id));
    assert.ok(extendSchedule([], puzzles, EPOCH, 500).every(id => ids.has(id)));
});
