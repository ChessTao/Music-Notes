import { describe, expect, it, vi } from 'vitest';

vi.mock('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js', () => ({
  getAuth: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(),
}));

describe('firebaseClient', () => {
  it('builds stable hidden auth emails from player names', async () => {
    const { createTechnicalEmail } = await import('../src/services/firebaseClient.js');

    expect(createTechnicalEmail('Валерий')).toBe(createTechnicalEmail('  валерий  '));
    expect(createTechnicalEmail('Валерий')).toMatch(/^user-[a-z0-9]+@music-notes-e2164\.firebaseapp\.com$/);
    expect(createTechnicalEmail('Анна')).not.toBe(createTechnicalEmail('Валерий'));
  });

  it('stays disabled until Firebase config is provided', async () => {
    const { createFirebaseClient } = await import('../src/services/firebaseClient.js');
    const client = createFirebaseClient({
      apiKey: 'PASTE_YOUR_API_KEY',
      authDomain: 'PASTE_YOUR_AUTH_DOMAIN',
      projectId: 'PASTE_YOUR_PROJECT_ID',
      storageBucket: 'PASTE_YOUR_STORAGE_BUCKET',
      messagingSenderId: 'PASTE_YOUR_MESSAGING_SENDER_ID',
      appId: 'PASTE_YOUR_APP_ID',
    });

    expect(client.isReady()).toBe(false);
    await expect(client.loadLeaderboard()).resolves.toEqual([]);
    await expect(client.register()).rejects.toThrow('Firebase is not configured.');
  });
});
