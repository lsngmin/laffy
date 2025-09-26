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

async function redisEvalScript(script, keys, args, options) {
  const { redisEval } = await import('./redisClient');
  return redisEval(script, keys, args, options);
}

async function hasRedis() {
  const { hasUpstash } = await import('./redisClient');
  return hasUpstash();
}

const INGEST_LUA_SCRIPT = `
local catalogKey = KEYS[1]
local aggKey = KEYS[2]
local totalKey = KEYS[3]
local sessionKey = KEYS[4]
local totalSessionKey = KEYS[5]

local comboValue = ARGV[1]
local timestamp = ARGV[2]
local hasValue = ARGV[3]
local value = tonumber(ARGV[4] or '0')
local hasSession = ARGV[5]
local sessionId = ARGV[6]
local dailyTtl = tonumber(ARGV[7] or '0')
local totalTtl = tonumber(ARGV[8] or '0')

redis.call('SADD', catalogKey, comboValue)

local aggExists = redis.call('EXISTS', aggKey)
redis.call('HINCRBY', aggKey, 'count', 1)
redis.call('HSET', aggKey, 'last_ts', timestamp)
if hasValue == '1' then
  redis.call('HINCRBYFLOAT', aggKey, 'sum_value', value)
end
if aggExists == 0 and dailyTtl > 0 then
  redis.call('EXPIRE', aggKey, dailyTtl)
end

redis.call('HINCRBY', totalKey, 'count', 1)
redis.call('HSET', totalKey, 'last_ts', timestamp)
if hasValue == '1' then
  redis.call('HINCRBYFLOAT', totalKey, 'sum_value', value)
end
if totalTtl > 0 then
  redis.call('EXPIRE', totalKey, totalTtl)
end

if hasSession == '1' and sessionId and sessionId ~= '' then
  local sessionExists = redis.call('EXISTS', sessionKey)
  redis.call('PFADD', sessionKey, sessionId)
  if sessionExists == 0 and dailyTtl > 0 then
    redis.call('EXPIRE', sessionKey, dailyTtl)
  end

  redis.call('PFADD', totalSessionKey, sessionId)
  if totalTtl > 0 then
    redis.call('EXPIRE', totalSessionKey, totalTtl)
  end
end

return 1
`;

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
    const aggKey = `events:agg:${dateKey}:${normalized.name}:${normalized.slug || GLOBAL_SLUG}`;
    const sessionKey = `events:sessions:${dateKey}:${normalized.name}:${normalized.slug || GLOBAL_SLUG}`;
    const totalKey = `events:total:${normalized.name}:${normalized.slug || GLOBAL_SLUG}`;
    const totalSessionKey = `events:totaluniq:${normalized.name}:${normalized.slug || GLOBAL_SLUG}`;
    const hasValue = normalized.value ? '1' : '0';
    const valueArg = hasValue === '1' ? String(normalized.value) : '0';
    const hasSession = normalized.sessionId ? '1' : '0';

    tasks.push(
      redisEvalScript(
        INGEST_LUA_SCRIPT,
        [CATALOG_KEY, aggKey, totalKey, sessionKey, totalSessionKey],
        [
          comboKey,
          String(normalized.timestamp),
          hasValue,
          valueArg,
          hasSession,
          normalized.sessionId || '',
          String(DAILY_TTL_SECONDS),
          String(TOTAL_TTL_SECONDS),
        ],
      ),
    );
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

    const dailyResults = await Promise.all(
      dateKeys.map((dateKey) =>
        redisCommand(['HGETALL', `events:agg:${dateKey}:${combo.name}:${slugKey}`], {
          allowReadOnly: true,
        })
      )
    );

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
      const dateKey = dateKeys[index];
      const dateEntry = timeseriesMap.get(dateKey) || { count: 0, value: 0 };
      dateEntry.count += count;
      dateEntry.value += Number.isFinite(valueSum) ? valueSum : 0;
      timeseriesMap.set(dateKey, dateEntry);
      sessionKeys.push(`events:sessions:${dateKey}:${combo.name}:${slugKey}`);
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
