import { describe, expect, it, vi } from 'vitest';
import { buildNote } from '../src/game/noteModel.js';
import { createStaffRenderer, getNoteY } from '../src/ui/staffCanvas.js';

function createCanvasMock() {
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    restore: vi.fn(),
  };

  return {
    canvas: {
      width: 1200,
      height: 430,
      getContext: () => ctx,
    },
    ctx,
  };
}

describe('staffCanvas', () => {
  it('calculates note y positions', () => {
    const note = buildNote('E', null, 4, 'treble');

    expect(getNoteY(note, 86, 34)).toBe(222);
  });

  it('draws an empty staff', () => {
    const { canvas, ctx } = createCanvasMock();
    const renderer = createStaffRenderer(canvas);

    renderer.draw(null, { clefName: 'treble' });

    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('draws a note', () => {
    const { canvas, ctx } = createCanvasMock();
    const renderer = createStaffRenderer(canvas);

    renderer.draw(buildNote('C', '#', 4, 'treble'), { levelKey: 'easy' });

    expect(ctx.ellipse).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });
});
