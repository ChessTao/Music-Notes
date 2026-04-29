import { describe, expect, it } from 'vitest';
import { escapeHtml, renderLeaders } from '../src/ui/leadersView.js';

describe('leadersView', () => {
  it('escapes unsafe names', () => {
    expect(escapeHtml('<Ada&Co>')).toBe('&lt;Ada&amp;Co&gt;');
  });

  it('renders empty leader rows', () => {
    const body = { innerHTML: '' };

    renderLeaders({ easiest: body }, []);

    expect(body.innerHTML).toContain('Пока нет результатов');
  });
});
