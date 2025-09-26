import { assertAdmin } from '../../_auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!assertAdmin(req, res)) return;

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (!slug) {
    return res.status(400).json({ error: 'slug 파라미터를 입력해 주세요.' });
  }

  try {
    const { getHeatmapSnapshot, normalizeHeatmapBucket } = await import('../../../../utils/heatmapStore');
    const snapshot = await getHeatmapSnapshot(slug);
    const requestedBucket = typeof req.query.bucket === 'string' ? req.query.bucket : '';
    const normalizedBucket = requestedBucket ? normalizeHeatmapBucket(requestedBucket) : '';

    let buckets = Array.isArray(snapshot?.buckets) ? snapshot.buckets : [];
    if (normalizedBucket) {
      buckets = buckets.filter((bucket) => bucket?.bucket === normalizedBucket);
    }

    return res.status(200).json({
      slug: snapshot?.slug || slug,
      buckets,
    });
  } catch (error) {
    console.error('[admin/heatmap] snapshot failed', error);
    return res.status(500).json({ error: '히트맵 데이터를 불러오지 못했어요.' });
  }
}
