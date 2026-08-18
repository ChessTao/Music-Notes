import { randomUUID } from 'node:crypto';
import { LEVELS } from './src/game/levels.js';
import { normalizeLeaderResult } from './src/services/leaderValidation.js';
import {
  clearSessionCookie,
  createSessionToken,
  getSessionToken,
  hashPassword,
  hashToken,
  jsonResponse,
  normalizeDisplayName,
  normalizePassword,
  publicUser,
  readJsonBody,
  sessionCookie,
  verifyPassword,
} from './server-utils.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function isExpired(value) {
  return !value || new Date(value).getTime() <= Date.now();
}

function toLeaderboard(results, level) {
  return results
    .filter(result => !level || result.level === level)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.date) - new Date(b.date);
    })
    .slice(0, level ? 5 : 20);
}

function sanitizeRoom(room) {
  return {
    id: room.id,
    title: room.title,
    level: room.level,
    hostUserId: room.hostUserId,
    hostName: room.hostName,
    players: room.players,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

export function createApi({ storage, secureCookies = process.env.COOKIE_SECURE === 'true' } = {}) {
  async function getSession(req) {
    const token = getSessionToken(req);
    if (!token) return { token: '', tokenHash: '', user: null };

    const tokenHash = hashToken(token);
    const sessions = await storage.get('sessions');
    const session = sessions[tokenHash];
    if (!session || isExpired(session.expiresAt)) {
      if (session) {
        delete sessions[tokenHash];
        await storage.set('sessions', sessions);
      }
      return { token: '', tokenHash: '', user: null };
    }

    const profiles = await storage.get('profiles');
    const user = profiles[session.userId] || null;
    return { token, tokenHash, user };
  }

  async function requireUser(req, res) {
    const session = await getSession(req);
    if (!session.user) {
      jsonResponse(res, 401, { ok: false, error: 'auth_required' });
      return null;
    }
    return session.user;
  }

  async function createSessionForUser(res, userId) {
    const token = createSessionToken();
    const tokenHash = hashToken(token);
    const sessions = await storage.get('sessions');
    sessions[tokenHash] = {
      userId,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    };
    await storage.set('sessions', sessions);

    return sessionCookie(token, {
      maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
      secure: secureCookies,
    });
  }

  async function route(req, res, url) {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      jsonResponse(res, 200, { ok: true, storage: storage.kind, time: nowIso() });
      return true;
    }

    if (req.method === 'GET' && url.pathname === '/api/session') {
      const session = await getSession(req);
      jsonResponse(res, 200, { ok: true, user: publicUser(session.user) });
      return true;
    }

    if (req.method === 'POST' && url.pathname === '/api/register') {
      const body = await readJsonBody(req);
      const displayName = normalizeDisplayName(body.name || body.displayName);
      const password = normalizePassword(body.password);

      if (!displayName || !password) {
        jsonResponse(res, 400, { ok: false, error: 'invalid_registration' });
        return true;
      }

      const profiles = await storage.get('profiles');
      const duplicate = Object.values(profiles).some(
        profile => profile.displayName.toLowerCase() === displayName.toLowerCase(),
      );
      if (duplicate) {
        jsonResponse(res, 409, { ok: false, error: 'name_taken' });
        return true;
      }

      const id = randomUUID();
      const timestamp = nowIso();
      profiles[id] = {
        id,
        displayName,
        password: hashPassword(password),
        createdAt: timestamp,
        lastSeenAt: timestamp,
      };
      await storage.set('profiles', profiles);
      const cookie = await createSessionForUser(res, id);
      jsonResponse(res, 201, { ok: true, user: publicUser(profiles[id]) }, { 'set-cookie': cookie });
      return true;
    }

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = await readJsonBody(req);
      const displayName = normalizeDisplayName(body.name || body.displayName);
      const password = String(body.password || '');
      const profiles = await storage.get('profiles');
      const user = Object.values(profiles).find(
        profile => profile.displayName.toLowerCase() === displayName.toLowerCase(),
      );

      if (!user || !verifyPassword(password, user.password)) {
        jsonResponse(res, 401, { ok: false, error: 'invalid_credentials' });
        return true;
      }

      user.lastSeenAt = nowIso();
      profiles[user.id] = user;
      await storage.set('profiles', profiles);
      const cookie = await createSessionForUser(res, user.id);
      jsonResponse(res, 200, { ok: true, user: publicUser(user) }, { 'set-cookie': cookie });
      return true;
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
      const token = getSessionToken(req);
      if (token) {
        const sessions = await storage.get('sessions');
        delete sessions[hashToken(token)];
        await storage.set('sessions', sessions);
      }
      jsonResponse(res, 200, { ok: true }, { 'set-cookie': clearSessionCookie() });
      return true;
    }

    if (req.method === 'GET' && url.pathname === '/api/profile') {
      const user = await requireUser(req, res);
      if (!user) return true;
      jsonResponse(res, 200, { ok: true, profile: publicUser(user) });
      return true;
    }

    if (req.method === 'PUT' && url.pathname === '/api/profile') {
      const user = await requireUser(req, res);
      if (!user) return true;
      const body = await readJsonBody(req);
      const displayName = normalizeDisplayName(body.displayName || body.name);
      if (!displayName) {
        jsonResponse(res, 400, { ok: false, error: 'invalid_display_name' });
        return true;
      }

      const profiles = await storage.get('profiles');
      const duplicate = Object.values(profiles).some(
        profile => profile.id !== user.id && profile.displayName.toLowerCase() === displayName.toLowerCase(),
      );
      if (duplicate) {
        jsonResponse(res, 409, { ok: false, error: 'name_taken' });
        return true;
      }

      profiles[user.id].displayName = displayName;
      profiles[user.id].lastSeenAt = nowIso();
      await storage.set('profiles', profiles);
      jsonResponse(res, 200, { ok: true, profile: publicUser(profiles[user.id]) });
      return true;
    }

    if (req.method === 'GET' && url.pathname === '/api/leaderboard') {
      const level = url.searchParams.get('level') || '';
      if (level && !LEVELS[level]) {
        jsonResponse(res, 400, { ok: false, error: 'unknown_level' });
        return true;
      }
      const results = await storage.get('leaderboard_results');
      jsonResponse(res, 200, { ok: true, leaders: toLeaderboard(results, level) });
      return true;
    }

    if (req.method === 'POST' && url.pathname === '/api/results') {
      const user = await requireUser(req, res);
      if (!user) return true;
      const body = await readJsonBody(req);
      const normalized = normalizeLeaderResult({
        name: user.displayName,
        score: body.score,
        date: nowIso(),
        level: body.level,
      }, LEVELS);

      const durationMs = Number(body.durationMs);
      const totalAnswers = Number(body.totalAnswers ?? body.score);
      const correctAnswers = Number(body.correctAnswers ?? body.score);
      if (!normalized || durationMs < 1000 || durationMs > 90000 || correctAnswers !== normalized.score || totalAnswers < correctAnswers) {
        jsonResponse(res, 400, { ok: false, error: 'invalid_result' });
        return true;
      }

      const results = await storage.get('leaderboard_results');
      const stored = {
        id: randomUUID(),
        userId: user.id,
        ...normalized,
        durationMs,
        correctAnswers,
        totalAnswers,
        createdAt: nowIso(),
      };
      results.push(stored);
      await storage.set('leaderboard_results', results.slice(-2000));
      jsonResponse(res, 201, { ok: true, result: stored, leaders: toLeaderboard(results, body.level) });
      return true;
    }

    if (req.method === 'GET' && url.pathname === '/api/rooms') {
      const rooms = await storage.get('online_rooms');
      const activeRooms = Object.fromEntries(
        Object.entries(rooms).filter(([, room]) => Date.now() - new Date(room.updatedAt).getTime() < ROOM_TTL_MS),
      );
      if (Object.keys(activeRooms).length !== Object.keys(rooms).length) {
        await storage.set('online_rooms', activeRooms);
      }
      jsonResponse(res, 200, { ok: true, rooms: Object.values(activeRooms).map(sanitizeRoom) });
      return true;
    }

    if (req.method === 'POST' && url.pathname === '/api/rooms') {
      const user = await requireUser(req, res);
      if (!user) return true;
      const body = await readJsonBody(req);
      const level = String(body.level || 'easiest');
      if (!LEVELS[level]) {
        jsonResponse(res, 400, { ok: false, error: 'unknown_level' });
        return true;
      }
      const rooms = await storage.get('online_rooms');
      const id = randomUUID();
      const timestamp = nowIso();
      rooms[id] = {
        id,
        title: normalizeDisplayName(body.title) || `${user.displayName}: ${LEVELS[level].title}`,
        level,
        hostUserId: user.id,
        hostName: user.displayName,
        players: [{ userId: user.id, displayName: user.displayName, joinedAt: timestamp }],
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await storage.set('online_rooms', rooms);
      jsonResponse(res, 201, { ok: true, room: sanitizeRoom(rooms[id]) });
      return true;
    }

    if (req.method === 'POST' && /^\/api\/rooms\/[^/]+\/join$/.test(url.pathname)) {
      const user = await requireUser(req, res);
      if (!user) return true;
      const roomId = url.pathname.split('/')[3];
      const rooms = await storage.get('online_rooms');
      const room = rooms[roomId];
      if (!room) {
        jsonResponse(res, 404, { ok: false, error: 'room_not_found' });
        return true;
      }
      if (!room.players.some(player => player.userId === user.id)) {
        room.players.push({ userId: user.id, displayName: user.displayName, joinedAt: nowIso() });
      }
      room.updatedAt = nowIso();
      rooms[roomId] = room;
      await storage.set('online_rooms', rooms);
      jsonResponse(res, 200, { ok: true, room: sanitizeRoom(room) });
      return true;
    }

    if (req.method === 'GET' && url.pathname === '/api/errors') {
      const requiredToken = process.env.ERROR_VIEW_TOKEN || '';
      const providedToken = req.headers['x-error-view-token'] || url.searchParams.get('token') || '';
      if (process.env.NODE_ENV === 'production' && (!requiredToken || providedToken !== requiredToken)) {
        jsonResponse(res, 403, { ok: false, error: 'forbidden' });
        return true;
      }
      const errors = await storage.getErrors();
      jsonResponse(res, 200, { ok: true, errors });
      return true;
    }

    return false;
  }

  async function handle(req, res, url) {
    try {
      return await route(req, res, url);
    } catch (error) {
      await storage.appendError({
        createdAt: nowIso(),
        scope: `${req.method} ${url.pathname}`,
        message: error.message,
        stack: error.stack,
      });
      jsonResponse(res, error.status || 500, { ok: false, error: error.status ? error.message : 'server_error' });
      return true;
    }
  }

  return { handle };
}
