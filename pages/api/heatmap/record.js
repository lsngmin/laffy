export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  try {
    const { slug, viewportBucket, cells, zoneSamples, sampleCount, eventTotals } = req.body || {};
    const safeSlug = typeof slug === "string" ? slug.trim() : "";
    if (!safeSlug) {
      res.status(400).json({ error: "Missing slug" });
      return;
    }

    const bucket = typeof viewportBucket === "string" && viewportBucket.trim()
      ? viewportBucket.trim().slice(0, 40)
      : "unknown";

    const normalizedCells = Array.isArray(cells)
      ? cells
          .map((cell) => ({
            cell: Number(cell?.cell),
            total: Number(cell?.total) || 0,
            pointermove: Number(cell?.pointermove) || 0,
            pointerdown: Number(cell?.pointerdown) || 0,
            scroll: Number(cell?.scroll) || 0,
          }))
          .filter((cell) => Number.isInteger(cell.cell) && cell.cell >= 0 && cell.total > 0)
      : [];

    const normalizedZones = Array.isArray(zoneSamples)
      ? zoneSamples
          .map((entry) => {
            const zone = typeof entry?.zone === "string" && entry.zone.trim()
              ? entry.zone.trim().slice(0, 80)
              : null;
            const type = typeof entry?.type === "string" && entry.type.trim()
              ? entry.type.trim().slice(0, 40)
              : "custom";
            const count = Number(entry?.count) || 0;
            return zone ? { zone, type, count: Math.max(0, Math.round(count)) } : null;
          })
          .filter((entry) => entry && entry.count > 0)
      : [];

    const normalizedTotals = eventTotals && typeof eventTotals === "object"
      ? Object.entries(eventTotals).reduce((acc, [key, value]) => {
          if (typeof key !== "string" || !key.trim()) return acc;
          const safeKey = key.trim().slice(0, 40);
          const count = Number(value) || 0;
          if (count > 0) acc[safeKey] = Math.max(0, Math.round(count));
          return acc;
        }, {})
      : {};

    if (normalizedCells.length === 0 && normalizedZones.length === 0 && Object.keys(normalizedTotals).length === 0) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const { ensureViewerId } = await import("../../../utils/viewerSession");
    const viewerId = ensureViewerId(req, res);

    const { recordHeatmapBatch } = await import("../../../utils/heatmapStore");
    await recordHeatmapBatch({
      slug: safeSlug,
      viewportBucket: bucket,
      cells: normalizedCells,
      zones: normalizedZones,
      events: normalizedTotals,
      viewerId,
      sampleCount: Number(sampleCount) || 0,
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[heatmap] failed to record", error);
    res.status(500).json({ error: "Failed to record heatmap" });
  }
}
