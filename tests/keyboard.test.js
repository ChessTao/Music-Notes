import { describe, expect, it, vi } from 'vitest';
import { buildKeyboardRange, createKeyboardController, isWhitePitchClass } from '../src/ui/keyboard.js';

function createElementMock() {
  return {
    className: '',
    style: {},
    dataset: {},
    addEventListener: vi.fn(),
    classList: {
      remove: vi.fn(),
    },
  };
}

describe('keyboard', () => {
  it('builds the playable keyboard range', () => {
    const keys = buildKeyboardRange();

    expect(keys[0].midi).toBe(45);
    expect(keys.at(-1).midi).toBe(88);
    expect(keys).toHaveLength(44);
  });

  it('detects white pitch classes', () => {
    expect(isWhitePitchClass(0)).toBe(true);
    expect(isWhitePitchClass(1)).toBe(false);
  });

  it('renders key buttons', () => {
    const originalDocument = globalThis.document;
    const children = [];
    globalThis.document = { createElement: () => createElementMock() };
    const root = {
      innerHTML: '',
      appendChild: key => children.push(key),
      querySelectorAll: () => [],
    };

    createKeyboardController(root, vi.fn()).render();
    globalThis.document = originalDocument;

    expect(children).toHaveLength(44);
    expect(children.some(key => key.className === 'white-key')).toBe(true);
    expect(children.some(key => key.className === 'black-key')).toBe(true);
  });
});
