import { describe, expect, it, vi } from 'vitest';
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

describe('leaderRepository', () => {
  it('saves locally and remotely when ready', async () => {
    const remoteStore = {
      isReady: () => true,
      save: vi.fn(),
      load: vi.fn(),
    };
    const repository = createLeaderRepository({ localStore: createLocalStore(), remoteStore });

    const leaders = await repository.save({ name: 'Ada', score: 3, date: '2026-01-01T00:00:00.000Z' });

    expect(leaders).toHaveLength(1);
    expect(remoteStore.save).toHaveBeenCalledOnce();
  });

  it('falls back to local leaders without remote store', async () => {
    const repository = createLeaderRepository({
      localStore: createLocalStore([{ name: 'Ada', score: 3 }]),
      remoteStore: null,
    });

    await expect(repository.getTop({ syncRemote: true })).resolves.toMatchObject({ source: 'local' });
  });
});
