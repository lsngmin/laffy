import { assertAdmin } from '../_auth';

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

    const { getEventSummary } = await import('../../../../utils/eventsStore');
    const summary = await getEventSummary({
      startDate,
      endDate,
      eventName,
      slug,
      limit: limitRaw,
    });

    return res.status(200).json({
      items: Array.isArray(summary.items) ? summary.items : [],
      totals: summary.totals || { count: 0, uniqueSessions: 0 },
      timeseries: Array.isArray(summary.timeseries) ? summary.timeseries : [],
      catalog: summary.catalog || { events: [], slugsByEvent: {} },
    });
  } catch (error) {
    console.error('[admin/events] summary failed', error);
    return res.status(500).json({ error: '이벤트 요약을 불러오지 못했어요.' });
  }
}
