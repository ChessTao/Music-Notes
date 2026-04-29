import { sortLeaders } from './localLeaders.js';

export function createLeaderRepository({ localStore, remoteStore }) {
  let leaders = sortLeaders(localStore.load());

  function persistLocal() {
    localStore.save(leaders);
  }

  function getLocal() {
    return sortLeaders(leaders);
  }

  async function getTop({ syncRemote = false } = {}) {
    if (syncRemote && remoteStore?.isReady()) {
      leaders = sortLeaders(await remoteStore.load());
      persistLocal();
      return { leaders: getLocal(), source: 'remote' };
    }

    return { leaders: getLocal(), source: 'local' };
  }

  async function save(result) {
    leaders = sortLeaders([...leaders, result]);
    persistLocal();

    if (remoteStore?.isReady()) {
      await remoteStore.save(result);
    }

    return getLocal();
  }

  function clearLocal() {
    leaders = [];
    persistLocal();
    return getLocal();
  }

  return { getLocal, getTop, save, clearLocal };
}
