import { sortLeaders } from './localLeaders.js';
import { normalizeLeaderList, normalizeLeaderResult } from './leaderValidation.js';

export function createLeaderRepository({ localStore, remoteStore, levels }) {
  let leaders = sortLeaders(normalizeLeaderList(localStore.load(), levels));

  function persistLocal() {
    localStore.save(leaders);
  }

  function getLocal() {
    return sortLeaders(leaders);
  }

  async function getTop({ syncRemote = false } = {}) {
    if (syncRemote && remoteStore?.isReady()) {
      try {
        leaders = sortLeaders(normalizeLeaderList(await remoteStore.load(), levels));
        persistLocal();
        return { leaders: getLocal(), source: 'remote' };
      } catch (error) {
        console.warn('Remote leaderboard load failed:', error);
        return { leaders: getLocal(), source: 'local', remoteError: error };
      }
    }

    return { leaders: getLocal(), source: 'local' };
  }

  async function save(result) {
    const normalized = normalizeLeaderResult(result, levels);
    if (!normalized) {
      return { leaders: getLocal(), remote: 'skipped', accepted: false };
    }

    leaders = sortLeaders([...leaders, normalized]);
    persistLocal();

    if (!remoteStore?.isReady()) {
      return { leaders: getLocal(), remote: 'skipped', accepted: true };
    }

    try {
      await remoteStore.save(normalized);
      return { leaders: getLocal(), remote: 'saved', accepted: true };
    } catch (error) {
      console.warn('Remote leaderboard save failed:', error);
      return { leaders: getLocal(), remote: 'failed', accepted: true, remoteError: error };
    }
  }

  function clearLocal() {
    leaders = [];
    persistLocal();
    return getLocal();
  }

  return { getLocal, getTop, save, clearLocal };
}
