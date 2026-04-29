import { describe, expect, it } from 'vitest';
import { MODES, getMode } from '../src/game/modes.js';

describe('modes', () => {
  it('checks answers for press-key-by-staff-note', () => {
    const mode = MODES['press-key-by-staff-note'];
    const question = mode.createQuestion({ midi: 60 });

    expect(mode.checkAnswer(question, 60)).toBe(true);
    expect(mode.checkAnswer(question, 61)).toBe(false);
    expect(mode.renderTarget(question)).toBe(question);
  });

  it('supports a second mode contract without changing the first one', () => {
    const modes = {
      ...MODES,
      'test-mode': {
        createQuestion: note => ({ expected: note.midi + 1 }),
        checkAnswer: (question, midi) => midi === question.expected,
        renderTarget: question => question,
      },
    };

    const mode = getMode(modes, 'test-mode');
    const question = mode.createQuestion({ midi: 60 });

    expect(mode.checkAnswer(question, 61)).toBe(true);
  });
});
