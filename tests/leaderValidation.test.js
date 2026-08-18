import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/levels.js';
import { normalizeLeaderList, normalizeLeaderResult, normalizePlayerName } from '../src/services/leaderValidation.js';

describe('leaderValidation', () => {
  it('normalizes player names', () => {
    expect(normalizePlayerName('  Ada   Lovelace  ')).toBe('Ada Lovelace');
  });

  it('accepts valid leaderboard results', () => {
    expect(normalizeLeaderResult({
      name: 'Ada',
      score: 12,
      date: '2026-01-01T00:00:00.000Z',
      level: 'easy',
    }, LEVELS)).toEqual({
      name: 'Ada',
      score: 12,
      date: '2026-01-01T00:00:00.000Z',
      level: 'easy',
    });
  });

  it('rejects unknown levels and unreasonable scores', () => {
    expect(normalizeLeaderResult({ name: 'Ada', score: 1, date: '2026-01-01T00:00:00.000Z', level: 'nope' }, LEVELS)).toBeNull();
    expect(normalizeLeaderResult({ name: 'Ada', score: 999, date: '2026-01-01T00:00:00.000Z', level: 'easy' }, LEVELS)).toBeNull();
  });

  it('filters invalid entries from lists', () => {
    const list = normalizeLeaderList([
      { name: 'Ada', score: 1, date: '2026-01-01T00:00:00.000Z', level: 'easy' },
      { name: '', score: 1, date: '2026-01-01T00:00:00.000Z', level: 'easy' },
    ], LEVELS);

    expect(list).toHaveLength(1);
  });
});
