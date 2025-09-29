import { assertAdmin } from '../_auth';
import { applyRateLimit, setRateLimitHeaders } from '../../../../utils/apiRateLimit';
import { resolveWithCache } from '../../../../utils/serverCache';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!assertAdmin(req, res)) return;

  try {
    const startDate = typeof req.query.start === 'string' ? req.query.start : undefined;
    const endDate = typeof req.query.end === 'string' ? req.query.end : undefined;
    const eventName = typeof req.query.event === 'string' ? req.query.event.trim() : '';
    const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
    const limitRaw = typeof req.query.limit === 'string' ? req.query.limit : undefined;

    const rate = applyRateLimit(req, 'admin:events:summary', { limit: 45, windowMs: 60_000 });
    setRateLimitHeaders(res, rate);
    if (!rate.ok) {
      return res.status(429).json({ error: '이벤트 요약 요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.' });
    }

    const cacheKey = JSON.stringify({ startDate, endDate, eventName, slug, limitRaw });
    const summary = await resolveWithCache('admin:events:summary', cacheKey, 45_000, async () => {
      const { getEventSummary } = await import('../../../../utils/eventsStore');
      return getEventSummary({
        startDate,
        endDate,
        eventName,
        slug,
        limit: limitRaw,
      });
    });

    return res.status(200).json({
      items: Array.isArray(summary.items) ? summary.items : [],
      totals: summary.totals || { visitCount: 0, uniqueSessions: 0 },
      timeseries: Array.isArray(summary.timeseriesByGranularity?.daily)
        ? summary.timeseriesByGranularity.daily
        : [],
      timeseriesByGranularity: summary.timeseriesByGranularity || {},
      catalog: summary.catalog || { events: [], slugsByEvent: {} },
    });
  } catch (error) {
    console.error('[admin/events] summary failed', error);
    return res.status(500).json({ error: '이벤트 요약을 불러오지 못했어요.' });
  }
}
