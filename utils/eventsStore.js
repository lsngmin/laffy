const DEFAULT_RANGE_DAYS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_TTL_SECONDS = 60 * 60 * 24 * 45; // 45 days
const TOTAL_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year
const CATALOG_KEY = 'events:catalog';
const GLOBAL_SLUG = '__global__';
const KST_TIMEZONE = 'Asia/Seoul';
const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

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

async function redisCommand(command, options) {
  const { redisCommand: exec } = await import('./redisClient');
  return exec(command, options);
}

async function hasRedis() {
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

async function ingestWithRedis(events, context = {}) {
  const tasks = [];
  for (const rawEvent of events) {
    const normalized = normalizeEventPayload({ ...rawEvent, sessionId: rawEvent.sessionId || context.sessionId });
    if (!normalized) continue;
    const comboKey = serializeCombo(normalized.name, normalized.slug || GLOBAL_SLUG);
    const dateKey = toDateKey(normalized.timestamp);
    const slugKey = normalized.slug || GLOBAL_SLUG;
    const aggKey = `events:agg:${dateKey}:${normalized.name}:${slugKey}`;
    const sessionKey = `events:sessions:${dateKey}:${normalized.name}:${slugKey}`;
    const totalKey = `events:total:${normalized.name}:${slugKey}`;
    const totalSessionKey = `events:totaluniq:${normalized.name}:${slugKey}`;
    const dateIndexKey = `events:index:${normalized.name}:${slugKey}`;
    const sessionIndexKey = `events:sessions:index:${normalized.name}:${slugKey}`;

    tasks.push(
      redisCommand(['SADD', CATALOG_KEY, comboKey]),
      redisCommand(['HINCRBY', aggKey, 'count', 1]),
      redisCommand(['HSET', aggKey, 'last_ts', String(normalized.timestamp)]),
      redisCommand(['EXPIRE', aggKey, String(DAILY_TTL_SECONDS)]),
      redisCommand(['HINCRBY', totalKey, 'count', 1]),
      redisCommand(['HSET', totalKey, 'last_ts', String(normalized.timestamp)]),
      redisCommand(['EXPIRE', totalKey, String(TOTAL_TTL_SECONDS)]),
      redisCommand(['SADD', dateIndexKey, dateKey]),
      redisCommand(['EXPIRE', dateIndexKey, String(DAILY_TTL_SECONDS)]),
    );

    if (normalized.value) {
      tasks.push(
        redisCommand(['HINCRBYFLOAT', aggKey, 'sum_value', String(normalized.value)]),
        redisCommand(['HINCRBYFLOAT', totalKey, 'sum_value', String(normalized.value)]),
      );
    }

    if (normalized.sessionId) {
      tasks.push(
        redisCommand(['PFADD', sessionKey, normalized.sessionId]),
        redisCommand(['EXPIRE', sessionKey, String(DAILY_TTL_SECONDS)]),
        redisCommand(['PFADD', totalSessionKey, normalized.sessionId]),
        redisCommand(['EXPIRE', totalSessionKey, String(TOTAL_TTL_SECONDS)]),
        redisCommand(['SADD', sessionIndexKey, dateKey]),
        redisCommand(['EXPIRE', sessionIndexKey, String(DAILY_TTL_SECONDS)]),
        redisCommand(['HINCRBY', aggKey, 'session_events', 1]),
        redisCommand(['HINCRBY', totalKey, 'session_events', 1]),
      );
    }
  }

  if (!tasks.length) return { ingested: 0 };
  try {
    await Promise.all(tasks);
    return { ingested: events.length };
  } catch (error) {
    console.warn('[events] redis ingest failed, falling back to memory', error);
    return ingestWithMemory(events, context);
  }
}

function ingestWithMemory(events, context = {}) {
  const store = ensureMemoryStore();
  let ingested = 0;
  events.forEach((rawEvent) => {
    const normalized = normalizeEventPayload({ ...rawEvent, sessionId: rawEvent.sessionId || context.sessionId });
    if (!normalized) return;
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
    });
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
  const dateKeySet = new Set(dateKeys);
  const limit = clampLimit(options.limit, 50);
  const combosRaw = await fetchCatalogFromRedis();
  const catalog = buildCatalogFromCombos(combosRaw);
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

  for (const combo of combos) {
    const slugKey = combo.slug || GLOBAL_SLUG;
    const sessionKeys = [];
    let comboCount = 0;
    let comboValue = 0;
    let lastTs = 0;

    const dateIndexKey = `events:index:${combo.name}:${slugKey}`;
    const sessionIndexKey = `events:sessions:index:${combo.name}:${slugKey}`;
    let indexedDates = null;
    let rawDateIndex = null;
    let sessionIndexedDates = null;
    let rawSessionIndex = null;
    try {
      const result = await redisCommand(['SMEMBERS', dateIndexKey], { allowReadOnly: true });
      if (Array.isArray(result)) {
        rawDateIndex = result;
        if (result.length) {
          indexedDates = result.filter((value) => dateKeySet.has(value));
          if (!indexedDates.length) indexedDates = [];
        }
      }
    } catch (error) {
      console.warn('[events] failed to read daily index', { combo: combo.name, slug: slugKey }, error);
    }

    try {
      const result = await redisCommand(['SMEMBERS', sessionIndexKey], { allowReadOnly: true });
      if (Array.isArray(result)) {
        rawSessionIndex = result;
        if (result.length) {
          sessionIndexedDates = result.filter((value) => dateKeySet.has(value));
          if (!sessionIndexedDates.length) sessionIndexedDates = [];
        }
      }
    } catch (error) {
      console.warn('[events] failed to read session index', { combo: combo.name, slug: slugKey }, error);
    }

    const hasDateIndex = Array.isArray(rawDateIndex) && rawDateIndex.length > 0;
    const hasSessionIndex = Array.isArray(rawSessionIndex) && rawSessionIndex.length > 0;
    const indexedSourceDates = Array.isArray(indexedDates) ? indexedDates : [];
    const indexedDateSet = hasDateIndex ? new Set(indexedSourceDates) : null;
    const availableDateKeys = hasDateIndex && indexedDateSet
      ? dateKeys.filter((key) => indexedDateSet.has(key))
      : dateKeys;
    const availableDateSet = new Set(availableDateKeys);

    if (hasDateIndex && availableDateKeys.length === 0) {
      continue;
    }

    const dailyResults = await Promise.all(
      availableDateKeys.map((dateKey) =>
        redisCommand(['HGETALL', `events:agg:${dateKey}:${combo.name}:${slugKey}`], {
          allowReadOnly: true,
        })
      )
    );

    const sessionSourceDates = Array.isArray(sessionIndexedDates) ? sessionIndexedDates : [];
    const sessionDateSet = hasSessionIndex
      ? new Set(sessionSourceDates.filter((key) => availableDateSet.has(key)))
      : null;

    dailyResults.forEach((raw, index) => {
      if (!Array.isArray(raw) || raw.length === 0) return;
      const data = entriesToObject(raw);
      const count = Number(data.count) || 0;
      const valueSum = Number(data.sum_value) || 0;
      const last = Number(data.last_ts) || 0;
      if (count <= 0) return;
      comboCount += count;
      comboValue += Number.isFinite(valueSum) ? valueSum : 0;
      lastTs = Math.max(lastTs, last);
      const dateKey = availableDateKeys[index];
      const dateEntry = timeseriesMap.get(dateKey) || { count: 0, value: 0 };
      dateEntry.count += count;
      dateEntry.value += Number.isFinite(valueSum) ? valueSum : 0;
      timeseriesMap.set(dateKey, dateEntry);
      const sessionEventsRaw = data.session_events;
      const hasSessionEventsField = Object.prototype.hasOwnProperty.call(data, 'session_events');
      const sessionEvents = Number(sessionEventsRaw) || 0;
      const shouldCountSessions =
        (hasSessionIndex && sessionDateSet && sessionDateSet.has(dateKey) && sessionEvents > 0) ||
        (!hasSessionIndex && (!hasSessionEventsField ? count > 0 : sessionEvents > 0));
      if (shouldCountSessions) {
        sessionKeys.push(`events:sessions:${dateKey}:${combo.name}:${slugKey}`);
      }
    });

    if (!comboCount) continue;

    let uniqueSessions = 0;
    if (sessionKeys.length) {
      try {
        const result = await redisCommand(['PFCOUNT', ...sessionKeys], { allowReadOnly: true });
        uniqueSessions = Number(result) || 0;
      } catch (error) {
        console.warn('[events] PFCOUNT failed', error);
      }
    }

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

  if (await hasRedis()) {
    return ingestWithRedis(events, context);
  }

  return ingestWithMemory(events, context);
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
