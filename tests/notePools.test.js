import { describe, expect, it } from 'vitest';
import {
  buildAccidentalClefRange,
  buildNaturalClefRange,
  flattableSteps,
  sharpableSteps,
} from '../src/game/notePools.js';

describe('notePools', () => {
  it('keeps generated accidental ranges in the playable MIDI range', () => {
    const notes = buildAccidentalClefRange('treble', 'F', 3, 'E', 6, true, true, true, false);

    expect(notes.every(note => note.midi >= 45 && note.midi <= 88)).toBe(true);
  });

  it('builds natural ranges without random accidentals', () => {
    const notes = buildNaturalClefRange('treble', 'B', 3, 'F', 5);

    expect(notes.every(note => note.accidental === null)).toBe(true);
  });

  it('adds sharps and flats only to allowed note steps', () => {
    const notes = buildAccidentalClefRange('treble', 'F', 3, 'E', 6, true, true, true, false);
    const sharps = notes.filter(note => note.accidental === '#');
    const flats = notes.filter(note => note.accidental === 'b');

    expect(sharps.length).toBeGreaterThan(0);
    expect(flats.length).toBeGreaterThan(0);
    expect(sharps.every(note => sharpableSteps.has(note.step))).toBe(true);
    expect(flats.every(note => flattableSteps.has(note.step))).toBe(true);
  });
});
