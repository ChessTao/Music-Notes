import { describe, expect, it } from 'vitest';
import {
  clearSessionCookie,
  hashPassword,
  normalizeDisplayName,
  normalizePassword,
  parseCookies,
  sessionCookie,
  verifyPassword,
} from '../server-utils.js';

describe('server utils', () => {
  it('hashes and verifies passwords', () => {
    const record = hashPassword('secret123');

    expect(verifyPassword('secret123', record)).toBe(true);
    expect(verifyPassword('wrong123', record)).toBe(false);
  });

  it('normalizes credentials', () => {
    expect(normalizeDisplayName('  Ada   Lovelace  ')).toBe('Ada Lovelace');
    expect(normalizePassword('12345')).toBe('');
    expect(normalizePassword('123456')).toBe('123456');
  });

  it('handles session cookies', () => {
    const cookie = sessionCookie('abc', { maxAgeSeconds: 60 });

    expect(cookie).toContain('music_notes_session=abc');
    expect(parseCookies('music_notes_session=abc; theme=dark')).toMatchObject({ music_notes_session: 'abc' });
    expect(clearSessionCookie()).toContain('Max-Age=0');
  });
});
