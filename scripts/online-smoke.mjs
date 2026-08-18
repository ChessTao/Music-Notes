const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 4173}`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok || data.ok === false) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${text}`);
  }
  return { response, data };
}

const suffix = Date.now().toString(36);
const name = `Smoke ${suffix}`;
const password = `smoke-${suffix}`;

const health = await request('/api/health');
if (health.data.ok !== true) throw new Error('/api/health did not return ok=true');

const registration = await request('/api/register', {
  method: 'POST',
  body: JSON.stringify({ name, password }),
});
const cookie = registration.response.headers.get('set-cookie')?.split(';')[0];
if (!cookie) throw new Error('Registration did not set a session cookie.');

await request('/api/profile', { headers: { cookie } });
await request('/api/results', {
  method: 'POST',
  headers: { cookie },
  body: JSON.stringify({
    level: 'easiest',
    score: 1,
    durationMs: 60000,
    correctAnswers: 1,
    totalAnswers: 1,
  }),
});
const leaderboard = await request('/api/leaderboard?level=easiest');
if (!leaderboard.data.leaders.some(item => item.name === name)) {
  throw new Error('Saved smoke result was not found in leaderboard.');
}

console.log(`online-smoke ok: ${baseUrl}`);
