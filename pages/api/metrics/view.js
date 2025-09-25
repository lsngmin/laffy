export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { slug } = req.body || {};
    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    const { ensureViewerId } = await import('../../../utils/viewerSession');
    const viewerId = ensureViewerId(req, res);
    const { bumpView } = await import('../../../utils/metricsStore');
    const data = await bumpView(slug, { viewerId });
    res.status(200).json({ slug, ...data });
  } catch (e) {
    res.status(500).json({ error: 'Failed to record view' });
  }
}
