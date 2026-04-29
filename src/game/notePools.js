import { buildNote, diatonicIndex, whiteStepsOrder } from './noteModel.js';

export const sharpableSteps = new Set(['C', 'D', 'F', 'G', 'A']);
export const flattableSteps = new Set(['D', 'E', 'G', 'A', 'B']);

export function comparePitch(aStep, aOct, bStep, bOct) {
  return diatonicIndex(aStep, aOct) - diatonicIndex(bStep, bOct);
}

export function* iterateNaturalRange(startStep, startOctave, endStep, endOctave) {
  let octave = startOctave;
  let step = startStep;
  while (true) {
    yield { step, octave };
    if (step === endStep && octave === endOctave) break;
    const idx = whiteStepsOrder.indexOf(step);
    if (idx === whiteStepsOrder.length - 1) {
      step = whiteStepsOrder[0];
      octave += 1;
    } else {
      step = whiteStepsOrder[idx + 1];
    }
  }
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildNaturalClefRange(clef, startStep, startOctave, endStep, endOctave, accidentalMode = 'plain') {
  const notes = [];
  for (const item of iterateNaturalRange(startStep, startOctave, endStep, endOctave)) {
    const accidental = accidentalMode === 'natural-sign' ? 'n' : null;
    notes.push(buildNote(item.step, accidental, item.octave, clef));
  }
  return notes;
}

export function buildAccidentalClefRange(clef, startStep, startOctave, endStep, endOctave, includeNatural = true, includeSharps = true, includeFlats = true, includeNaturalSign = false) {
  const notes = [];
  for (const item of iterateNaturalRange(startStep, startOctave, endStep, endOctave)) {
    if (includeNatural) notes.push(buildNote(item.step, null, item.octave, clef));
    if (includeNaturalSign) notes.push(buildNote(item.step, 'n', item.octave, clef));
    if (includeSharps && sharpableSteps.has(item.step)) notes.push(buildNote(item.step, '#', item.octave, clef));
    if (includeFlats && flattableSteps.has(item.step)) notes.push(buildNote(item.step, 'b', item.octave, clef));
  }
  return notes.filter(note => note.midi >= 45 && note.midi <= 88);
}
