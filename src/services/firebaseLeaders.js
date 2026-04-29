import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

export function createFirebaseLeaderStore(firebaseConfig, collectionName, levels) {
  const configReady = Object.values(firebaseConfig).every(v => v && !String(v).startsWith('PASTE_'));
  let db = null;

  if (configReady) {
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

  async function load() {
    const q = query(collection(db, collectionName), orderBy('level', 'asc'), orderBy('score', 'desc'), orderBy('date', 'asc'), limit(200));
    const snap = await getDocs(q);
    const loaded = [];
    snap.forEach(doc => {
      const data = doc.data();
      if (!levels[data.level]) return;
      loaded.push({
        name: data.name || 'Без имени',
        score: Number(data.score || 0),
        date: data.date || new Date().toISOString(),
        level: data.level,
      });
    });
    return loaded;
  }

  async function save(result) {
    await addDoc(collection(db, collectionName), {
      ...result,
      createdAt: serverTimestamp(),
    });
  }

  return { isReady, load, save };
}
