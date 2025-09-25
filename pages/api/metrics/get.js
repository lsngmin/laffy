export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { slug, withSession } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const sessionRequested = typeof withSession !== 'undefined';
  const { getViewerId, ensureViewerId } = await import('../../../utils/viewerSession');
  const viewerId = sessionRequested ? ensureViewerId(req, res) : getViewerId(req);

  const { getMetrics } = await import('../../../utils/metricsStore');
  const data = await getMetrics(slug, { viewerId });
  res.status(200).json({ slug, ...data });
}
