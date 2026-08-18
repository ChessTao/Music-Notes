import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const DEFAULT_STORE = {
  profiles: {},
  sessions: {},
  online_rooms: {},
  leaderboard_results: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeDefaultStore(value) {
  return {
    ...clone(DEFAULT_STORE),
    ...(value && typeof value === 'object' ? value : {}),
  };
}

export async function createStorage({ databaseUrl = process.env.DATABASE_URL, runtimeDir = '.runtime' } = {}) {
  if (databaseUrl) {
    return createPostgresStorage(databaseUrl);
  }
  return createJsonStorage(runtimeDir);
}

async function createJsonStorage(runtimeDir) {
  const filePath = join(runtimeDir, 'app-store.json');
  let cache = null;

  async function ensureLoaded() {
    if (cache) return;
    try {
      cache = mergeDefaultStore(JSON.parse(await readFile(filePath, 'utf8')));
    } catch {
      cache = clone(DEFAULT_STORE);
      await persist();
    }
  }

  async function persist() {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(cache, null, 2), 'utf8');
  }

  return {
    kind: 'json',
    async init() {
      await ensureLoaded();
    },
    async get(key) {
      await ensureLoaded();
      return clone(cache[key] ?? DEFAULT_STORE[key] ?? null);
    },
    async set(key, value) {
      await ensureLoaded();
      cache[key] = clone(value);
      await persist();
    },
    async appendError(error) {
      await mkdir(runtimeDir, { recursive: true });
      const file = join(runtimeDir, 'server-errors.json');
      let errors = [];
      try {
        errors = JSON.parse(await readFile(file, 'utf8'));
      } catch {
        errors = [];
      }
      errors.push(error);
      await writeFile(file, JSON.stringify(errors.slice(-200), null, 2), 'utf8');
    },
    async getErrors() {
      try {
        return JSON.parse(await readFile(join(runtimeDir, 'server-errors.json'), 'utf8'));
      } catch {
        return [];
      }
    },
  };
}

async function createPostgresStorage(databaseUrl) {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: databaseUrl });

  async function init() {
    await pool.query(`
      create table if not exists app_store (
        key text primary key,
        data jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);
    await pool.query(`
      create table if not exists server_errors (
        id bigserial primary key,
        created_at timestamptz not null default now(),
        scope text,
        message text not null,
        stack text,
        context jsonb
      )
    `);

    for (const [key, value] of Object.entries(DEFAULT_STORE)) {
      await pool.query(
        `insert into app_store (key, data)
         values ($1, $2::jsonb)
         on conflict (key) do nothing`,
        [key, JSON.stringify(value)],
      );
    }
  }

  return {
    kind: 'postgres',
    init,
    async get(key) {
      const result = await pool.query('select data from app_store where key = $1', [key]);
      if (!result.rows.length) return clone(DEFAULT_STORE[key] ?? null);
      return clone(result.rows[0].data);
    },
    async set(key, value) {
      await pool.query(
        `insert into app_store (key, data, updated_at)
         values ($1, $2::jsonb, now())
         on conflict (key) do update set data = excluded.data, updated_at = now()`,
        [key, JSON.stringify(value)],
      );
    },
    async appendError(error) {
      await pool.query(
        'insert into server_errors (scope, message, stack, context) values ($1, $2, $3, $4::jsonb)',
        [error.scope || null, error.message || 'Unknown error', error.stack || null, JSON.stringify(error.context || {})],
      );
    },
    async getErrors() {
      const result = await pool.query(
        'select id, created_at as "createdAt", scope, message, stack, context from server_errors order by id desc limit 100',
      );
      return result.rows;
    },
  };
}
