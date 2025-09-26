function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function buildAnalyticsCsv(rows) {
  const header = ['slug', 'title', 'type', 'views', 'likes', 'like_rate'];
  const lines = [header.join(',')];
  rows.forEach((row) => {
    const metrics = row.metrics || { views: 0, likes: 0 };
    const likeRate = metrics.views > 0 ? metrics.likes / metrics.views : 0;
    lines.push(
      [
        escapeCsvValue(row.slug),
        escapeCsvValue(row.title || ''),
        escapeCsvValue(row.type || ''),
        metrics.views ?? 0,
        metrics.likes ?? 0,
        likeRate.toFixed(4),
      ].join(',')
    );
  });
  return lines.join('\n');
}

export function downloadAnalyticsCsv(rows) {
  if (typeof window === 'undefined') return;
  const csv = buildAnalyticsCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `laffy-analytics-${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
