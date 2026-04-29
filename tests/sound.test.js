import { describe, expect, it } from 'vitest';
import { midiToFrequency, playNote, setSoundEnabled } from '../src/services/sound.js';

describe('sound', () => {
  it('converts MIDI to frequency', () => {
    expect(midiToFrequency(69)).toBe(440);
  });

  it('falls back safely without WebAudio', () => {
    setSoundEnabled(true);

    expect(playNote(60)).toBe(false);
  });

  it('can be disabled explicitly', () => {
    setSoundEnabled(false);

    expect(playNote(60)).toBe(false);
    setSoundEnabled(true);
  });
});
