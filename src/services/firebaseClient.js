import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

import { LEVELS } from '../game/levels.js';
import { normalizeLeaderResult, normalizePlayerName } from './leaderValidation.js';

function isFirebaseConfigReady(firebaseConfig) {
  return Object.values(firebaseConfig).every(value => value && !String(value).startsWith('PASTE_'));
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.uid,
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email,
  };
}

export function createFirebaseClient(firebaseConfig, { perLevelLimit = 5 } = {}) {
  if (!isFirebaseConfigReady(firebaseConfig)) {
    return {
      isReady: () => false,
      getCurrentUser: () => null,
      onAuthChange(callback) {
        callback(null);
        return () => {};
      },
      async register() {
        throw new Error('Firebase is not configured.');
      },
      async login() {
        throw new Error('Firebase is not configured.');
      },
      async logout() {},
      async loadLeaderboard() {
        return [];
      },
      async saveResult() {
        throw new Error('Firebase is not configured.');
      },
    };
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  async function upsertUserProfile(user, displayName) {
    const safeName = normalizePlayerName(displayName || user.displayName || user.email);
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: safeName,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
  }

  async function register({ name, email, password }) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const displayName = normalizePlayerName(name);
    await updateProfile(credential.user, { displayName });
    await upsertUserProfile(credential.user, displayName);
    return { user: publicUser(credential.user) };
  }

  async function login({ email, password }) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await upsertUserProfile(credential.user, credential.user.displayName);
    return { user: publicUser(credential.user) };
  }

  async function loadLevel(levelKey) {
    const q = query(
      collection(db, 'leaders'),
      where('level', '==', levelKey),
      orderBy('score', 'desc'),
      orderBy('date', 'asc'),
      limit(perLevelLimit),
    );
    const snap = await getDocs(q);
    const leaders = [];
    snap.forEach(item => {
      const normalized = normalizeLeaderResult(item.data(), LEVELS);
      if (normalized) leaders.push(normalized);
    });
    return leaders;
  }

  async function loadLeaderboard() {
    const groups = await Promise.all(Object.keys(LEVELS).map(loadLevel));
    return groups.flat();
  }

  async function saveResult(result) {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Authentication is required to save online results.');
    }

    const normalized = normalizeLeaderResult({
      ...result,
      name: currentUser.displayName || result.name,
      date: new Date().toISOString(),
    }, LEVELS);
    if (!normalized) {
      throw new Error('Invalid leaderboard result.');
    }

    await addDoc(collection(db, 'leaders'), {
      ...normalized,
      uid: currentUser.uid,
      email: currentUser.email,
      durationMs: Number(result.durationMs || 0),
      correctAnswers: Number(result.correctAnswers ?? normalized.score),
      totalAnswers: Number(result.totalAnswers ?? normalized.score),
      createdAt: serverTimestamp(),
    });

    return loadLeaderboard();
  }

  return {
    isReady: () => true,
    getCurrentUser: () => publicUser(auth.currentUser),
    onAuthChange(callback) {
      return onAuthStateChanged(auth, user => callback(publicUser(user)));
    },
    register,
    login,
    logout: () => signOut(auth),
    loadLeaderboard,
    saveResult,
  };
}
