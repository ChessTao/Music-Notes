import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/game/levels.js';
import { createGameEngine } from '../src/game/gameEngine.js';

const testNote = { midi: 60, clef: 'treble' };

function createTestEngine() {
  return createGameEngine({
    levels: LEVELS,
    poolBuilder: () => [testNote],
  });
}

describe('gameEngine', () => {
  it('starts a round', () => {
    const engine = createTestEngine();
    const state = engine.startRound('easiest');

    expect(state.selectedLevel).toBe('easiest');
    expect(state.score).toBe(0);
    expect(state.isPlaying).toBe(false);
  });

  it('returns the next question', () => {
    const engine = createTestEngine();
    engine.startRound('easiest');

    expect(engine.nextQuestion()).toEqual(testNote);
  });

  it('scores a correct answer', () => {
    const engine = createTestEngine();
    engine.startRound('easiest');
    engine.startAnswering();
    engine.nextQuestion();

    expect(engine.submitAnswer(60)).toMatchObject({ accepted: true, correct: true, score: 1 });
  });

  it('does not score a wrong answer', () => {
    const engine = createTestEngine();
    engine.startRound('easiest');
    engine.startAnswering();
    engine.nextQuestion();

    expect(engine.submitAnswer(61)).toMatchObject({ accepted: true, correct: false, score: 0 });
  });

  it('refills the question queue', () => {
    const engine = createTestEngine();
    engine.startRound('easiest');
    engine.nextQuestion();

    expect(engine.nextQuestion()).toEqual(testNote);
  });

  it('stops a round', () => {
    const engine = createTestEngine();
    engine.startRound('easiest');
    engine.startAnswering();

    expect(engine.stopRound()).toMatchObject({ isPlaying: false, currentNote: null, questionQueue: [] });
  });
});
