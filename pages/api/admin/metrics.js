import { assertAdmin } from './_auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;

  try {
    const { slug, views, likes } = req.body || {};
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Missing slug' });
    }

    const { overwriteMetrics } = await import('../../../utils/metricsStore');
    const result = await overwriteMetrics(slug.trim(), { views, likes });
    res.status(200).json({ slug: slug.trim(), ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update metrics' });
  }
}
