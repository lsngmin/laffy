function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value).replace(/\r?\n/g, ' ');
  if (/[",]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function buildAnalyticsCsv(rows) {
  const header = ['slug', 'title', 'type', 'views', 'likes', 'like_rate', 'route'];
  const lines = [header.join(',')];

  rows.forEach((row) => {
    const metrics = row.metrics || { views: 0, likes: 0 };
    const likeRate = metrics.views > 0 ? metrics.likes / metrics.views : 0;
    const line = [
      escapeCsvValue(row.slug),
      escapeCsvValue(row.title || row.slug),
      escapeCsvValue(row.type || ''),
      escapeCsvValue(metrics.views || 0),
      escapeCsvValue(metrics.likes || 0),
      escapeCsvValue(likeRate.toFixed(4)),
      escapeCsvValue(row.routePath || ''),
    ];
    lines.push(line.join(','));
  });

  return lines.join('\n');
}

export default buildAnalyticsCsv;
