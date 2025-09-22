export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });
  const { getMetrics } = await import('../../../utils/metricsStore');
  const data = await getMetrics(slug);
  res.status(200).json({ slug, ...data });
}

