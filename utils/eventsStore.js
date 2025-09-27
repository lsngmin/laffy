import {
  hasSupabaseConfig,
  callSupabaseRpc,
  supabaseRest,
  SUPABASE_EVENTS_ROLLUP_FUNCTION,
  SUPABASE_EVENTS_ROLLUP_TABLE,
} from './supabaseClient';
import { isInternalRedisIngestionDisabled } from './internalRedisToggle';

const DEFAULT_RANGE_DAYS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const CATALOG_KEY = 'events:catalog';
const GLOBAL_SLUG = '__global__';
const MAX_EVENTS_PER_BATCH = 10;
const KST_TIMEZONE = 'Asia/Seoul';
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const ALLOWED_EVENT_NAMES = new Set(['x_visit']);
const RAW_TABLE_PATH = 'events_raw';

function formatDateKey(date) {
  try {
    return DATE_FORMATTER.format(date);
  } catch (error) {
    console.warn('[events] failed to format KST date', error);
    return new Date().toISOString().slice(0, 10);
  }
}

function toDateKey(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return formatDateKey(new Date());
  }
  return formatDateKey(date);
}

function startOfDayInKst(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  const key = formatDateKey(date);
  const [yearRaw, monthRaw, dayRaw] = key.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date();
  }
  const utcMillis = Date.UTC(year, month - 1, day);
  return new Date(utcMillis - KST_OFFSET_MS);
}

function clampLimit(value, fallback = 50) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(500, Math.round(num));
}

function parseDateInput(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return startOfDayInKst(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : startOfDayInKst(date);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const iso = trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00+09:00`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return startOfDayInKst(parsed);
  }
  return null;
}

function normalizeRange(startInput, endInput) {
  const now = startOfDayInKst(new Date());
  const defaultEnd = now;
  const defaultStart = startOfDayInKst(new Date(now.getTime() - DEFAULT_RANGE_DAYS * DAY_MS));

  const startDate = parseDateInput(startInput) || defaultStart;
  const endDate = parseDateInput(endInput) || defaultEnd;

  if (startDate > endDate) {
    return { start: endDate, end: endDate };
  }

  const start = startOfDayInKst(startDate);
  const end = startOfDayInKst(endDate);
  return { start, end };
}

function rangeToDateKeys(range) {
  if (!range?.start || !range?.end) return [];
  const keys = [];
  const cursor = new Date(range.start.getTime());
  const endTime = range.end.getTime();
  while (cursor.getTime() <= endTime) {
    keys.push(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

function serializeCombo(name, slug) {
  return `${name}::${slug || GLOBAL_SLUG}`;
}

function deserializeCombo(value) {
  if (typeof value !== 'string') return null;
  const [name, slug] = value.split('::');
  if (!name) return null;
  return { name, slug: slug === undefined ? GLOBAL_SLUG : slug };
}

function normalizeSlug(slug) {
  if (typeof slug !== 'string') return '';
  const trimmed = slug.trim();
  return trimmed ? trimmed : '';
}

function normalizeEventPayload(event) {
  if (!event || typeof event !== 'object') return null;
  const name = typeof event.name === 'string' ? event.name.trim() : '';
  if (!name) return null;
  const slug = normalizeSlug(event.slug || event.props?.slug);
  const tsRaw = event.ts ?? Date.now();
  const ts = Number(tsRaw);
  const timestamp = Number.isFinite(ts) ? ts : Date.now();
  const sessionId = typeof event.sessionId === 'string' ? event.sessionId.trim() : '';
  const value = Number(event.value ?? event.props?.value);
  const numericValue = Number.isFinite(value) ? value : 0;
  return {
    name,
    slug,
    timestamp,
    sessionId,
    value: numericValue,
  };
}

function classifyEventName(name) {
  if (typeof name !== 'string') {
    return { isPageView: false, isVisitor: false, isBounce: false };
  }
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    return { isPageView: false, isVisitor: false, isBounce: false };
  }
  const isPageView = /page\s*view|view|pv/.test(normalized);
  const isVisitor = /visit|session|enter|start/.test(normalized);
  const isBounce = /bounce|exit|leave|drop/.test(normalized);
  return { isPageView, isVisitor, isBounce };
}

function isVisitorEvent(name) {
  if (typeof name !== 'string') return false;
  const normalized = name.trim();
  if (!normalized) return false;
  return ALLOWED_EVENT_NAMES.has(normalized);
}

function buildRawEventRows(events, context = {}) {
  if (!Array.isArray(events)) return [];
  const rows = [];
  for (const rawEvent of events) {
    if (!rawEvent || typeof rawEvent !== 'object') continue;
    const name = typeof rawEvent.name === 'string' ? rawEvent.name.trim() : '';
    if (!name || !ALLOWED_EVENT_NAMES.has(name)) continue;

    const slug = normalizeSlug(rawEvent.slug || rawEvent.props?.slug || rawEvent.props?.path || '');
    const tsValue = Number(rawEvent.ts ?? Date.now());
    const timestamp = Number.isFinite(tsValue) ? tsValue : Date.now();
    const sessionIdRaw = typeof rawEvent.sessionId === 'string' ? rawEvent.sessionId.trim() : '';
    const contextSession = typeof context.sessionId === 'string' ? context.sessionId.trim() : '';
    const sessionId = sessionIdRaw || contextSession || null;

    const props = rawEvent.props && typeof rawEvent.props === 'object' ? { ...rawEvent.props } : {};
    if (!props.slug && slug) {
      props.slug = slug;
    }

    const contextMeta = {};
    if (context.ip) contextMeta.ip = context.ip;
    if (context.referer) contextMeta.referer = context.referer;
    if (context.origin) contextMeta.origin = context.origin;
    if (context.userAgent) contextMeta.userAgent = context.userAgent;
    if (context.receivedAt) contextMeta.receivedAt = context.receivedAt;
    if (Object.keys(contextMeta).length > 0) {
      props.__context = contextMeta;
    }

    rows.push({
      event_name: name,
      slug,
      ts: new Date(timestamp).toISOString(),
      session_id: sessionId,
      payload: props,
    });
  }
  return rows;
}

async function persistRawEventsToSupabase(events, context = {}) {
  if (!hasSupabaseConfig()) return;
  const rows = buildRawEventRows(events, context);
  if (!rows.length) return;

  try {
    await supabaseRest(RAW_TABLE_PATH, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: rows,
    });
  } catch (error) {
    console.warn('[events] supabase raw ingest failed', error);
  }
}

async function redisCommand(command, options) {
  const { redisCommand: exec } = await import('./redisClient');
  return exec(command, options);
}

async function hasRedis() {
  if (isInternalRedisIngestionDisabled()) {
    return false;
  }
  const { hasUpstash } = await import('./redisClient');
  return hasUpstash();
}

function ensureMemoryStore() {
  if (!global.__eventStore) {
    global.__eventStore = {
      catalog: new Set(),
      daily: new Map(),
      totals: new Map(),
    };
  }
  return global.__eventStore;
}

function memoryKey(dateKey, comboKey) {
  return `${dateKey}::${comboKey}`;
}

function aggregateCatalogFromMemory() {
  const store = ensureMemoryStore();
  const events = new Set();
  const slugsByEvent = new Map();
  store.catalog.forEach((comboKey) => {
    const combo = deserializeCombo(comboKey);
    if (!combo) return;
    if (!isVisitorEvent(combo.name)) return;
    events.add(combo.name);
    if (!slugsByEvent.has(combo.name)) slugsByEvent.set(combo.name, new Set());
    if (combo.slug && combo.slug !== GLOBAL_SLUG) {
      slugsByEvent.get(combo.name).add(combo.slug);
    }
  });
  const catalog = {
    events: Array.from(events).sort((a, b) => a.localeCompare(b)),
    slugsByEvent: {},
  };
  slugsByEvent.forEach((slugSet, eventName) => {
    catalog.slugsByEvent[eventName] = Array.from(slugSet).sort((a, b) => a.localeCompare(b));
  });
  return catalog;
}

function aggregateEventsForRedis(events, context = {}) {
  const aggregates = new Map();
  const comboSet = new Set();

  for (const rawEvent of events) {
    const normalized = normalizeEventPayload({ ...rawEvent, sessionId: rawEvent.sessionId || context.sessionId });
    if (!normalized) continue;
    if (!isVisitorEvent(normalized.name)) continue;

    const slugKey = normalized.slug || GLOBAL_SLUG;
    const comboKey = serializeCombo(normalized.name, slugKey);
    comboSet.add(comboKey);

    const dateKey = toDateKey(normalized.timestamp);
    const aggregateKey = `${dateKey}::${normalized.name}::${slugKey}`;
    if (!aggregates.has(aggregateKey)) {
      aggregates.set(aggregateKey, {
        dateKey,
        name: normalized.name,
        slugKey,
        count: 0,
        valueSum: 0,
        sessions: new Set(),
        lastTimestamp: 0,
      });
    }

    const entry = aggregates.get(aggregateKey);
    entry.count += 1;
    if (Number.isFinite(normalized.value) && normalized.value !== 0) {
      entry.valueSum += normalized.value;
    }
    if (normalized.sessionId) {
      entry.sessions.add(normalized.sessionId);
    }
    if (normalized.timestamp > entry.lastTimestamp) {
      entry.lastTimestamp = normalized.timestamp;
    }
  }

  return {
    combos: Array.from(comboSet),
    aggregates: Array.from(aggregates.values()),
  };
}

async function persistEventAggregatesToSupabase(aggregates) {
  if (!Array.isArray(aggregates) || aggregates.length === 0) return;
  if (!hasSupabaseConfig()) return;

  const rows = aggregates
    .filter((entry) => entry?.count > 0)
    .map((entry) => ({
      date_key: entry.dateKey,
      event_name: entry.name,
      slug: entry.slugKey === GLOBAL_SLUG ? null : entry.slugKey,
      count: entry.count,
      value_sum: entry.valueSum,
      uniq_sessions: entry.sessions instanceof Set ? entry.sessions.size : Number(entry.sessionCount || 0),
      last_ts: entry.lastTimestamp || null,
    }))
    .filter((row) => row.count > 0);

  if (!rows.length) return;

  try {
    await callSupabaseRpc(SUPABASE_EVENTS_ROLLUP_FUNCTION, { rows });
  } catch (error) {
    console.warn('[events] supabase ingest failed', error);
  }
}

async function fetchEventRollupsFromSupabase({ startDateKey, endDateKey, eventName, slug }) {
  if (!hasSupabaseConfig()) return [];
  if (!startDateKey || !endDateKey) return [];

  const params = new URLSearchParams();
  params.set('select', 'date_key,event_name,slug,count,value_sum,uniq_sessions,last_ts');
  params.append('date_key', `gte.${startDateKey}`);
  params.append('date_key', `lte.${endDateKey}`);
  params.set('order', 'date_key.asc,event_name.asc,slug.asc');

  if (eventName && typeof eventName === 'string') {
    params.set('event_name', `eq.${eventName.trim()}`);
  }

  if (typeof slug === 'string') {
    const trimmed = slug.trim();
    if (trimmed) {
      params.set('slug', `eq.${trimmed}`);
    } else {
      params.set('slug', 'is.null');
    }
  }

  try {
    const rows = await supabaseRest(`${SUPABASE_EVENTS_ROLLUP_TABLE}?${params.toString()}`);
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      dateKey: typeof row.date_key === 'string' ? row.date_key : toDateKey(row.date_key),
      name: row.event_name,
      slugKey: row.slug === null || row.slug === undefined || row.slug === '' ? GLOBAL_SLUG : row.slug,
      count: Number(row.count) || 0,
      valueSum: Number(row.value_sum) || 0,
      uniqueSessions: Number(row.uniq_sessions) || 0,
      lastTimestamp: Number(row.last_ts) || 0,
    }));
  } catch (error) {
    console.warn('[events] supabase summary fetch failed', error);
    return [];
  }
}

async function ingestWithRedis(events, context = {}) {
  const limitedEvents = Array.isArray(events) ? events.slice(0, MAX_EVENTS_PER_BATCH) : [];
  const { combos, aggregates } = aggregateEventsForRedis(limitedEvents, context);
  if (!aggregates.length) {
    return { ingested: 0 };
  }

  const tasks = [];

  if (combos.length) {
    tasks.push(redisCommand(['SADD', CATALOG_KEY, ...combos]));
  }

  for (const entry of aggregates) {
    const aggKey = `events:agg:${entry.dateKey}:${entry.name}:${entry.slugKey}`;
    const sessionKey = `events:sessions:${entry.dateKey}:${entry.name}:${entry.slugKey}`;

    tasks.push(redisCommand(['HINCRBY', aggKey, 'count', String(entry.count)]));

    if (entry.valueSum !== 0) {
      tasks.push(redisCommand(['HINCRBYFLOAT', aggKey, 'sum_value', String(entry.valueSum)]));
    }

    if (entry.lastTimestamp) {
      tasks.push(redisCommand(['HSET', aggKey, 'last_ts', String(entry.lastTimestamp)]));
    }

    if (entry.sessions.size) {
      const sessionArgs = ['PFADD', sessionKey, ...entry.sessions];
      tasks.push(redisCommand(sessionArgs));
    }
  }

  let redisSucceeded = false;
  try {
    await Promise.all(tasks);
    redisSucceeded = true;
  } catch (error) {
    console.warn('[events] redis ingest failed, falling back to memory', error);
  }

  await persistEventAggregatesToSupabase(aggregates);

  if (!redisSucceeded) {
    return ingestWithMemory(limitedEvents, context);
  }

  return { ingested: limitedEvents.length };
}

function ingestWithMemory(events, context = {}) {
  const store = ensureMemoryStore();
  let ingested = 0;
  events.forEach((rawEvent) => {
    const normalized = normalizeEventPayload({ ...rawEvent, sessionId: rawEvent.sessionId || context.sessionId });
    if (!normalized) return;
    if (!isVisitorEvent(normalized.name)) return;
    const comboKey = serializeCombo(normalized.name, normalized.slug || GLOBAL_SLUG);
    store.catalog.add(comboKey);
    const dateKey = toDateKey(normalized.timestamp);
    const dailyKey = memoryKey(dateKey, comboKey);
    const dailyEntry = store.daily.get(dailyKey) || { count: 0, sessions: new Set(), lastTs: 0, sumValue: 0 };
    dailyEntry.count += 1;
    dailyEntry.lastTs = Math.max(dailyEntry.lastTs, normalized.timestamp);
    if (normalized.value) dailyEntry.sumValue += normalized.value;
    if (normalized.sessionId) dailyEntry.sessions.add(normalized.sessionId);
    store.daily.set(dailyKey, dailyEntry);

    const totalEntry = store.totals.get(comboKey) || { count: 0, sessions: new Set(), lastTs: 0, sumValue: 0 };
    totalEntry.count += 1;
    totalEntry.lastTs = Math.max(totalEntry.lastTs, normalized.timestamp);
    if (normalized.value) totalEntry.sumValue += normalized.value;
    if (normalized.sessionId) totalEntry.sessions.add(normalized.sessionId);
    store.totals.set(comboKey, totalEntry);
    ingested += 1;
  });
  return { ingested };
}

async function fetchCatalogFromRedis() {
  try {
    const result = await redisCommand(['SMEMBERS', CATALOG_KEY], { allowReadOnly: true });
    if (!Array.isArray(result)) return [];
    return result;
  } catch (error) {
    console.warn('[events] failed to read catalog from redis', error);
    return [];
  }
}

function buildCatalogFromCombos(combos) {
  const events = new Set();
  const slugsByEvent = new Map();
  combos.forEach((comboKey) => {
    const combo = deserializeCombo(comboKey);
    if (!combo) return;
    if (!isVisitorEvent(combo.name)) return;
    events.add(combo.name);
    if (!slugsByEvent.has(combo.name)) slugsByEvent.set(combo.name, new Set());
    if (combo.slug && combo.slug !== GLOBAL_SLUG) {
      slugsByEvent.get(combo.name).add(combo.slug);
    }
  });
  const catalog = {
    events: Array.from(events).sort((a, b) => a.localeCompare(b)),
    slugsByEvent: {},
  };
  slugsByEvent.forEach((slugSet, eventName) => {
    catalog.slugsByEvent[eventName] = Array.from(slugSet).sort((a, b) => a.localeCompare(b));
  });
  return catalog;
}

function filterCombos(combos, filters = {}) {
  const { eventName, slug } = filters;
  const normalizedEvent = typeof eventName === 'string' ? eventName.trim() : '';
  const normalizedSlug = normalizeSlug(slug);
  return combos
    .map((comboKey) => deserializeCombo(comboKey))
    .filter(Boolean)
    .filter((combo) => {
      if (normalizedEvent && combo.name !== normalizedEvent) return false;
      if (normalizedSlug) {
        const slugKey = combo.slug === GLOBAL_SLUG ? '' : combo.slug;
        if (slugKey !== normalizedSlug) return false;
      }
      return true;
    })
    .filter((combo) => isVisitorEvent(combo.name));
}

function entriesToObject(entries) {
  if (!Array.isArray(entries)) return {};
  const obj = {};
  for (let i = 0; i < entries.length; i += 2) {
    const key = entries[i];
    const value = entries[i + 1];
    obj[key] = value;
  }
  return obj;
}

async function getSummaryFromRedis(options = {}) {
  const range = normalizeRange(options.startDate, options.endDate);
  const dateKeys = rangeToDateKeys(range);
  const limit = clampLimit(options.limit, 50);
  const combosRaw = await fetchCatalogFromRedis();
  const catalog = buildCatalogFromCombos(combosRaw);
  const combos = filterCombos(combosRaw, {
    eventName: options.eventName,
    slug: options.slug,
  });

  if (!dateKeys.length || combos.length === 0) {
    return {
      items: [],
      totals: {
        count: 0,
        uniqueSessions: 0,
        visitors: 0,
        pageViews: 0,
        bounceEvents: 0,
        bounceRate: 0,
        pageViewEventNames: [],
        visitorEventNames: [],
        bounceEventNames: [],
      },
      timeseries: [],
      catalog,
    };
  }

  const items = [];
  const timeseriesMap = new Map();
  let totalCount = 0;
  let totalUnique = 0;
  let totalPageViews = 0;
  let totalBounceEvents = 0;
  const pageViewEvents = new Set();
  const visitorEvents = new Set();
  const bounceEvents = new Set();

  const todayKey = toDateKey(Date.now());
  const supabaseRollups = await fetchEventRollupsFromSupabase({
    startDateKey: dateKeys[0],
    endDateKey: dateKeys[dateKeys.length - 1],
    eventName: options.eventName,
    slug: options.slug,
  });

  const supabaseMap = new Map();
  for (const row of supabaseRollups) {
    if (!row || !row.dateKey || !row.name) continue;
    if (!isVisitorEvent(row.name)) continue;
    const key = `${row.dateKey}::${row.name}::${row.slugKey}`;
    const existing = supabaseMap.get(key);
    if (existing) {
      existing.count += row.count;
      existing.valueSum += row.valueSum;
      existing.uniqueSessions += row.uniqueSessions;
      existing.lastTimestamp = Math.max(existing.lastTimestamp, row.lastTimestamp || 0);
    } else {
      supabaseMap.set(key, { ...row });
    }
  }

  for (const combo of combos) {
    const slugKey = combo.slug || GLOBAL_SLUG;
    let comboCount = 0;
    let comboValue = 0;
    let lastTs = 0;
    let supabaseUnique = 0;
    const redisSessionKeys = [];
    const redisDateKeys = [];

    for (const dateKey of dateKeys) {
      const supaKey = `${dateKey}::${combo.name}::${slugKey}`;
      const supaRow = supabaseMap.get(supaKey);
      if (supaRow && dateKey !== todayKey) {
        comboCount += supaRow.count;
        comboValue += supaRow.valueSum;
        supabaseUnique += supaRow.uniqueSessions;
        lastTs = Math.max(lastTs, supaRow.lastTimestamp || 0);
        const dateEntry = timeseriesMap.get(dateKey) || { count: 0, value: 0 };
        dateEntry.count += supaRow.count;
        dateEntry.value += supaRow.valueSum;
        timeseriesMap.set(dateKey, dateEntry);
      } else {
        redisDateKeys.push(dateKey);
      }
    }

    if (redisDateKeys.length) {
      const redisResults = await Promise.all(
        redisDateKeys.map((dateKey) =>
          redisCommand(['HGETALL', `events:agg:${dateKey}:${combo.name}:${slugKey}`], {
            allowReadOnly: true,
          })
        )
      );

      redisResults.forEach((raw, index) => {
        if (!Array.isArray(raw) || raw.length === 0) return;
        const data = entriesToObject(raw);
        const count = Number(data.count) || 0;
        const valueSum = Number(data.sum_value) || 0;
        const last = Number(data.last_ts) || 0;
        if (count <= 0) return;
        const dateKey = redisDateKeys[index];
        comboCount += count;
        comboValue += Number.isFinite(valueSum) ? valueSum : 0;
        lastTs = Math.max(lastTs, last);
        const dateEntry = timeseriesMap.get(dateKey) || { count: 0, value: 0 };
        dateEntry.count += count;
        dateEntry.value += Number.isFinite(valueSum) ? valueSum : 0;
        timeseriesMap.set(dateKey, dateEntry);
        redisSessionKeys.push(`events:sessions:${dateKey}:${combo.name}:${slugKey}`);
      });
    }

    if (!comboCount) continue;

    let redisUnique = 0;
    if (redisSessionKeys.length) {
      try {
        const result = await redisCommand(['PFCOUNT', ...redisSessionKeys], { allowReadOnly: true });
        redisUnique = Number(result) || 0;
      } catch (error) {
        console.warn('[events] PFCOUNT failed', error);
      }
    }

    const uniqueSessions = supabaseUnique + redisUnique;

    totalCount += comboCount;
    totalUnique += uniqueSessions;

    const { isPageView, isVisitor, isBounce } = classifyEventName(combo.name);
    if (isPageView) {
      totalPageViews += comboCount;
      pageViewEvents.add(combo.name);
    }
    if (isVisitor) {
      visitorEvents.add(combo.name);
    }
    if (isBounce) {
      totalBounceEvents += comboCount;
      bounceEvents.add(combo.name);
    }

    items.push({
      eventName: combo.name,
      slug: slugKey === GLOBAL_SLUG ? '' : combo.slug,
      count: comboCount,
      uniqueSessions,
      valueSum: comboValue,
      lastTimestamp: lastTs || null,
      lastDate: lastTs ? new Date(lastTs).toISOString() : null,
    });
  }

  items.sort((a, b) => b.count - a.count);
  const limitedItems = limit ? items.slice(0, limit) : items;
  const timeseries = Array.from(timeseriesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, count: value.count, valueSum: value.value }));

  const visitors = totalUnique;
  const effectivePageViews = pageViewEvents.size ? totalPageViews : totalCount;
  const bounceRate = visitors > 0 ? totalBounceEvents / visitors : 0;

  return {
    items: limitedItems,
    totals: {
      count: totalCount,
      uniqueSessions: totalUnique,
      visitors,
      pageViews: effectivePageViews,
      bounceEvents: totalBounceEvents,
      bounceRate,
      pageViewEventNames: Array.from(pageViewEvents),
      visitorEventNames: Array.from(visitorEvents),
      bounceEventNames: Array.from(bounceEvents),
    },
    timeseries,
    catalog,
  };
}

function getSummaryFromMemory(options = {}) {
  const store = ensureMemoryStore();
  const range = normalizeRange(options.startDate, options.endDate);
  const dateKeys = rangeToDateKeys(range);
  const limit = clampLimit(options.limit, 50);
  const combosRaw = Array.from(store.catalog);
  const catalog = aggregateCatalogFromMemory();
  const combos = filterCombos(combosRaw, {
    eventName: options.eventName,
    slug: options.slug,
  });

  const items = [];
  const timeseriesMap = new Map();
  let totalCount = 0;
  let totalUnique = 0;
  let totalPageViews = 0;
  let totalBounceEvents = 0;
  const pageViewEvents = new Set();
  const visitorEvents = new Set();
  const bounceEvents = new Set();

  combos.forEach((combo) => {
    const slugKey = combo.slug || GLOBAL_SLUG;
    const comboKey = serializeCombo(combo.name, slugKey);
    let comboCount = 0;
    let comboValue = 0;
    let lastTs = 0;
    const sessionSet = new Set();

    dateKeys.forEach((dateKey) => {
      const dailyKey = memoryKey(dateKey, comboKey);
      const daily = store.daily.get(dailyKey);
      if (!daily || daily.count <= 0) return;
      comboCount += daily.count;
      comboValue += daily.sumValue || 0;
      lastTs = Math.max(lastTs, daily.lastTs || 0);
      daily.sessions.forEach((sessionId) => sessionSet.add(sessionId));
      const dateEntry = timeseriesMap.get(dateKey) || { count: 0, value: 0 };
      dateEntry.count += daily.count;
      dateEntry.value += daily.sumValue || 0;
      timeseriesMap.set(dateKey, dateEntry);
    });

    if (!comboCount) return;
    totalCount += comboCount;
    totalUnique += sessionSet.size;

    const { isPageView, isVisitor, isBounce } = classifyEventName(combo.name);
    if (isPageView) {
      totalPageViews += comboCount;
      pageViewEvents.add(combo.name);
    }
    if (isVisitor) {
      visitorEvents.add(combo.name);
    }
    if (isBounce) {
      totalBounceEvents += comboCount;
      bounceEvents.add(combo.name);
    }
    items.push({
      eventName: combo.name,
      slug: slugKey === GLOBAL_SLUG ? '' : combo.slug,
      count: comboCount,
      uniqueSessions: sessionSet.size,
      valueSum: comboValue,
      lastTimestamp: lastTs || null,
      lastDate: lastTs ? new Date(lastTs).toISOString() : null,
    });
  });

  items.sort((a, b) => b.count - a.count);
  const limitedItems = limit ? items.slice(0, limit) : items;
  const timeseries = Array.from(timeseriesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, count: value.count, valueSum: value.value }));

  const visitors = totalUnique;
  const effectivePageViews = pageViewEvents.size ? totalPageViews : totalCount;
  const bounceRate = visitors > 0 ? totalBounceEvents / visitors : 0;

  return {
    items: limitedItems,
    totals: {
      count: totalCount,
      uniqueSessions: totalUnique,
      visitors,
      pageViews: effectivePageViews,
      bounceEvents: totalBounceEvents,
      bounceRate,
      pageViewEventNames: Array.from(pageViewEvents),
      visitorEventNames: Array.from(visitorEvents),
      bounceEventNames: Array.from(bounceEvents),
    },
    timeseries,
    catalog,
  };
}

export async function ingestEvents(events, context = {}) {
  if (!Array.isArray(events) || !events.length) {
    return { ingested: 0 };
  }

  const limitedEvents = events.slice(0, MAX_EVENTS_PER_BATCH);

  try {
    await persistRawEventsToSupabase(limitedEvents, context);
  } catch (error) {
    console.warn('[events] failed to persist raw events', error);
  }

  if (await hasRedis()) {
    return ingestWithRedis(limitedEvents, context);
  }

  const { aggregates } = aggregateEventsForRedis(limitedEvents, context);
  await persistEventAggregatesToSupabase(aggregates);

  return ingestWithMemory(limitedEvents, context);
}

export async function getEventSummary(options = {}) {
  if (await hasRedis()) {
    return getSummaryFromRedis(options);
  }
  return getSummaryFromMemory(options);
}

export async function getEventCatalog() {
  if (await hasRedis()) {
    const combos = await fetchCatalogFromRedis();
    return buildCatalogFromCombos(combos);
  }
  return aggregateCatalogFromMemory();
}
