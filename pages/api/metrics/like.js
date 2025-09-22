export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { slug, delta = 1 } = req.body || {};
    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    const { setLikeDelta } = await import('../../../utils/metricsStore');
    const data = await setLikeDelta(slug, Number(delta));
    res.status(200).json({ slug, ...data });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update likes' });
  }
}

