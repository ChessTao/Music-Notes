export const MAX_PLAYER_NAME_LENGTH = 20;
export const MAX_REASONABLE_SCORE = 240;

export function normalizePlayerName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, MAX_PLAYER_NAME_LENGTH);
}

export function normalizeLeaderResult(result, levels) {
  const name = normalizePlayerName(result?.name);
  const score = Number(result?.score);
  const date = new Date(result?.date);
  const level = String(result?.level || '');

  if (!name) return null;
  if (!levels[level]) return null;
  if (!Number.isInteger(score) || score < 0 || score > MAX_REASONABLE_SCORE) return null;
  if (Number.isNaN(date.getTime())) return null;

  return {
    name,
    score,
    date: date.toISOString(),
    level,
  };
}

export function normalizeLeaderList(list, levels) {
  if (!Array.isArray(list)) return [];
  return list.map(item => normalizeLeaderResult(item, levels)).filter(Boolean);
}
