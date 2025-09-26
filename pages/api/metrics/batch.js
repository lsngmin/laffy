import { applyRateLimit, setRateLimitHeaders } from '../../../utils/apiRateLimit';
import { resolveWithCache } from '../../../utils/serverCache';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  let { slugs } = req.query;
  if (!slugs) {
    return res.status(400).json({ error: 'Missing slugs' });
  }

  if (!Array.isArray(slugs)) {
    slugs = [slugs];
  }

  const sanitizedSlugs = slugs.map((slug) => String(slug).trim()).filter(Boolean);
  if (!sanitizedSlugs.length) {
    return res.status(400).json({ error: 'Missing slugs' });
  }

  const rate = applyRateLimit(req, 'metrics:batch', { limit: 120, windowMs: 60_000 });
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
    return res.status(429).json({ error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' });
  }

  const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const cursorParam = Array.isArray(req.query.cursor) ? req.query.cursor[0] : req.query.cursor;

  const parsedLimit = Number.parseInt(limitParam, 10);
  const parsedCursor = Number.parseInt(cursorParam, 10);

  const total = sanitizedSlugs.length;
  const MAX_LIMIT = 100;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, MAX_LIMIT) : Math.min(total, MAX_LIMIT);
  const cursor = Number.isFinite(parsedCursor) && parsedCursor >= 0 ? Math.min(parsedCursor, total) : 0;
  const end = Math.min(cursor + limit, total);
  const targetSlugs = sanitizedSlugs.slice(cursor, end);

  const sessionRequested = typeof req.query.withSession !== 'undefined';
  const { getViewerId, ensureViewerId } = await import('../../../utils/viewerSession');
  const viewerId = sessionRequested ? ensureViewerId(req, res) : getViewerId(req);

  const cacheKey = JSON.stringify({
    slugs: targetSlugs,
    total,
    cursor,
    limit,
    viewer: sessionRequested ? viewerId || null : null,
  });
  const ttl = sessionRequested ? 3_000 : 10_000;

  const payload = await resolveWithCache('metrics:batch', cacheKey, ttl, async () => {
    const { getMetrics } = await import('../../../utils/metricsStore');
    const entries = await Promise.all(
      targetSlugs.map(async (slug) => {
        const data = await getMetrics(slug, { viewerId, includeHistory: false });
        return [slug, data];
      })
    );

    const metrics = {};
    entries.forEach(([slug, data]) => {
      if (!data || typeof data !== 'object') {
        metrics[slug] = { views: 0, likes: 0 };
        return;
      }
      const { views, likes, liked } = data;
      const numericViews = Number(views);
      const numericLikes = Number(likes);
      const normalized = {
        views: Number.isFinite(numericViews) ? numericViews : 0,
        likes: Math.max(0, Number.isFinite(numericLikes) ? numericLikes : 0),
      };
      if (typeof liked === 'boolean') {
        normalized.liked = liked;
      }
      metrics[slug] = normalized;
    });

    const nextCursorValue = end < total ? end : null;

    return {
      metrics,
      total,
      count: targetSlugs.length,
      nextCursor: nextCursorValue,
    };
  });

  res.status(200).json(payload);
}
