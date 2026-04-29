import { describe, expect, it } from 'vitest';
import { buildNote } from '../src/game/noteModel.js';
import { formatHint, renderHint } from '../src/ui/hints.js';

describe('hints', () => {
  it('formats hints when a level allows them', () => {
    const note = buildNote('C', null, 4, 'treble');

    expect(formatHint(note, { hints: true })).toBe('до (первая октава, скрипичный ключ)');
  });

  it('hides hints when a level disables them', () => {
    const note = buildNote('A', null, 2, 'bass');

    expect(formatHint(note, { hints: false })).toBe('Подсказок на этом уровне нет.');
  });

  it('renders formatted hint text into an element', () => {
    const element = { textContent: '' };

    renderHint(element, null, { hints: true });

    expect(element.textContent).toBe('');
  });
});
