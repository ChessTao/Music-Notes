import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCountdown, startRoundTimer } from '../src/app/timers.js';

describe('timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks countdown and finishes', () => {
    const ticks = [];
    const onFinish = vi.fn();

    startCountdown(3, value => ticks.push(value), onFinish);
    vi.advanceTimersByTime(3000);

    expect(ticks).toEqual([3, 2, 1]);
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('stops countdown explicitly', () => {
    const ticks = [];
    const onFinish = vi.fn();
    const timer = startCountdown(3, value => ticks.push(value), onFinish);

    timer.stop();
    vi.advanceTimersByTime(3000);

    expect(ticks).toEqual([3]);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('ticks round timer and finishes at zero', () => {
    const ticks = [];
    const onFinish = vi.fn();

    startRoundTimer(2, value => ticks.push(value), onFinish);
    vi.advanceTimersByTime(2000);

    expect(ticks).toEqual([1, 0]);
    expect(onFinish).toHaveBeenCalledOnce();
  });
});
