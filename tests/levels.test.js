import { describe, expect, it } from 'vitest';
import { LEVELS, buildPoolForLevel } from '../src/game/levels.js';

describe('levels', () => {
  it('defines a mode for every level', () => {
    Object.values(LEVELS).forEach(level => {
      expect(level.mode).toBeTruthy();
    });
  });

  it('defines a title for every level', () => {
    Object.values(LEVELS).forEach(level => {
      expect(level.title).toBeTruthy();
    });
  });

  it('builds a non-empty pool for every level', () => {
    Object.values(LEVELS).forEach(level => {
      expect(buildPoolForLevel(level)).not.toHaveLength(0);
    });
  });

  it('keeps every level pool in the playable MIDI range', () => {
    const notes = Object.values(LEVELS).flatMap(level => buildPoolForLevel(level));

    expect(notes.every(note => note.midi >= 45 && note.midi <= 88)).toBe(true);
  });

  it('uses both bass and treble clefs on the hard level', () => {
    const clefs = new Set(buildPoolForLevel(LEVELS.hard).map(note => note.clef));

    expect(clefs.has('bass')).toBe(true);
    expect(clefs.has('treble')).toBe(true);
  });
});
