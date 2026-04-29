import { octaveLabelsRu } from '../game/noteModel.js';

export function formatHint(note, level) {
  if (!note) return '';
  if (!level?.hints) {
    return 'Подсказок на этом уровне нет.';
  }

  const clefLabel = note.clef === 'treble' ? 'скрипичный' : 'басовый';
  return `${note.labelRu} (${octaveLabelsRu[note.octave]} октава, ${clefLabel} ключ)`;
}

export function renderHint(element, note, level) {
  element.textContent = formatHint(note, level);
}
