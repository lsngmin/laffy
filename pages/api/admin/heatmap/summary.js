import { assertAdmin } from '../_auth';

function normalizeSlug(slug) {
  if (typeof slug !== 'string') return '';
  const trimmed = slug.trim();
  return trimmed.length ? trimmed : '';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  if (!assertAdmin(req, res)) return;

  try {
    const rawSlug = req.query.slug;
    const slugs = Array.isArray(rawSlug)
      ? rawSlug.map((value) => normalizeSlug(value)).filter(Boolean)
      : normalizeSlug(rawSlug)
        ? [normalizeSlug(rawSlug)]
        : [];

    const { listHeatmapSummaries } = await import('../../../../utils/heatmapStore');
    const data = await listHeatmapSummaries({ slugs });
    res.status(200).json(data);
  } catch (error) {
    console.error('[heatmap] failed to load summary', error);
    res.status(500).json({ error: '히트맵 요약을 불러오지 못했어요.' });
  }
}
