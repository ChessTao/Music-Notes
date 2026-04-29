export function sortLeaders(list) {
  return [...list].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.date) - new Date(b.date);
  });
}

export function createLocalLeaderStore(storage, storageKey) {
  function load() {
    try {
      const raw = storage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save(leaders) {
    storage.setItem(storageKey, JSON.stringify(leaders));
  }

  function clear() {
    save([]);
  }

  return { load, save, clear };
}

export function createBrowserLocalLeaderStore(storageKey) {
  return createLocalLeaderStore(localStorage, storageKey);
}
