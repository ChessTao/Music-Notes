import { buildAccidentalClefRange, buildNaturalClefRange, shuffle } from './notePools.js';

export const LEVELS = {
  easiest: {
    key: 'easiest',
    title: 'Первый',
    hints: true,
    mode: 'press-key-by-staff-note',
    clefs: ['treble'],
    ranges: {
      treble: { startStep: 'B', startOctave: 3, endStep: 'F', endOctave: 5 },
    },
    accidentals: {
      natural: true,
      sharps: false,
      flats: false,
      naturalSign: false,
    },
    alternateClefs: false,
  },
  easy: {
    key: 'easy',
    title: 'Второй',
    hints: true,
    mode: 'press-key-by-staff-note',
    clefs: ['treble'],
    ranges: {
      treble: { startStep: 'F', startOctave: 3, endStep: 'E', endOctave: 6 },
    },
    accidentals: {
      natural: true,
      sharps: true,
      flats: true,
      naturalSign: false,
    },
    alternateClefs: false,
  },
  medium: {
    key: 'medium',
    title: 'Третий',
    hints: false,
    mode: 'press-key-by-staff-note',
    clefs: ['bass'],
    ranges: {
      bass: { startStep: 'A', startOctave: 2, endStep: 'B', endOctave: 3 },
    },
    accidentals: {
      natural: true,
      sharps: false,
      flats: false,
      naturalSign: false,
    },
    alternateClefs: false,
  },
  hard: {
    key: 'hard',
    title: 'Четвёртый',
    hints: false,
    mode: 'press-key-by-staff-note',
    clefs: ['treble', 'bass'],
    ranges: {
      treble: { startStep: 'E', startOctave: 4, endStep: 'F', endOctave: 5 },
      bass: { startStep: 'G', startOctave: 2, endStep: 'A', endOctave: 3 },
    },
    accidentals: {
      natural: false,
      sharps: true,
      flats: true,
      naturalSign: true,
    },
    alternateClefs: true,
  },
};

function buildClefPool(level, clef) {
  const range = level.ranges[clef];
  const accidentals = level.accidentals;

  if (!accidentals.sharps && !accidentals.flats && !accidentals.naturalSign) {
    const mode = accidentals.natural ? 'plain' : 'natural-sign';
    return buildNaturalClefRange(clef, range.startStep, range.startOctave, range.endStep, range.endOctave, mode);
  }

  return buildAccidentalClefRange(
    clef,
    range.startStep,
    range.startOctave,
    range.endStep,
    range.endOctave,
    accidentals.natural,
    accidentals.sharps,
    accidentals.flats,
    accidentals.naturalSign,
  );
}

function alternatePools(poolsByClef, clefs, lastClef) {
  const maxLen = Math.max(...clefs.map(clef => poolsByClef[clef].length));
  const notes = [];
  let nextClef = lastClef === clefs[0] ? clefs[1] : clefs[0];

  for (let i = 0; i < maxLen; i += 1) {
    const first = nextClef;
    const second = first === clefs[0] ? clefs[1] : clefs[0];
    if (poolsByClef[first][i]) notes.push(poolsByClef[first][i]);
    if (poolsByClef[second][i]) notes.push(poolsByClef[second][i]);
    nextClef = nextClef === clefs[0] ? clefs[1] : clefs[0];
  }

  return notes;
}

export function buildPoolForLevel(level, state = {}) {
  const resolvedLevel = typeof level === 'string' ? LEVELS[level] : level;
  if (!resolvedLevel) {
    throw new Error(`Level "${level}" was not found.`);
  }

  const poolsByClef = Object.fromEntries(
    resolvedLevel.clefs.map(clef => [clef, shuffle(buildClefPool(resolvedLevel, clef))]),
  );

  if (resolvedLevel.alternateClefs) {
    return alternatePools(poolsByClef, resolvedLevel.clefs, state.lastHardClef);
  }

  return shuffle(resolvedLevel.clefs.flatMap(clef => poolsByClef[clef]));
}
