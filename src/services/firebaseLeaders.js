import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

import { normalizeLeaderResult } from './leaderValidation.js';

export function isFirebaseConfigReady(firebaseConfig) {
  return Object.values(firebaseConfig).every(v => v && !String(v).startsWith('PASTE_'));
}

export function createFirebaseLeaderStore(firebaseConfig, collectionName, levels, { perLevelLimit = 5 } = {}) {
  let db = null;

  if (isFirebaseConfigReady(firebaseConfig)) {
    try {
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
    } catch (error) {
      console.error('Firebase init error:', error);
    }
  }

  function isReady() {
    return Boolean(db);
  }

  function fromFirestore(data) {
    return normalizeLeaderResult({
      name: data.name || 'Без имени',
      score: Number(data.score || 0),
      date: data.date || new Date().toISOString(),
      level: data.level,
    }, levels);
  }

  async function loadLevel(levelKey) {
    const q = query(
      collection(db, collectionName),
      where('level', '==', levelKey),
      orderBy('score', 'desc'),
      orderBy('date', 'asc'),
      limit(perLevelLimit),
    );
    const snap = await getDocs(q);
    const loaded = [];
    snap.forEach(doc => {
      const result = fromFirestore(doc.data());
      if (result) loaded.push(result);
    });
    return loaded;
  }

  async function load() {
    const groups = await Promise.all(Object.keys(levels).map(loadLevel));
    return groups.flat();
  }

  async function save(result) {
    const normalized = normalizeLeaderResult(result, levels);
    if (!normalized) {
      throw new Error('Invalid leaderboard result.');
    }

    await addDoc(collection(db, collectionName), {
      ...normalized,
      createdAt: serverTimestamp(),
    });
  }

  return { isReady, load, save };
}
