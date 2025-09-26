import { applyRateLimit, setRateLimitHeaders } from '../../../utils/apiRateLimit';
import { resolveWithCache } from '../../../utils/serverCache';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { slug, withSession, start, end } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  const rate = applyRateLimit(req, `metrics:get:${slug}`, { limit: 300, windowMs: 60_000 });
  setRateLimitHeaders(res, rate);
  if (!rate.ok) {
    return res.status(429).json({ error: '조회 요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' });
  }

  const sessionRequested = typeof withSession !== 'undefined';
  const startDate = parseDateParam(start);
  const endDate = parseDateParam(end);

  const { getViewerId, ensureViewerId } = await import('../../../utils/viewerSession');
  const viewerId = sessionRequested ? ensureViewerId(req, res) : getViewerId(req);

  const cacheKey = JSON.stringify({
    slug,
    start: startDate ? startDate.toISOString() : null,
    end: endDate ? endDate.toISOString() : null,
    viewer: sessionRequested ? viewerId || null : null,
  });
  const ttl = sessionRequested ? 3_000 : startDate || endDate ? 10_000 : 15_000;

  const data = await resolveWithCache('metrics:get', cacheKey, ttl, async () => {
    const { getMetrics } = await import('../../../utils/metricsStore');
    return getMetrics(slug, { viewerId, startDate, endDate });
  });

  res.status(200).json({ slug, ...data });
}

function parseDateParam(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}
