import { buildShareText, dailyShareHeader, puzzleShareHeader } from './share.service';

describe('buildShareText', () => {
  const base = { attempts: ['hit', 'oneAway', 'hit', 'miss', 'hit'] as const, hints: 0, adContinues: 0 };

  it('won: squares, hearts left, link', () => {
    expect(buildShareText(dailyShareHeader(42), { ...base, attempts: [...base.attempts], status: 'won', heartsLeft: 1 }))
      .toBe('Threadily Daily #42 🧵\n🟩🟨🟩🟥🟩\n❤️🖤🖤\nbigsimple.dev/games/threadily');
  });

  it('lost: the hearts line counts misses', () => {
    expect(buildShareText(dailyShareHeader(3), {
      status: 'lost', attempts: ['miss', 'oneAway', 'hit', 'miss'], heartsLeft: 0, hints: 0, adContinues: 0
    })).toBe('Threadily Daily #3 🧵\n🟥🟨🟩🟥\n✖ 3 misses\nbigsimple.dev/games/threadily');
  });

  it('hints and ad continues are shown', () => {
    const t = buildShareText(dailyShareHeader(42), {
      status: 'won', attempts: ['hit', 'miss', 'miss', 'miss', 'hit'], heartsLeft: 2, hints: 1, adContinues: 1
    });
    expect(t.split('\n')[2]).toBe('❤️❤️🖤 · 💡1 · +❤️');
    const t2 = buildShareText(dailyShareHeader(42), {
      status: 'lost', attempts: ['miss'], heartsLeft: 0, hints: 2, adContinues: 2
    });
    expect(t2.split('\n')[2]).toBe('✖ 1 miss · 💡2 · +❤️×2');
  });

  it('never contains tile or category text — only the header, squares, and link', () => {
    const t = buildShareText(puzzleShareHeader(117, 3), {
      status: 'won', attempts: ['hit', 'hit', 'hit', 'hit'], heartsLeft: 3, hints: 0, adContinues: 0
    });
    expect(t).toBe('Threadily #117 ★★★\n🟩🟩🟩🟩\n❤️❤️❤️\nbigsimple.dev/games/threadily');
  });
});
