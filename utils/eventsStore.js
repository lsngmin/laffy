const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_RANGE_DAYS = 60;
const ENTRY_LIMIT = 200;
const REDIS_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

function normalizeDateInput(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const iso = trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00Z`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function clampRangeDays(days) {
  if (!Number.isFinite(days) || days <= 0) return DEFAULT_LOOKBACK_DAYS;
  return Math.min(MAX_RANGE_DAYS, Math.max(1, Math.floor(days)));
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultRange() {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (DEFAULT_LOOKBACK_DAYS - 1));
  return { start, end };
}

function eachDateBetween(start, end) {
  const dates = [];
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  const limit = new Date(end);
  limit.setUTCHours(0, 0, 0, 0);
  while (cursor <= limit) {
    dates.push(formatDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function sanitizeEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== 'object') return null;
  const name = typeof rawEvent.name === 'string' ? rawEvent.name.trim() : '';
  if (!name) return null;
  const props = rawEvent.props && typeof rawEvent.props === 'object' ? rawEvent.props : {};
  const slug = typeof props.slug === 'string' ? props.slug.trim() : '';
  const title = typeof props.title === 'string' ? props.title.trim() : '';
  const timestamp = Number(rawEvent.timestamp);
  const ts = Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
  const referrer = typeof props.referrer === 'string' ? props.referrer.slice(0, 512) : '';
  const value = Number.isFinite(props.value) ? Number(props.value) : null;

  const utm = {
    utm_source: typeof props.utm_source === 'string' ? props.utm_source.trim() : '',
    utm_medium: typeof props.utm_medium === 'string' ? props.utm_medium.trim() : '',
    utm_campaign: typeof props.utm_campaign === 'string' ? props.utm_campaign.trim() : '',
    utm_content: typeof props.utm_content === 'string' ? props.utm_content.trim() : '',
    utm_term: typeof props.utm_term === 'string' ? props.utm_term.trim() : '',
  };

  if (props.utm && typeof props.utm === 'object') {
    Object.assign(utm, {
      utm_source: typeof props.utm.utm_source === 'string' ? props.utm.utm_source.trim() : utm.utm_source,
      utm_medium: typeof props.utm.utm_medium === 'string' ? props.utm.utm_medium.trim() : utm.utm_medium,
      utm_campaign: typeof props.utm.utm_campaign === 'string' ? props.utm.utm_campaign.trim() : utm.utm_campaign,
      utm_content: typeof props.utm.utm_content === 'string' ? props.utm.utm_content.trim() : utm.utm_content,
      utm_term: typeof props.utm.utm_term === 'string' ? props.utm.utm_term.trim() : utm.utm_term,
    });
  }

  return {
    name,
    slug,
    title,
    timestamp: ts,
    referrer,
    value,
    utm,
  };
}

function ensureMemoryStore() {
  if (!global.__laffyEventsStore) {
    global.__laffyEventsStore = {
      byKey: new Map(),
    };
  }
  return global.__laffyEventsStore;
}

function buildCompositeKey(name, slug) {
  return `${name}::${slug || ''}`;
}

function recordEventInMemory(event, { viewerId }) {
  const store = ensureMemoryStore();
  const key = buildCompositeKey(event.name, event.slug);
  const entry = store.byKey.get(key) || {
    name: event.name,
    slug: event.slug,
    history: new Map(),
    lastTimestamp: 0,
    lastTitle: '',
    lastMeta: null,
    metaSets: {
      sources: new Set(),
      mediums: new Set(),
      campaigns: new Set(),
      contents: new Set(),
      terms: new Set(),
      referrers: new Set(),
    },
    viewersByDate: new Map(),
    totalCount: 0,
    totalValue: 0,
  };

  entry.totalCount += 1;
  if (Number.isFinite(event.value)) {
    entry.totalValue += event.value;
  }

  const dateKey = formatDateKey(new Date(event.timestamp));
  const day = entry.history.get(dateKey) || { count: 0, value: 0 };
  day.count += 1;
  if (Number.isFinite(event.value)) {
    day.value += event.value;
  }
  entry.history.set(dateKey, day);

  if (viewerId) {
    const viewers = entry.viewersByDate.get(dateKey) || new Set();
    viewers.add(viewerId);
    entry.viewersByDate.set(dateKey, viewers);
  }

  if (event.timestamp > entry.lastTimestamp) {
    entry.lastTimestamp = event.timestamp;
    entry.lastTitle = event.title;
    entry.lastMeta = { ...event.utm, referrer: event.referrer };
  }

  if (event.utm.utm_source) entry.metaSets.sources.add(event.utm.utm_source);
  if (event.utm.utm_medium) entry.metaSets.mediums.add(event.utm.utm_medium);
  if (event.utm.utm_campaign) entry.metaSets.campaigns.add(event.utm.utm_campaign);
  if (event.utm.utm_content) entry.metaSets.contents.add(event.utm.utm_content);
  if (event.utm.utm_term) entry.metaSets.terms.add(event.utm.utm_term);
  if (event.referrer) entry.metaSets.referrers.add(event.referrer);

  store.byKey.set(key, entry);
}

async function logEventsInMemory(events, options = {}) {
  events.forEach((event) => recordEventInMemory(event, options));
}

function encodePart(value) {
  return encodeURIComponent(value || '');
}

function decodePart(value) {
  try {
    return decodeURIComponent(value || '');
  } catch (error) {
    return value || '';
  }
}

async function logEventsWithRedis(events, { viewerId }) {
  const { redisCommand } = await import('./redisClient');
  for (const event of events) {
    const dateKey = formatDateKey(new Date(event.timestamp));
    const encodedName = encodePart(event.name);
    const encodedSlug = encodePart(event.slug || '_');
    const baseKey = `events:agg:${dateKey}:${encodedName}:${encodedSlug}`;
    const indexKey = `events:index:${dateKey}`;
    const uniqueKey = `${baseKey}:uniq`;

    await redisCommand(['HINCRBY', baseKey, 'count', '1']);
    await redisCommand(['HSET', baseKey, 'name', event.name]);
    await redisCommand(['HSET', baseKey, 'slug', event.slug || '']);
    if (event.title) {
      await redisCommand(['HSET', baseKey, 'last_title', event.title]);
    }
    await redisCommand(['HSET', baseKey, 'last_ts', String(event.timestamp)]);
    const metaPayload = JSON.stringify({
      ...event.utm,
      referrer: event.referrer,
      value: event.value,
    });
    await redisCommand(['HSET', baseKey, 'last_meta', metaPayload]);
    await redisCommand(['EXPIRE', baseKey, String(REDIS_TTL_SECONDS)]);
    await redisCommand(['SADD', indexKey, baseKey]);
    await redisCommand(['EXPIRE', indexKey, String(REDIS_TTL_SECONDS)]);
    if (viewerId) {
      await redisCommand(['PFADD', uniqueKey, viewerId]);
      await redisCommand(['EXPIRE', uniqueKey, String(REDIS_TTL_SECONDS)]);
    }
  }
}

function summarizeMetaSets(entry) {
  const mapSetToArray = (set) => Array.from(set).slice(0, 10);
  return {
    utm_sources: mapSetToArray(entry.metaSets?.sources || new Set()),
    utm_mediums: mapSetToArray(entry.metaSets?.mediums || new Set()),
    utm_campaigns: mapSetToArray(entry.metaSets?.campaigns || new Set()),
    utm_contents: mapSetToArray(entry.metaSets?.contents || new Set()),
    utm_terms: mapSetToArray(entry.metaSets?.terms || new Set()),
    referrers: mapSetToArray(entry.metaSets?.referrers || new Set()),
  };
}

function buildMemorySummary(range, filters = {}) {
  const store = ensureMemoryStore();
  const start = range.start;
  const end = range.end;
  const eventFilterSet = filters.names && filters.names.size ? filters.names : null;
  const slugFilter = filters.slug || '';
  const results = [];

  for (const entry of store.byKey.values()) {
    if (eventFilterSet && !eventFilterSet.has(entry.name)) continue;
    if (slugFilter && entry.slug !== slugFilter) continue;

    const history = [];
    let total = 0;
    let totalValue = 0;
    const uniqueViewers = new Set();

    for (const [dateKey, stats] of entry.history.entries()) {
      const date = new Date(`${dateKey}T00:00:00Z`);
      if (date < start || date > end) continue;
      total += Number(stats.count) || 0;
      totalValue += Number(stats.value) || 0;
      history.push({ date: dateKey, count: Number(stats.count) || 0, value: Number(stats.value) || 0 });
      const viewers = entry.viewersByDate.get(dateKey);
      if (viewers && viewers.size) {
        viewers.forEach((viewer) => uniqueViewers.add(viewer));
      }
    }

    if (!total) continue;

    history.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    results.push({
      id: buildCompositeKey(entry.name, entry.slug),
      name: entry.name,
      slug: entry.slug || '',
      totalCount: total,
      totalValue,
      history,
      lastSeenAt: entry.lastTimestamp || null,
      lastTitle: entry.lastTitle || '',
      lastMeta: entry.lastMeta || null,
      uniqueCount: uniqueViewers.size,
      metaSummary: summarizeMetaSets(entry),
    });
  }

  results.sort((a, b) => b.totalCount - a.totalCount);
  return results;
}

async function getSummaryFromRedis(range, filters = {}) {
  const { redisCommand } = await import('./redisClient');
  const start = range.start;
  const end = range.end;
  const eventFilterSet = filters.names && filters.names.size ? filters.names : null;
  const slugFilter = filters.slug || '';
  const aggregated = new Map();

  const dates = eachDateBetween(start, end);

  for (const dateKey of dates) {
    let members = [];
    try {
      const raw = await redisCommand(['SMEMBERS', `events:index:${dateKey}`], { allowReadOnly: true });
      members = Array.isArray(raw) ? raw : [];
    } catch (error) {
      members = [];
    }

    for (const memberKey of members) {
      if (typeof memberKey !== 'string' || !memberKey.startsWith('events:agg:')) continue;
      const parts = memberKey.split(':');
      if (parts.length < 5) continue;
      const encodedName = parts[3];
      const encodedSlug = parts.slice(4).join(':');
      const eventName = decodePart(encodedName);
      const slug = decodePart(encodedSlug);
      if (eventFilterSet && !eventFilterSet.has(eventName)) continue;
      if (slugFilter && slug !== slugFilter) continue;

      let count = 0;
      let lastTs = 0;
      let lastTitle = '';
      let meta = null;
      try {
        const payload = await redisCommand(['HMGET', memberKey, 'count', 'last_ts', 'last_title', 'last_meta'], {
          allowReadOnly: true,
        });
        if (Array.isArray(payload)) {
          count = Number(payload[0]) || 0;
          lastTs = Number(payload[1]) || 0;
          lastTitle = typeof payload[2] === 'string' ? payload[2] : '';
          if (typeof payload[3] === 'string' && payload[3]) {
            try {
              meta = JSON.parse(payload[3]);
            } catch (error) {
              meta = null;
            }
          }
        }
      } catch (error) {
        count = 0;
      }

      if (!count) continue;

      const composite = buildCompositeKey(eventName, slug === '_' ? '' : slug);
      const entry = aggregated.get(composite) || {
        id: composite,
        name: eventName,
        slug: slug === '_' ? '' : slug,
        totalCount: 0,
        totalValue: 0,
        history: [],
        lastSeenAt: 0,
        lastTitle: '',
        lastMeta: null,
        uniqueKeys: new Set(),
        metaSets: {
          sources: new Set(),
          mediums: new Set(),
          campaigns: new Set(),
          contents: new Set(),
          terms: new Set(),
          referrers: new Set(),
        },
      };

      entry.totalCount += count;
      if (meta && Number.isFinite(meta.value)) {
        entry.totalValue += Number(meta.value);
      }
      entry.history.push({ date: dateKey, count, value: Number(meta?.value) || 0 });
      if (lastTs && lastTs > entry.lastSeenAt) {
        entry.lastSeenAt = lastTs;
        entry.lastTitle = lastTitle || entry.lastTitle;
        entry.lastMeta = meta;
      }
      if (meta?.utm_source) entry.metaSets.sources.add(meta.utm_source);
      if (meta?.utm_medium) entry.metaSets.mediums.add(meta.utm_medium);
      if (meta?.utm_campaign) entry.metaSets.campaigns.add(meta.utm_campaign);
      if (meta?.utm_content) entry.metaSets.contents.add(meta.utm_content);
      if (meta?.utm_term) entry.metaSets.terms.add(meta.utm_term);
      if (meta?.referrer) entry.metaSets.referrers.add(meta.referrer);
      entry.uniqueKeys.add(`${memberKey}:uniq`);
      aggregated.set(composite, entry);
    }
  }

  const entries = Array.from(aggregated.values());
  entries.forEach((entry) => {
    entry.history.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  });
  entries.sort((a, b) => b.totalCount - a.totalCount);

  const limited = entries.slice(0, filters.limit || ENTRY_LIMIT);

  for (const entry of limited) {
    const uniqueKeys = Array.from(entry.uniqueKeys);
    let uniqueCount = 0;
    if (uniqueKeys.length === 1) {
      try {
        const result = await redisCommand(['PFCOUNT', uniqueKeys[0]], { allowReadOnly: true });
        uniqueCount = Number(result) || 0;
      } catch (error) {
        uniqueCount = 0;
      }
    } else if (uniqueKeys.length > 1) {
      const tempKey = `events:tmp:${Date.now()}:${Math.random().toString(16).slice(2)}`;
      try {
        await redisCommand(['PFMERGE', tempKey, ...uniqueKeys]);
        const result = await redisCommand(['PFCOUNT', tempKey]);
        uniqueCount = Number(result) || 0;
      } catch (error) {
        uniqueCount = 0;
      } finally {
        try {
          await redisCommand(['DEL', tempKey]);
        } catch (error) {
          // ignore cleanup errors
        }
      }
    }
    entry.uniqueCount = uniqueCount;
    entry.metaSummary = summarizeMetaSets(entry);
  }

  return limited.map((entry) => ({
    id: entry.id,
    name: entry.name,
    slug: entry.slug,
    totalCount: entry.totalCount,
    totalValue: entry.totalValue,
    history: entry.history,
    lastSeenAt: entry.lastSeenAt || null,
    lastTitle: entry.lastTitle || '',
    lastMeta: entry.lastMeta || null,
    uniqueCount: entry.uniqueCount || 0,
    metaSummary: entry.metaSummary,
  }));
}

export async function logEvents(rawEvents, options = {}) {
  const events = Array.isArray(rawEvents)
    ? rawEvents.map(sanitizeEvent).filter(Boolean)
    : [];
  if (!events.length) return;
  const viewerId = typeof options.viewerId === 'string' ? options.viewerId : '';

  const { hasUpstash } = await import('./redisClient');
  if (hasUpstash()) {
    try {
      await logEventsWithRedis(events, { viewerId });
      return;
    } catch (error) {
      console.warn('[events] Redis log failed, falling back to in-memory store', error);
    }
  }
  await logEventsInMemory(events, { viewerId });
}

function resolveRange(options = {}) {
  const startDate = normalizeDateInput(options.startDate);
  const endDate = normalizeDateInput(options.endDate);
  if (startDate && endDate && startDate <= endDate) {
    const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const clamped = clampRangeDays(diffDays);
    const adjustedEnd = new Date(startDate);
    adjustedEnd.setUTCDate(startDate.getUTCDate() + (clamped - 1));
    if (adjustedEnd < endDate) {
      return { start: startDate, end: adjustedEnd };
    }
    return { start: startDate, end: endDate };
  }
  if (endDate && !startDate) {
    const clamped = clampRangeDays(MAX_RANGE_DAYS);
    const start = new Date(endDate);
    start.setUTCDate(start.getUTCDate() - (clamped - 1));
    return { start, end: endDate };
  }
  if (startDate && !endDate) {
    const clamped = clampRangeDays(MAX_RANGE_DAYS);
    const end = new Date(startDate);
    end.setUTCDate(end.getUTCDate() + (clamped - 1));
    return { start: startDate, end };
  }
  return getDefaultRange();
}

export async function getEventSummary(options = {}) {
  const range = resolveRange(options);
  const filters = {
    names: Array.isArray(options.eventNames)
      ? new Set(options.eventNames.filter((name) => typeof name === 'string' && name.trim()))
      : options.eventName
      ? new Set([options.eventName].filter((name) => typeof name === 'string' && name.trim()))
      : new Set(),
    slug: typeof options.slug === 'string' ? options.slug.trim() : '',
    limit: Number.isFinite(options.limit) ? Math.max(1, Math.min(ENTRY_LIMIT, options.limit)) : ENTRY_LIMIT,
  };

  const { hasUpstash } = await import('./redisClient');
  let entries = [];
  if (hasUpstash()) {
    try {
      entries = await getSummaryFromRedis(range, filters);
    } catch (error) {
      console.warn('[events] Redis summary failed, falling back to in-memory data', error);
      entries = buildMemorySummary(range, filters);
    }
  } else {
    entries = buildMemorySummary(range, filters);
  }

  const limited = entries.slice(0, filters.limit);
  const totals = limited.reduce(
    (acc, entry) => ({
      totalEvents: acc.totalEvents + (Number(entry.totalCount) || 0),
      totalUnique: acc.totalUnique + (Number(entry.uniqueCount) || 0),
    }),
    { totalEvents: 0, totalUnique: 0 }
  );

  const eventNames = Array.from(new Set(limited.map((entry) => entry.name))).sort((a, b) => a.localeCompare(b));
  const slugs = Array.from(new Set(limited.map((entry) => entry.slug).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  return {
    entries: limited,
    totals,
    range: {
      start: formatDateKey(range.start),
      end: formatDateKey(range.end),
    },
    eventNames,
    slugs,
  };
}
