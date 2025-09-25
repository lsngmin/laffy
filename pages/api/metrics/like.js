export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { slug, liked } = req.body || {};
    if (!slug) return res.status(400).json({ error: 'Missing slug' });

    let likedValue;
    if (typeof liked === 'boolean') {
      likedValue = liked;
    } else if (typeof liked === 'string') {
      if (liked.toLowerCase() === 'true') likedValue = true;
      else if (liked.toLowerCase() === 'false') likedValue = false;
    }

    const { ensureViewerId } = await import('../../../utils/viewerSession');
    const viewerId = ensureViewerId(req, res);
    const { setLikeState } = await import('../../../utils/metricsStore');
    const data = await setLikeState(slug, { viewerId, liked: likedValue });
    res.status(200).json({ slug, ...data });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update likes' });
  }
}
