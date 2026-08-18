import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createStorage } from '../server-storage.js';

let dirs = [];

afterEach(async () => {
  await Promise.all(dirs.map(dir => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

async function createTempStorage() {
  const dir = await mkdtemp(join(tmpdir(), 'music-notes-storage-'));
  dirs.push(dir);
  const storage = await createStorage({ databaseUrl: '', runtimeDir: dir });
  await storage.init();
  return storage;
}

describe('server storage', () => {
  it('uses json fallback without DATABASE_URL', async () => {
    const storage = await createTempStorage();

    expect(storage.kind).toBe('json');
    await storage.set('profiles', { user1: { displayName: 'Ada' } });

    expect(await storage.get('profiles')).toEqual({ user1: { displayName: 'Ada' } });
  });

  it('stores server errors in json fallback', async () => {
    const storage = await createTempStorage();

    await storage.appendError({ message: 'boom', scope: 'test' });

    expect(await storage.getErrors()).toMatchObject([{ message: 'boom', scope: 'test' }]);
  });
});
