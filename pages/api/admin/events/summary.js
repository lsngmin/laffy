import { assertAdmin } from '../_auth';
import { getEventSummary } from '../../../../utils/eventsStore';

function parseEventNames(query) {
  const results = [];
  const value = query.event;
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (typeof item === 'string' && item.trim()) results.push(item.trim());
    });
  } else if (typeof value === 'string' && value.trim()) {
    results.push(value.trim());
  }
  return results;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'string' ? value : String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(entries, range) {
  const header = [
    'event_name',
    'slug',
    'total_count',
    'unique_count',
    'total_value',
    'last_seen_at',
    'last_title',
    'utm_sources',
    'utm_mediums',
    'utm_campaigns',
    'utm_contents',
    'utm_terms',
    'referrers',
    'history',
    'range_start',
    'range_end',
  ];

  const rows = entries.map((entry) => {
    const sources = entry.metaSummary?.utm_sources?.join(';') || '';
    const mediums = entry.metaSummary?.utm_mediums?.join(';') || '';
    const campaigns = entry.metaSummary?.utm_campaigns?.join(';') || '';
    const contents = entry.metaSummary?.utm_contents?.join(';') || '';
    const terms = entry.metaSummary?.utm_terms?.join(';') || '';
    const referrers = entry.metaSummary?.referrers?.join(';') || '';
    const history = Array.isArray(entry.history)
      ? entry.history.map((item) => `${item.date}:${item.count}`).join('|')
      : '';
    const lastSeen = entry.lastSeenAt ? new Date(entry.lastSeenAt).toISOString() : '';

    return [
      escapeCsv(entry.name),
      escapeCsv(entry.slug || ''),
      escapeCsv(entry.totalCount || 0),
      escapeCsv(entry.uniqueCount || 0),
      escapeCsv(entry.totalValue || 0),
      escapeCsv(lastSeen),
      escapeCsv(entry.lastTitle || ''),
      escapeCsv(sources),
      escapeCsv(mediums),
      escapeCsv(campaigns),
      escapeCsv(contents),
      escapeCsv(terms),
      escapeCsv(referrers),
      escapeCsv(history),
      escapeCsv(range?.start || ''),
      escapeCsv(range?.end || ''),
    ].join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!assertAdmin(req, res)) return;

  try {
    const eventNames = parseEventNames(req.query);
    const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
    const startDate = typeof req.query.start === 'string' ? req.query.start : undefined;
    const endDate = typeof req.query.end === 'string' ? req.query.end : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const summary = await getEventSummary({
      eventNames,
      slug,
      startDate,
      endDate,
      limit,
    });

    const payload = {
      events: summary.entries,
      totals: summary.totals,
      range: summary.range,
      meta: {
        eventNames: summary.eventNames,
        slugs: summary.slugs,
      },
      generatedAt: new Date().toISOString(),
    };

    if (req.query.format === 'csv') {
      const csv = buildCsv(summary.entries, summary.range);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="event-summary.csv"');
      return res.status(200).send(csv);
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error('[admin:events] Failed to load summary', error);
    return res.status(500).json({ error: '이벤트 요약을 불러오지 못했어요.' });
  }
}
