import { hasSupabaseConfig, supabaseRest } from './supabaseClient';
import { isInternalRedisIngestionDisabled } from './internalRedisToggle';

const ALLOWED_EVENT_NAMES = new Set(['l_visit']);
const GLOBAL_SLUG = '__global__';
const REDIS_QUEUE_KEY = 'events:l_visit:queue';
const REDIS_UNIQUE_PREFIX = 'events:l_visit:unique';
const UNIQUE_TTL_SECONDS = 60 * 60 * 24 * 90; // 90일 유지
const MAX_EVENTS_PER_BATCH = 200;
const MAX_REDIS_FLUSH_BATCH = 500;
const TEN_MINUTES_MS = 10 * 60 * 1000;

function ensureMemoryStore() {
  if (!global.__visitEventStore) {
    global.__visitEventStore = {
      events: [],
    };
  }
  return global.__visitEventStore;
}

function normalizeSlug(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed || '';
}

function buildContextPayload(context = {}) {
  const safeContext = {};
  if (context.ip) safeContext.ip = context.ip;
  if (context.referer) safeContext.referer = context.referer;
  if (context.origin) safeContext.origin = context.origin;
  if (context.userAgent) safeContext.userAgent = context.userAgent;
  if (context.receivedAt) safeContext.receivedAt = context.receivedAt;
  return safeContext;
}

function normalizeEventPayload(rawEvent, context = {}) {
  if (!rawEvent || typeof rawEvent !== 'object') return null;
  const name = typeof rawEvent.name === 'string' ? rawEvent.name.trim() : '';
  if (!name || !ALLOWED_EVENT_NAMES.has(name)) return null;

  const slug = normalizeSlug(rawEvent.slug || rawEvent.props?.slug || rawEvent.props?.path || '');
  const tsValue = Number(rawEvent.ts ?? Date.now());
  const timestamp = Number.isFinite(tsValue) ? tsValue : Date.now();
  const sessionRaw = typeof rawEvent.sessionId === 'string' ? rawEvent.sessionId.trim() : '';
  const contextSession = typeof context.sessionId === 'string' ? context.sessionId.trim() : '';
  const sessionId = sessionRaw || contextSession || null;
  const payload = rawEvent.props && typeof rawEvent.props === 'object' ? { ...rawEvent.props } : {};
  if (!payload.slug && slug) {
    payload.slug = slug;
  }
  const contextPayload = buildContextPayload(context);
  if (Object.keys(contextPayload).length > 0) {
    payload.__context = contextPayload;
  }

  return {
    event_name: name,
    slug,
    ts: new Date(timestamp).toISOString(),
    session_id: sessionId,
    payload,
    timestamp,
  };
}

function buildRawEventRows(events, context = {}) {
  if (!Array.isArray(events)) return [];
  return events
    .map((event) => normalizeEventPayload(event, context))
    .filter(Boolean)
    .slice(0, MAX_EVENTS_PER_BATCH)
    .map(({ event_name, slug, ts, session_id, payload }) => ({
      event_name,
      slug,
      ts,
      session_id,
      payload,
    }));
}

function floorToTenMinuteBucket(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return new Date(Math.floor(Date.now() / TEN_MINUTES_MS) * TEN_MINUTES_MS).toISOString();
  }
  const bucketStart = Math.floor(date.getTime() / TEN_MINUTES_MS) * TEN_MINUTES_MS;
  return new Date(bucketStart).toISOString();
}

function aggregateForMetrics(rows) {
  const aggregates = new Map();
  for (const row of rows) {
    if (!row) continue;
    const timestamp = new Date(row.ts).getTime();
    const bucket = floorToTenMinuteBucket(timestamp);
    const slugKey = row.slug || GLOBAL_SLUG;
    const key = `${bucket}::${row.event_name}::${slugKey}`;
    if (!aggregates.has(key)) {
      aggregates.set(key, {
        bucket,
        eventName: row.event_name,
        slug: slugKey === GLOBAL_SLUG ? '' : slugKey,
        count: 0,
        sessions: new Set(),
        lastTimestamp: timestamp,
      });
    }
    const entry = aggregates.get(key);
    entry.count += 1;
    entry.lastTimestamp = Math.max(entry.lastTimestamp, timestamp);
    if (row.session_id) {
      entry.sessions.add(row.session_id);
    }
  }
  return aggregates;
}

async function hasRedis() {
  if (isInternalRedisIngestionDisabled()) {
    return false;
  }
  const { hasUpstash } = await import('./redisClient');
  return hasUpstash();
}

async function enqueueEventsToRedis(rows) {
  if (!rows.length) return false;
  const payloads = rows.map((row) => JSON.stringify(row));
  try {
    const { redisCommand } = await import('./redisClient');
    await redisCommand(['RPUSH', REDIS_QUEUE_KEY, ...payloads]);
    return true;
  } catch (error) {
    console.warn('[events] redis enqueue failed', error);
    return false;
  }
}

async function persistRawEvents(rows) {
  if (!rows.length || !hasSupabaseConfig()) return 0;
  try {
    await supabaseRest('events_raw', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: rows,
    });
    return rows.length;
  } catch (error) {
    console.error('[events] failed to persist raw events to Supabase', error);
    throw error;
  }
}

async function updateUniqueSessionSets(aggregates) {
  const results = new Map();
  if (!aggregates.size) return results;

  const entries = [];
  aggregates.forEach((entry, mapKey) => {
    if (entry.sessions && entry.sessions.size > 0) {
      const slugKey = entry.slug || '';
      const redisKey = `${REDIS_UNIQUE_PREFIX}:${entry.bucket}:${entry.eventName}:${slugKey || GLOBAL_SLUG}`;
      entries.push({ mapKey, entry, redisKey });
    } else {
      results.set(mapKey, 0);
    }
  });

  if (!entries.length) {
    return results;
  }

  try {
    const { redisBatch, redisCommand } = await import('./redisClient');
    const commands = entries.map(({ entry, redisKey }) => ['SADD', redisKey, ...entry.sessions]);
    const responses = await redisBatch(commands);

    entries.forEach(({ mapKey, redisKey }, index) => {
      const response = responses[index]?.result ?? responses[index];
      const added = Number(response) || 0;
      results.set(mapKey, added);
      redisCommand(['EXPIRE', redisKey, String(UNIQUE_TTL_SECONDS)]).catch(() => {});
    });
  } catch (error) {
    console.warn('[events] failed to update redis unique sets', error);
    entries.forEach(({ mapKey }) => {
      results.set(mapKey, 0);
    });
  }

  return results;
}

async function fetchExistingMetricRows(keys) {
  if (!keys.length || !hasSupabaseConfig()) return new Map();
  const orConditions = keys
    .map(({ bucket, eventName, slug }) => {
      const slugCondition = slug ? `slug.eq.${slug}` : 'slug.is.null';
      return `and(ts_bucket_10m.eq.${bucket},event_name.eq.${eventName},${slugCondition})`;
    })
    .join(',');
  const params = new URLSearchParams();
  params.set(
    'select',
    'ts_bucket_10m,event_name,slug,visit_count,unique_sessions,last_ts'
  );
  if (orConditions) {
    params.set('or', `(${orConditions})`);
  }

  try {
    const rows = await supabaseRest(`event_metrics_10m?${params.toString()}`);
    const map = new Map();
    if (Array.isArray(rows)) {
      rows.forEach((row) => {
        const slugKey = row.slug === null || row.slug === undefined ? '' : row.slug;
        const key = `${row.ts_bucket_10m}::${row.event_name}::${slugKey || GLOBAL_SLUG}`;
        map.set(key, {
          visit_count: Number(row.visit_count) || 0,
          unique_sessions: Number(row.unique_sessions) || 0,
          last_ts: row.last_ts,
        });
      });
    }
    return map;
  } catch (error) {
    console.error('[events] failed to fetch existing metric rows', error);
    return new Map();
  }
}

async function upsertMetricAggregates(aggregates, uniqueDeltas) {
  if (!aggregates.size || !hasSupabaseConfig()) return;
  const keys = Array.from(aggregates.values()).map((entry) => ({
    bucket: entry.bucket,
    eventName: entry.eventName,
    slug: entry.slug,
  }));
  const existingMap = await fetchExistingMetricRows(keys);

  const rows = Array.from(aggregates.entries()).map(([mapKey, entry]) => {
    const slugValue = entry.slug || null;
    const existing = existingMap.get(mapKey) || { visit_count: 0, unique_sessions: 0, last_ts: null };
    const uniqueDelta = Number(uniqueDeltas.get(mapKey)) || 0;
    const visitCount = Number(existing.visit_count) + entry.count;
    const uniqueSessions = Number(existing.unique_sessions) + uniqueDelta;
    const lastTimestamp = Math.max(Number(existing.last_ts) || 0, entry.lastTimestamp || 0);
    return {
      ts_bucket_10m: entry.bucket,
      event_name: entry.eventName,
      slug: slugValue,
      visit_count: visitCount,
      unique_sessions: uniqueSessions,
      last_ts: lastTimestamp ? new Date(lastTimestamp).toISOString() : entry.bucket,
    };
  });

  try {
    await supabaseRest('event_metrics_10m?on_conflict=ts_bucket_10m,event_name,slug', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: rows,
    });
  } catch (error) {
    console.error('[events] failed to upsert metric aggregates', error);
  }
}

async function flushQueueFromRedis(limit = MAX_REDIS_FLUSH_BATCH) {
  const { redisCommand } = await import('./redisClient');
  const raw = await redisCommand(['LPOP', REDIS_QUEUE_KEY, String(limit)]);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return [raw];
}

async function flushRedisQueue(options = {}) {
  const batchSize = Number(options?.batchSize) > 0 ? Math.min(Number(options.batchSize), MAX_REDIS_FLUSH_BATCH) : MAX_REDIS_FLUSH_BATCH;
  const redisAvailable = await hasRedis();
  if (!redisAvailable) {
    return { flushed: 0, persisted: 0 };
  }

  const rawItems = await flushQueueFromRedis(batchSize);
  if (!rawItems.length) {
    return { flushed: 0, persisted: 0 };
  }

  const rows = rawItems
    .map((item) => {
      try {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item;
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.event_name || !parsed.ts) return null;
        return parsed;
      } catch (error) {
        console.warn('[events] failed to parse redis payload', error);
        return null;
      }
    })
    .filter(Boolean);

  if (!rows.length) {
    return { flushed: rawItems.length, persisted: 0 };
  }

  let persisted = 0;
  try {
    persisted = await persistRawEvents(rows);
  } catch (error) {
    // 실패 시 롤백을 위해 다시 큐에 넣지는 않음. 로그만 남김.
    console.error('[events] failed to persist events after flushing redis', error);
  }

  const aggregates = aggregateForMetrics(rows);
  const uniqueDeltas = await updateUniqueSessionSets(aggregates);
  await upsertMetricAggregates(aggregates, uniqueDeltas);

  return { flushed: rows.length, persisted };
}

function memoryIngest(rows) {
  const store = ensureMemoryStore();
  rows.forEach((row) => {
    store.events.push(row);
  });
  // 메모리 저장소 크기 제한 (최근 10만개 유지)
  if (store.events.length > 100_000) {
    store.events.splice(0, store.events.length - 100_000);
  }
}

function summarizeFromMemory(options = {}) {
  const store = ensureMemoryStore();
  const { startDate, endDate, slug } = options;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const filtered = store.events.filter((event) => {
    if (!event) return false;
    if (slug && event.slug !== slug) return false;
    const ts = new Date(event.ts).getTime();
    if (start && ts < start.getTime()) return false;
    if (end && ts > end.getTime()) return false;
    return true;
  });

  const aggregates = aggregateForMetrics(filtered);
  const totals = { visitCount: 0, uniqueSessions: 0, lastVisitAt: null };
  const slugMap = new Map();
  aggregates.forEach((entry) => {
    totals.visitCount += entry.count;
    totals.uniqueSessions += entry.sessions.size;
    totals.lastVisitAt = Math.max(totals.lastVisitAt || 0, entry.lastTimestamp || 0);
    const slugKey = entry.slug || '';
    const slugEntry = slugMap.get(slugKey) || { count: 0, uniqueSessions: 0, lastTimestamp: 0 };
    slugEntry.count += entry.count;
    slugEntry.uniqueSessions += entry.sessions.size;
    slugEntry.lastTimestamp = Math.max(slugEntry.lastTimestamp, entry.lastTimestamp || 0);
    slugMap.set(slugKey, slugEntry);
  });

  let items = Array.from(slugMap.entries()).map(([slugKey, data]) => ({
    eventName: 'l_visit',
    slug: slugKey,
    count: data.count,
    uniqueSessions: data.uniqueSessions,
    lastTimestamp: data.lastTimestamp,
  }));

  if (options.limit && Number.isFinite(Number(options.limit))) {
    const limit = Math.max(1, Math.round(Number(options.limit)));
    items = items.slice(0, limit);
  }

  const timeseries = Array.from(aggregates.values())
    .map((entry) => ({ date: entry.bucket, count: entry.count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    items,
    totals: {
      visitCount: totals.visitCount,
      uniqueSessions: totals.uniqueSessions,
      lastVisitAt: totals.lastVisitAt ? new Date(totals.lastVisitAt).toISOString() : null,
    },
    timeseriesByGranularity: {
      tenMinute: timeseries,
      daily: timeseries,
      weekly: timeseries,
      monthly: timeseries,
    },
    catalog: {
      events: ['l_visit'],
      slugsByEvent: { l_visit: Array.from(slugMap.keys()).filter(Boolean) },
    },
  };
}

function parseDateBoundary(value, fallback) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date;
}

function toKstISOString(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.toISOString().replace('T', ' ').slice(0, 16);
}

function aggregateSeries(rows, granularity) {
  const map = new Map();
  rows.forEach((row) => {
    const date = new Date(row.ts_bucket_10m || row.bucket || row.date);
    if (Number.isNaN(date.getTime())) return;
    const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    let key;
    if (granularity === 'daily') {
      key = kstDate.toISOString().slice(0, 10);
    } else if (granularity === 'weekly') {
      const temp = new Date(Date.UTC(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate()));
      const day = temp.getUTCDay() || 7;
      temp.setUTCDate(temp.getUTCDate() + 4 - day);
      const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((temp - yearStart) / (24 * 60 * 60 * 1000) + 1) / 7);
      key = `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    } else if (granularity === 'monthly') {
      key = kstDate.toISOString().slice(0, 7);
    } else {
      key = kstDate.toISOString().slice(0, 16).replace('T', ' ');
    }

    if (!map.has(key)) {
      map.set(key, { date: key, count: 0 });
    }
    const entry = map.get(key);
    entry.count += Number(row.visit_count || row.count || 0);
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

async function summarizeFromSupabase(options = {}) {
  if (!hasSupabaseConfig()) {
    return summarizeFromMemory(options);
  }

  const now = new Date();
  const defaultEnd = now;
  const defaultStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const startDate = parseDateBoundary(options.startDate, defaultStart);
  const endDate = parseDateBoundary(options.endDate, defaultEnd);
  const slugFilter = typeof options.slug === 'string' ? options.slug.trim() : '';

  const params = new URLSearchParams();
  params.set('select', 'ts_bucket_10m,event_name,slug,visit_count,unique_sessions,last_ts');
  params.set('event_name', 'eq.l_visit');
  params.set('order', 'ts_bucket_10m.asc');
  params.append('ts_bucket_10m', `gte.${startDate.toISOString()}`);
  params.append('ts_bucket_10m', `lte.${endDate.toISOString()}`);
  if (slugFilter) {
    params.set('slug', `eq.${slugFilter}`);
  }

  let rows = [];
  try {
    const result = await supabaseRest(`event_metrics_10m?${params.toString()}`);
    if (Array.isArray(result)) {
      rows = result;
    }
  } catch (error) {
    console.error('[events] failed to fetch metrics from Supabase', error);
    return summarizeFromMemory(options);
  }

  const totals = {
    visitCount: 0,
    uniqueSessions: 0,
    lastVisitAt: null,
  };

  const slugMap = new Map();
  rows.forEach((row) => {
    const visitCount = Number(row.visit_count) || 0;
    const unique = Number(row.unique_sessions) || 0;
    totals.visitCount += visitCount;
    totals.uniqueSessions += unique;
    const lastTimestamp = row.last_ts ? new Date(row.last_ts).getTime() : 0;
    totals.lastVisitAt = Math.max(totals.lastVisitAt || 0, lastTimestamp);
    const slugKey = row.slug || '';
    const slugEntry = slugMap.get(slugKey) || { count: 0, uniqueSessions: 0, lastTimestamp: 0 };
    slugEntry.count += visitCount;
    slugEntry.uniqueSessions += unique;
    slugEntry.lastTimestamp = Math.max(slugEntry.lastTimestamp, lastTimestamp);
    slugMap.set(slugKey, slugEntry);
  });

  let items = Array.from(slugMap.entries())
    .map(([slugKey, data]) => ({
      eventName: 'l_visit',
      slug: slugKey,
      count: data.count,
      uniqueSessions: data.uniqueSessions,
      lastTimestamp: data.lastTimestamp ? new Date(data.lastTimestamp).toISOString() : null,
    }))
    .sort((a, b) => b.count - a.count);

  if (options.limit && Number.isFinite(Number(options.limit))) {
    const limit = Math.max(1, Math.round(Number(options.limit)));
    items = items.slice(0, limit);
  }

  const seriesTenMinute = rows.map((row) => ({
    date: toKstISOString(row.ts_bucket_10m),
    count: Number(row.visit_count) || 0,
  }));

  const timeseriesByGranularity = {
    tenMinute: seriesTenMinute,
    daily: aggregateSeries(rows, 'daily'),
    weekly: aggregateSeries(rows, 'weekly'),
    monthly: aggregateSeries(rows, 'monthly'),
  };

  const totalsResult = {
    visitCount: totals.visitCount,
    uniqueSessions: totals.uniqueSessions,
    lastVisitAt: totals.lastVisitAt ? new Date(totals.lastVisitAt).toISOString() : null,
  };

  const catalogSlugs = Array.from(slugMap.keys()).filter(Boolean).sort((a, b) => a.localeCompare(b));

  return {
    items,
    totals: totalsResult,
    timeseriesByGranularity,
    catalog: {
      events: ['l_visit'],
      slugsByEvent: { l_visit: catalogSlugs },
    },
  };
}

export async function ingestEvents(events, context = {}) {
  const rows = buildRawEventRows(events, context);
  if (!rows.length) {
    return { ingested: 0 };
  }

  if (await hasRedis()) {
    const enqueued = await enqueueEventsToRedis(rows);
    if (enqueued) {
      return { ingested: rows.length };
    }
  }

  if (hasSupabaseConfig()) {
    try {
      await persistRawEvents(rows);
      const aggregates = aggregateForMetrics(rows);
      const uniqueDeltas = new Map();
      aggregates.forEach((entry, key) => {
        uniqueDeltas.set(key, entry.sessions.size);
      });
      await upsertMetricAggregates(aggregates, uniqueDeltas);
    } catch (error) {
      console.error('[events] direct ingest failed', error);
    }
  } else {
    memoryIngest(rows);
  }

  return { ingested: rows.length };
}

export async function flushVisitEvents(options = {}) {
  return flushRedisQueue(options);
}

export async function getEventSummary(options = {}) {
  return summarizeFromSupabase(options);
}

export async function getEventCatalog() {
  const summary = await summarizeFromSupabase({});
  return summary.catalog;
}
