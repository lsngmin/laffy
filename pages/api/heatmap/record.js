export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const slug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    if (!slug) {
      res.status(400).json({ error: 'invalid_slug' });
      return;
    }

    const viewportBucket = typeof body?.viewportBucket === 'string'
      ? body.viewportBucket.slice(0, 32)
      : null;
    const sessionId = typeof body?.sessionId === 'string'
      ? body.sessionId.slice(0, 64)
      : null;

    const pointerCells = Array.isArray(body?.pointer)
      ? body.pointer
          .map((entry) => ({
            area: typeof entry?.area === 'string' && entry.area ? entry.area.slice(0, 40) : 'generic',
            type: typeof entry?.type === 'string' && entry.type ? entry.type.slice(0, 20) : 'move',
            x: Number.isFinite(entry?.x) ? Math.max(0, Math.floor(entry.x)) : 0,
            y: Number.isFinite(entry?.y) ? Math.max(0, Math.floor(entry.y)) : 0,
            count: Number.isFinite(entry?.count) ? Math.max(1, Math.floor(entry.count)) : 1,
          }))
          .filter((entry) => entry.x >= 0 && entry.y >= 0 && entry.count > 0)
      : [];

    const scrollBuckets = Array.isArray(body?.scroll)
      ? body.scroll
          .map((entry) => ({
            bucket: Number.isFinite(entry?.bucket) ? Math.max(0, Math.floor(entry.bucket)) : 0,
            count: Number.isFinite(entry?.count) ? Math.max(1, Math.floor(entry.count)) : 1,
          }))
          .filter((entry) => entry.count > 0)
      : [];

    if (!pointerCells.length && !scrollBuckets.length) {
      res.status(204).end();
      return;
    }

    const { ensureViewerId } = await import('../../../utils/viewerSession');
    const viewerId = ensureViewerId(req, res);

    const { recordHeatmapSample } = await import('../../../utils/heatmapStore');
    await recordHeatmapSample({
      slug,
      viewportBucket,
      sessionId,
      pointerCells,
      scrollBuckets,
      viewerId,
    });

    res.status(204).end();
  } catch (error) {
    console.warn('[heatmap] failed to record sample', error);
    res.status(400).json({ error: 'invalid_payload' });
  }
}
