export function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderLeaders(leaderBodies, leaders) {
  Object.keys(leaderBodies).forEach(levelKey => {
    const top5 = leaders.filter(x => x.level === levelKey).slice(0, 5);
    const target = leaderBodies[levelKey];
    if (!top5.length) {
      target.innerHTML = '<tr><td colspan="4">Пока нет результатов</td></tr>';
      return;
    }
    target.innerHTML = top5.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.name)}</td>
        <td>${item.score}</td>
        <td>${formatDate(item.date)}</td>
      </tr>
    `).join('');
  });
}
