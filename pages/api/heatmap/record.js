export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  try {
    const body = req.body || {};
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) {
      return res.status(400).json({ error: 'Missing slug' });
    }

    const { ensureViewerId } = await import('../../../utils/viewerSession');
    const viewerId = ensureViewerId(req, res);

    const cells = Array.isArray(body.cells) ? body.cells : [];
    if (cells.length === 0) {
      return res.status(200).json({ ok: true, recorded: 0, slug });
    }

    const { recordHeatmapSamples, normalizeHeatmapBucket } = await import('../../../utils/heatmapStore');
    const bucket = normalizeHeatmapBucket(body.viewportBucket);

    const normalizedCells = cells.map((cell) => ({
      cell: cell?.cell,
      count: cell?.count,
      type: cell?.type,
      section: cell?.section,
    }));

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 80) : null;
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 40) : null;
    const tsValue = Number(body.ts);
    const ts = Number.isFinite(tsValue) ? tsValue : Date.now();

    const result = await recordHeatmapSamples(slug, {
      bucket,
      cells: normalizedCells,
      viewerId,
      sessionId,
      reason,
      timestamp: ts,
    });

    return res.status(200).json({ ok: true, slug, recorded: result.recorded || 0 });
  } catch (error) {
    console.error('[heatmap] record failed', error);
    return res.status(500).json({ error: 'Failed to record heatmap' });
  }
}
