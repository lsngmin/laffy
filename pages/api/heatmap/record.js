export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  try {
    const { slug, viewportBucket, cells } = req.body || {};
    const { ensureViewerId } = await import('../../../utils/viewerSession');
    const sessionId = ensureViewerId(req, res);

    const normalizedSlug = typeof slug === 'string' ? slug.trim() : '';
    if (!normalizedSlug) {
      return res.status(400).json({ error: 'Missing slug' });
    }

    const payloadCells = Array.isArray(cells) ? cells : [];
    const { recordHeatmapSamples } = await import('../../../utils/heatmapStore');
    const result = await recordHeatmapSamples({
      slug: normalizedSlug,
      viewportBucket,
      cells: payloadCells,
      sessionId,
    });

    return res.status(200).json({
      ok: true,
      slug: normalizedSlug,
      stored: Boolean(result?.stored),
      backend: result?.backend || null,
      count: result?.count || 0,
    });
  } catch (error) {
    console.error('[heatmap] record handler failed', error);
    return res.status(500).json({ error: 'Failed to record heatmap samples' });
  }
}
