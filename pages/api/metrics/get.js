export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { slug, withSession, start, end } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const sessionRequested = typeof withSession !== 'undefined';
  const { getViewerId, ensureViewerId } = await import('../../../utils/viewerSession');
  const viewerId = sessionRequested ? ensureViewerId(req, res) : getViewerId(req);

  const { getMetrics } = await import('../../../utils/metricsStore');
  const startDate = parseDateParam(start);
  const endDate = parseDateParam(end);
  const data = await getMetrics(slug, { viewerId, startDate, endDate });
  res.status(200).json({ slug, ...data });
}

function parseDateParam(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}
