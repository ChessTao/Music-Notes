export const naturalMapRu = {
  C: 'до',
  D: 'ре',
  E: 'ми',
  F: 'фа',
  G: 'соль',
  A: 'ля',
  B: 'си',
};

export const octaveLabelsRu = {
  2: 'большая',
  3: 'малая',
  4: 'первая',
  5: 'вторая',
  6: 'третья',
};

export const semitones = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export const whiteStepsOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export const letterIndex = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

export function diatonicIndex(step, octave) {
  return octave * 7 + letterIndex[step];
}

export function midiValue(step, accidental, octave) {
  let midi = 12 * (octave + 1) + semitones[step];
  if (accidental === '#') midi += 1;
  if (accidental === 'b') midi -= 1;
  return midi;
}

export function buildRuLabel(step, accidental) {
  const base = naturalMapRu[step];
  if (accidental === '#') return `${base}♯`;
  if (accidental === 'b') return `${base}♭`;
  if (accidental === 'n') return `${base}♮`;
  return base;
}

export function buildNote(step, accidental, octave, clef) {
  return {
    id: `${clef}-${step}${accidental || ''}${octave}`,
    step,
    accidental,
    octave,
    midi: midiValue(step, accidental, octave),
    clef,
    labelRu: buildRuLabel(step, accidental),
    noteIndex: diatonicIndex(step, octave),
  };
}
