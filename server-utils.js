import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'music_notes_session';
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = 'sha256';

export function jsonResponse(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(JSON.stringify(body));
}

export function textResponse(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(body);
}

export async function readJsonBody(req, { limit = 64 * 1024 } = {}) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON body.');
    error.status = 400;
    throw error;
  }
}

export function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

export function sessionCookie(token, { maxAgeSeconds, secure = false } = {}) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (maxAgeSeconds) parts.push(`Max-Age=${maxAgeSeconds}`);
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getSessionToken(req) {
  return parseCookies(req.headers.cookie || '')[SESSION_COOKIE] || '';
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const hash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST).toString('base64url');
  return {
    salt,
    hash,
    iterations: PASSWORD_ITERATIONS,
    digest: PASSWORD_DIGEST,
  };
}

export function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash) return false;
  const iterations = Number(record.iterations || PASSWORD_ITERATIONS);
  const digest = record.digest || PASSWORD_DIGEST;
  const expected = Buffer.from(record.hash, 'base64url');
  const actual = pbkdf2Sync(password, record.salt, iterations, expected.length, digest);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function publicUser(profile) {
  if (!profile) return null;
  return {
    id: profile.id,
    displayName: profile.displayName,
    createdAt: profile.createdAt,
    lastSeenAt: profile.lastSeenAt,
  };
}

export function normalizeDisplayName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 20);
}

export function normalizePassword(value) {
  const password = String(value || '');
  return password.length >= 6 && password.length <= 128 ? password : '';
}
