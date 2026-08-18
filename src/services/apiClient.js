async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || `Request failed: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function createApiClient() {
  return {
    getSession() {
      return request('/api/session');
    },
    register({ name, password }) {
      return request('/api/register', { method: 'POST', body: { name, password } });
    },
    login({ name, password }) {
      return request('/api/login', { method: 'POST', body: { name, password } });
    },
    logout() {
      return request('/api/logout', { method: 'POST' });
    },
    getLeaderboard(level) {
      const query = level ? `?level=${encodeURIComponent(level)}` : '';
      return request(`/api/leaderboard${query}`);
    },
    saveResult(result) {
      return request('/api/results', { method: 'POST', body: result });
    },
    getRooms() {
      return request('/api/rooms');
    },
    createRoom(room) {
      return request('/api/rooms', { method: 'POST', body: room });
    },
    joinRoom(roomId) {
      return request(`/api/rooms/${encodeURIComponent(roomId)}/join`, { method: 'POST' });
    },
  };
}
