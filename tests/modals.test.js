import { describe, expect, it } from 'vitest';
import { createModalController } from '../src/ui/modals.js';

describe('modals', () => {
  it('shows and hides result modal', () => {
    const resultOverlay = { style: { display: 'none' } };
    const resultText = { textContent: '' };
    const postGameOverlay = { style: { display: 'none' } };
    const modals = createModalController({ resultOverlay, resultText, postGameOverlay });

    modals.showResult(7);
    expect(resultOverlay.style.display).toBe('flex');
    expect(resultText.textContent).toBe('Ваш результат — 7');

    modals.hideResult();
    expect(resultOverlay.style.display).toBe('none');
  });

  it('shows and hides post-game modal', () => {
    const postGameOverlay = { style: { display: 'none' } };
    const modals = createModalController({
      resultOverlay: { style: { display: 'none' } },
      resultText: { textContent: '' },
      postGameOverlay,
    });

    modals.showPostGame();
    expect(postGameOverlay.style.display).toBe('flex');

    modals.hidePostGame();
    expect(postGameOverlay.style.display).toBe('none');
  });
});
