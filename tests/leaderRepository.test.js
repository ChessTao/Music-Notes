import { describe, expect, it, vi } from 'vitest';
import { LEVELS } from '../src/game/levels.js';
import { createLeaderRepository } from '../src/services/leaderRepository.js';

function createLocalStore(initial = []) {
  let leaders = initial;
  return {
    load: () => leaders,
    save: next => {
      leaders = next;
    },
    clear: vi.fn(),
  };
}

const result = {
  name: 'Ada',
  score: 3,
  date: '2026-01-01T00:00:00.000Z',
  level: 'easiest',
};

describe('leaderRepository', () => {
  it('saves locally and remotely when ready', async () => {
    const remoteStore = {
      isReady: () => true,
      save: vi.fn(),
      load: vi.fn(),
    };
    const repository = createLeaderRepository({
      localStore: createLocalStore(),
      remoteStore,
      levels: LEVELS,
    });

    const state = await repository.save(result);

    expect(state.leaders).toHaveLength(1);
    expect(state.remote).toBe('saved');
    expect(remoteStore.save).toHaveBeenCalledOnce();
  });

  it('falls back to local leaders without remote store', async () => {
    const repository = createLeaderRepository({
      localStore: createLocalStore([result]),
      remoteStore: null,
      levels: LEVELS,
    });

    await expect(repository.getTop({ syncRemote: true })).resolves.toMatchObject({ source: 'local' });
  });

  it('keeps local result when remote save fails', async () => {
    const remoteStore = {
      isReady: () => true,
      save: vi.fn().mockRejectedValue(new Error('network')),
      load: vi.fn(),
    };
    const repository = createLeaderRepository({
      localStore: createLocalStore(),
      remoteStore,
      levels: LEVELS,
    });

    const state = await repository.save(result);

    expect(state).toMatchObject({ accepted: true, remote: 'failed' });
    expect(state.leaders).toHaveLength(1);
  });

  it('rejects invalid results', async () => {
    const repository = createLeaderRepository({
      localStore: createLocalStore(),
      remoteStore: null,
      levels: LEVELS,
    });

    const state = await repository.save({ ...result, level: 'missing' });

    expect(state).toMatchObject({ accepted: false, remote: 'skipped', leaders: [] });
  });
});
