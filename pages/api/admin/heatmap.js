import { assertAdmin } from './_auth';

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  if (!assertAdmin(req, res)) return;

  try {
    const slugParam = Array.isArray(req.query.slug)
      ? req.query.slug[0]
      : typeof req.query.slug === 'string'
      ? req.query.slug
      : '';

    const limit = parsePositiveInteger(req.query.limit, 5);
    const bucketLimit = parsePositiveInteger(req.query.bucketLimit, 3);
    const zoneLimit = parsePositiveInteger(req.query.zoneLimit, 5);
    const eventLimit = parsePositiveInteger(req.query.eventLimit, 5);
    const cellLimit = parsePositiveInteger(req.query.cellLimit, 6);

    const { getHeatmapInsights } = await import('../../../utils/heatmapStore');
    const insights = await getHeatmapInsights({
      slug: slugParam,
      limit,
      bucketLimit,
      zoneLimit,
      eventLimit,
      cellLimit,
    });

    res.status(200).json({ insights });
  } catch (error) {
    console.error('[admin:heatmap] failed to load insights', error);
    res.status(500).json({ error: '히트맵 데이터를 불러오지 못했어요.' });
  }
}
