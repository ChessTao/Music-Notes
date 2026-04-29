import { describe, expect, it } from 'vitest';
import { createLocalLeaderStore, sortLeaders } from '../src/services/localLeaders.js';

describe('localLeaders', () => {
  it('sorts by score and then older date', () => {
    const leaders = sortLeaders([
      { score: 1, date: '2026-01-02T00:00:00.000Z' },
      { score: 2, date: '2026-01-02T00:00:00.000Z' },
      { score: 2, date: '2026-01-01T00:00:00.000Z' },
    ]);

    expect(leaders.map(item => item.date)).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-01-02T00:00:00.000Z',
      '2026-01-02T00:00:00.000Z',
    ]);
  });

  it('loads and saves local leaders', () => {
    const storage = new Map();
    const store = createLocalLeaderStore({
      getItem: key => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    }, 'leaders');

    store.save([{ name: 'Ada', score: 3 }]);

    expect(store.load()).toEqual([{ name: 'Ada', score: 3 }]);
  });
});
