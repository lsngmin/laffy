import {
  hasSupabaseConfig,
  supabaseRest,
  SUPABASE_EVENT_METRICS_TABLE,
} from './supabaseClient';

const EVENT_NAME = 'l_visit';
const DEFAULT_RANGE_DAYS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_TIMEZONE = 'Asia/Seoul';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const TEN_MINUTE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: KST_TIMEZONE,
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function pad(value) {
  return String(value).padStart(2, '0');
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getTime());
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const iso = trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00+09:00`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function formatDateKey(date) {
  try {
    return DATE_KEY_FORMATTER.format(date);
  } catch {
    return '';
  }
}

function startOfKstDay(value) {
  const parsed = toDate(value);
  if (!parsed) return null;
  const key = formatDateKey(parsed);
  if (!key) return null;
  const [yearRaw, monthRaw, dayRaw] = key.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  const utcMillis = Date.UTC(year, month - 1, day);
  return new Date(utcMillis - KST_OFFSET_MS);
}

function normalizeRange(startInput, endInput) {
  const today = startOfKstDay(new Date());
  const defaultEnd = today || new Date();
  const defaultStart = new Date((today || new Date()).getTime() - DEFAULT_RANGE_DAYS * DAY_MS);

  const startDate = startOfKstDay(startInput) || defaultStart;
  const endDate = startOfKstDay(endInput) || defaultEnd;

  if (startDate.getTime() > endDate.getTime()) {
    return { start: endDate, end: endDate };
  }

  return { start: startDate, end: endDate };
}

function toIsoString(date) {
  return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
}

function toKstDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + KST_OFFSET_MS);
}

function weekKeyFromBucket(bucketIso) {
  const kst = toKstDate(bucketIso);
  if (!kst) return null;
  const weekday = kst.getUTCDay();
  const diff = (weekday + 6) % 7; // Monday = 0
  const startMs = kst.getTime() - diff * DAY_MS;
  const start = new Date(startMs);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + 1;
  const day = start.getUTCDate();
  return {
    label: `${year}-${pad(month)}-${pad(day)} 주`,
    ts: start.getTime() - KST_OFFSET_MS,
  };
}

function monthKeyFromBucket(bucketIso) {
  const kst = toKstDate(bucketIso);
  if (!kst) return null;
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  return {
    label: `${year}-${pad(month)}`,
    ts: Date.UTC(year, month - 1, 1) - KST_OFFSET_MS,
  };
}

function dayKeyFromBucket(bucketIso) {
  const kst = toKstDate(bucketIso);
  if (!kst) return null;
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  return {
    label: `${year}-${pad(month)}-${pad(day)}`,
    ts: Date.UTC(year, month - 1, day) - KST_OFFSET_MS,
  };
}

function tenMinuteLabel(bucketIso) {
  const date = new Date(bucketIso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    label: TEN_MINUTE_FORMATTER.format(date),
    ts: date.getTime(),
  };
}

function resolveTimeseriesKey(bucketIso, granularity) {
  if (granularity === '10m') return tenMinuteLabel(bucketIso);
  if (granularity === 'week') return weekKeyFromBucket(bucketIso);
  if (granularity === 'month') return monthKeyFromBucket(bucketIso);
  return dayKeyFromBucket(bucketIso);
}

async function fetchMetricRows(range, slug) {
  if (!hasSupabaseConfig()) return [];
  const params = new URLSearchParams();
  params.set('select', 'ts_bucket_10m,slug,visit_count,unique_sessions,last_ts');
  params.set('event_name', `eq.${EVENT_NAME}`);
  params.append('order', 'ts_bucket_10m.asc');

  if (slug !== undefined && slug !== null) {
    const normalized = typeof slug === 'string' ? slug.trim() : '';
    if (normalized) {
      params.set('slug', `eq.${normalized}`);
    } else {
      params.set('slug', 'eq.');
    }
  }

  if (range?.start) {
    params.append('ts_bucket_10m', `gte.${toIsoString(range.start)}`);
  }
  if (range?.end) {
    const endOfDay = new Date(range.end.getTime() + DAY_MS - 1);
    params.append('ts_bucket_10m', `lte.${toIsoString(endOfDay)}`);
  }

  try {
    const rows = await supabaseRest(`${SUPABASE_EVENT_METRICS_TABLE}?${params.toString()}`);
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      bucket: row.ts_bucket_10m,
      slug: typeof row.slug === 'string' ? row.slug : '',
      visitCount: Number(row.visit_count) || 0,
      uniqueSessions: Number(row.unique_sessions) || 0,
      lastTimestamp: row.last_ts ? Date.parse(row.last_ts) || 0 : 0,
    }));
  } catch (error) {
    console.warn('[visitAnalytics] failed to fetch metrics rows', error);
    return [];
  }
}

async function fetchRawSessions(range, slug) {
  if (!hasSupabaseConfig()) {
    return { sessionSet: new Set(), slugSessions: new Map(), lastTimestamp: 0 };
  }

  const params = new URLSearchParams();
  params.set('select', 'session_id,slug,ts');
  params.set('event_name', `eq.${EVENT_NAME}`);
  params.set('session_id', 'not.is.null');
  params.set('limit', '15000');

  if (slug !== undefined && slug !== null) {
    const normalized = typeof slug === 'string' ? slug.trim() : '';
    if (normalized) {
      params.set('slug', `eq.${normalized}`);
    } else {
      params.set('slug', 'eq.');
    }
  }

  if (range?.start) {
    params.append('ts', `gte.${toIsoString(range.start)}`);
  }
  if (range?.end) {
    const endOfDay = new Date(range.end.getTime() + DAY_MS - 1);
    params.append('ts', `lte.${toIsoString(endOfDay)}`);
  }

  try {
    const rows = await supabaseRest(`events_raw?${params.toString()}`);
    if (!Array.isArray(rows)) {
      return { sessionSet: new Set(), slugSessions: new Map(), lastTimestamp: 0, slugLastMap: new Map() };
    }

    const sessionSet = new Set();
    const slugSessions = new Map();
    let lastTimestamp = 0;
    const slugLastMap = new Map();

    rows.forEach((row) => {
      const sessionId = typeof row.session_id === 'string' ? row.session_id.trim() : '';
      if (!sessionId) return;
      sessionSet.add(sessionId);
      const slugKey = typeof row.slug === 'string' ? row.slug : '';
      if (!slugSessions.has(slugKey)) {
        slugSessions.set(slugKey, new Set());
      }
      slugSessions.get(slugKey).add(sessionId);
      const ts = row.ts ? Date.parse(row.ts) : NaN;
      if (Number.isFinite(ts)) {
        lastTimestamp = Math.max(lastTimestamp, ts);
        const prev = slugLastMap.get(slugKey) || 0;
        if (ts > prev) {
          slugLastMap.set(slugKey, ts);
        }
      }
    });

    return { sessionSet, slugSessions, lastTimestamp, slugLastMap };
  } catch (error) {
    console.warn('[visitAnalytics] failed to fetch raw sessions', error);
    return { sessionSet: new Set(), slugSessions: new Map(), lastTimestamp: 0, slugLastMap: new Map() };
  }
}

function aggregateTimeseries(metrics, granularity) {
  const normalized = typeof granularity === 'string' ? granularity.toLowerCase() : 'day';
  const groups = new Map();

  metrics.forEach((row) => {
    if (!row || !row.bucket) return;
    const key = resolveTimeseriesKey(row.bucket, normalized);
    if (!key) return;
    if (!groups.has(key.label)) {
      groups.set(key.label, { count: 0, ts: key.ts });
    }
    const entry = groups.get(key.label);
    entry.count += Number(row.visitCount) || 0;
  });

  return Array.from(groups.entries())
    .map(([label, value]) => ({ label, ts: value.ts, count: value.count }))
    .sort((a, b) => (a.ts || 0) - (b.ts || 0))
    .map((entry) => ({ date: entry.label, count: entry.count }));
}

function aggregateItems(metrics, rawSessions) {
  const { slugSessions, slugLastMap } = rawSessions;
  const map = new Map();

  metrics.forEach((row) => {
    const slugKey = typeof row.slug === 'string' ? row.slug : '';
    if (!map.has(slugKey)) {
      map.set(slugKey, { count: 0, lastTimestamp: 0 });
    }
    const entry = map.get(slugKey);
    entry.count += Number(row.visitCount) || 0;
    entry.lastTimestamp = Math.max(entry.lastTimestamp, Number(row.lastTimestamp) || 0);
  });

  const items = Array.from(map.entries()).map(([slugKey, value]) => {
    const sessionSet = slugSessions.get(slugKey);
    const rawLast = slugLastMap.get(slugKey) || 0;
    const lastTimestamp = Math.max(value.lastTimestamp || 0, rawLast || 0);
    return {
      eventName: EVENT_NAME,
      slug: slugKey,
      count: value.count,
      uniqueSessions: sessionSet ? sessionSet.size : 0,
      lastTimestamp: lastTimestamp || null,
      lastDate: lastTimestamp ? new Date(lastTimestamp).toISOString() : null,
    };
  });

  items.sort((a, b) => b.count - a.count);
  return items;
}

function buildCatalog(metrics) {
  const slugs = new Set();
  metrics.forEach((row) => {
    if (!row) return;
    const slug = typeof row.slug === 'string' ? row.slug : '';
    if (slug) {
      slugs.add(slug);
    }
  });
  return {
    events: [EVENT_NAME],
    slugsByEvent: { [EVENT_NAME]: Array.from(slugs).sort((a, b) => a.localeCompare(b)) },
  };
}

export async function getVisitSummary({ startDate, endDate, slug = '', granularity = 'day', limit } = {}) {
  const range = normalizeRange(startDate, endDate);
  const metrics = await fetchMetricRows(range, slug);
  const rawSessions = await fetchRawSessions(range, slug);

  const timeseries = aggregateTimeseries(metrics, granularity);
  const items = aggregateItems(metrics, rawSessions);
  const maxItems = Number.isFinite(limit) && limit > 0 ? Math.max(1, Math.floor(limit)) : 0;
  const limitedItems = maxItems > 0 ? items.slice(0, maxItems) : items;

  const totalVisits = metrics.reduce((sum, row) => sum + (Number(row.visitCount) || 0), 0);
  const totalUnique = rawSessions.sessionSet.size;
  const lastTimestamp = Math.max(
    rawSessions.lastTimestamp || 0,
    ...metrics.map((row) => Number(row.lastTimestamp) || 0)
  );

  const catalog = buildCatalog(metrics);
  if (!catalog.slugsByEvent[EVENT_NAME]?.length && items.length) {
    catalog.slugsByEvent[EVENT_NAME] = Array.from(new Set(items.map((item) => item.slug).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }

  return {
    items: limitedItems,
    totals: {
      count: totalVisits,
      uniqueSessions: totalUnique,
      visitors: totalUnique,
      lastTimestamp: lastTimestamp || null,
      lastDate: lastTimestamp ? new Date(lastTimestamp).toISOString() : null,
      eventName: EVENT_NAME,
      slug: typeof slug === 'string' ? slug : '',
      granularity,
    },
    timeseries,
    catalog,
  };
}

export const VISIT_EVENT_NAME = EVENT_NAME;
