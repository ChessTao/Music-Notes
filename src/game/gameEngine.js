import { buildPoolForLevel } from './levels.js';
import { MODES, getMode } from './modes.js';

export function createGameEngine({ levels, poolBuilder = buildPoolForLevel, modes = MODES } = {}) {
  const state = {
    selectedLevel: null,
    score: 0,
    currentNote: null,
    questionQueue: [],
    lastHardClef: 'bass',
    isPlaying: false,
  };

  function snapshot() {
    return {
      ...state,
      questionQueue: [...state.questionQueue],
    };
  }

  function refillQuestionQueue() {
    if (!state.selectedLevel) return;
    state.questionQueue = poolBuilder(levels[state.selectedLevel], state);
  }

  function getCurrentMode() {
    const level = levels[state.selectedLevel];
    return getMode(modes, level.mode);
  }

  function startRound(levelKey, options = {}) {
    state.selectedLevel = levelKey;
    state.score = 0;
    state.currentNote = null;
    state.questionQueue = [];
    state.isPlaying = false;
    if (options.lastHardClef) {
      state.lastHardClef = options.lastHardClef;
    }
    return snapshot();
  }

  function startAnswering() {
    state.isPlaying = true;
    return snapshot();
  }

  function stopRound() {
    state.isPlaying = false;
    state.currentNote = null;
    state.questionQueue = [];
    return snapshot();
  }

  function nextQuestion() {
    if (!state.questionQueue.length) refillQuestionQueue();
    const note = state.questionQueue.shift() || null;
    state.currentNote = note ? getCurrentMode().createQuestion(note) : null;
    if (state.selectedLevel === 'hard' && state.currentNote) {
      state.lastHardClef = state.currentNote.clef;
    }
    return state.currentNote;
  }

  function submitAnswer(midi) {
    if (!state.isPlaying || !state.currentNote) {
      return { accepted: false, correct: false, score: state.score };
    }

    const correct = getCurrentMode().checkAnswer(state.currentNote, midi);
    if (correct) {
      state.score += 1;
    }

    return { accepted: true, correct, score: state.score, note: state.currentNote };
  }

  return {
    getState: snapshot,
    startRound,
    startAnswering,
    stopRound,
    nextQuestion,
    submitAnswer,
  };
}
