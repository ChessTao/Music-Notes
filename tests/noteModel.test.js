import { describe, expect, it } from 'vitest';
import { buildNote, buildRuLabel, midiValue } from '../src/game/noteModel.js';

describe('noteModel', () => {
  it('calculates MIDI for C4', () => {
    expect(midiValue('C', null, 4)).toBe(60);
  });

  it('calculates MIDI for A4', () => {
    expect(midiValue('A', null, 4)).toBe(69);
  });

  it('calculates sharps', () => {
    expect(midiValue('C', '#', 4)).toBe(61);
    expect(buildRuLabel('C', '#')).toBe('до♯');
  });

  it('calculates flats', () => {
    expect(midiValue('D', 'b', 4)).toBe(61);
    expect(buildRuLabel('D', 'b')).toBe('ре♭');
  });

  it('keeps natural sign as a label without changing pitch', () => {
    const note = buildNote('F', 'n', 4, 'treble');

    expect(note.midi).toBe(65);
    expect(note.labelRu).toBe('фа♮');
  });
});
