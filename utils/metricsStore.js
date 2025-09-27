import { isInternalRedisIngestionDisabled } from './internalRedisToggle';

const VIEW_DEDUPE_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const LIKE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

async function isRedisAvailable() {
  if (isInternalRedisIngestionDisabled()) {
    return false;
  }
  const { hasUpstash } = await import('./redisClient');
  return hasUpstash();
}

function metricsKey(slug) {
  return `metrics:${slug}`;
}

function viewSetKey(slug) {
  return `metrics:${slug}:viewers`;
}

function likeSetKey(slug) {
  return `metrics:${slug}:likers`;
}

function parseCount(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function normalizeMetricValue(value) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.round(num));
}

function normalizeDateInput(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const iso = value.includes('T') ? value : `${value}T00:00:00Z`;
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeHistoryEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const cleaned = entries
    .map((entry) => ({
      date: typeof entry?.date === 'string' ? entry.date : null,
      views: Number(entry?.views) || 0,
      likes: Math.max(0, Number(entry?.likes) || 0),
    }))
    .filter((entry) => Boolean(entry.date));
  cleaned.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return cleaned;
}

function filterHistoryByRange(history, startDate, endDate) {
  if (!startDate && !endDate) return history;
  const startKey = startDate ? formatDateKey(startDate) : null;
  const endKey = endDate ? formatDateKey(endDate) : null;
  return history.filter((entry) => {
    if (!entry?.date) return false;
    if (startKey && entry.date < startKey) return false;
    if (endKey && entry.date > endKey) return false;
    return true;
  });
}

function summarizeHistory(history) {
  return history.reduce(
    (acc, entry) => ({
      views: acc.views + (Number(entry.views) || 0),
      likes: acc.likes + (Number(entry.likes) || 0),
    }),
    { views: 0, likes: 0 }
  );
}

function prepareHistoryPayload(rawHistory, startDate, endDate) {
  const normalizedHistory = normalizeHistoryEntries(rawHistory);
  const start = normalizeDateInput(startDate);
  const end = normalizeDateInput(endDate);
  if (!start && !end) {
    return { history: normalizedHistory, rangeTotals: null };
  }
  const filtered = filterHistoryByRange(normalizedHistory, start, end);
  const totals = summarizeHistory(filtered);
  return { history: filtered, rangeTotals: totals };
}

function redisBool(value) {
  return value === 1 || value === '1';
}

function ensureMemoryState() {
  if (!global.__metricsMemState) {
    global.__metricsMemState = {
      viewSets: new Map(),
      likeSets: new Map(),
    };
  }
  return global.__metricsMemState;
}

export async function getMetrics(slug, options = {}) {
  const { viewerId, includeHistory = true } = options;
  const startDate = includeHistory ? normalizeDateInput(options.startDate) : null;
  const endDate = includeHistory ? normalizeDateInput(options.endDate) : null;
  if (await isRedisAvailable()) {
    try {
      return await getMetricsFromRedis(slug, viewerId, {
        startDate,
        endDate,
        includeHistory,
      });
    } catch (error) {
      console.warn('[metrics] Redis get failed, falling back to store', error);
    }
  }

  const store = await getStore();
  const base = await store.read(slug);
  const counts = {
    views: parseCount(base.views),
    likes: parseCount(base.likes),
  };
  const historyPayload = includeHistory
    ? prepareHistoryPayload(base.history, startDate, endDate)
    : { history: [], rangeTotals: null };
  const { history, rangeTotals } = historyPayload;

  if (!viewerId) {
    return { ...counts, history, rangeTotals };
  }

  const memory = ensureMemoryState();
  const likeSet = memory.likeSets.get(slug);
  const liked = Boolean(likeSet && likeSet.has(viewerId));
  return { ...counts, liked, history, rangeTotals };
}

export async function bumpView(slug, options = {}) {
  const { viewerId } = options;
  if (await isRedisAvailable()) {
    try {
      return await bumpViewWithRedis(slug, viewerId);
    } catch (error) {
      console.warn('[metrics] Redis view bump failed, falling back to store', error);
    }
  }

  const store = await getStore();
  const current = await store.read(slug);
  const counts = {
    views: parseCount(current.views),
    likes: parseCount(current.likes),
  };

  const memory = ensureMemoryState();
  if (viewerId) {
    const viewSet = memory.viewSets.get(slug) || new Set();
    if (viewSet.has(viewerId)) {
      const likeSet = memory.likeSets.get(slug);
      const liked = Boolean(likeSet && likeSet.has(viewerId));
      return { ...counts, liked, deduped: true };
    }
    viewSet.add(viewerId);
    memory.viewSets.set(slug, viewSet);
  }

  const next = { ...counts, views: counts.views + 1 };
  await store.write(slug, next);

  const likeSet = memory.likeSets.get(slug);
  const liked = Boolean(viewerId && likeSet && likeSet.has(viewerId));
  return { ...next, liked, deduped: false };
}

export async function setLikeState(slug, options = {}) {
  const { viewerId, liked: desiredState } = options;
  if (await isRedisAvailable()) {
    try {
      return await setLikeStateWithRedis(slug, viewerId, desiredState);
    } catch (error) {
      console.warn('[metrics] Redis like update failed, falling back to store', error);
    }
  }

  const store = await getStore();
  const current = await store.read(slug);
  const counts = {
    views: parseCount(current.views),
    likes: parseCount(current.likes),
  };

  const memory = ensureMemoryState();
  const likeSet = memory.likeSets.get(slug) || new Set();
  const currentlyLiked = viewerId ? likeSet.has(viewerId) : false;
  const nextLiked = typeof desiredState === 'boolean' ? desiredState : !currentlyLiked;

  let nextLikes = counts.likes;
  if (viewerId) {
    if (nextLiked) {
      if (!currentlyLiked) nextLikes += 1;
      likeSet.add(viewerId);
    } else {
      if (currentlyLiked && nextLikes > 0) nextLikes -= 1;
      likeSet.delete(viewerId);
    }
    memory.likeSets.set(slug, likeSet);
  } else if (typeof desiredState === 'boolean') {
    nextLikes = Math.max(0, desiredState ? nextLikes + 1 : Math.max(0, nextLikes - 1));
  }

  const next = { ...counts, likes: Math.max(0, nextLikes) };
  await store.write(slug, next);

  return { ...next, liked: nextLiked };
}

export async function overwriteMetrics(slug, metrics = {}) {
  const viewsValue = normalizeMetricValue(metrics.views);
  const likesValue = normalizeMetricValue(metrics.likes);
  const historyValue = Array.isArray(metrics.history) ? normalizeHistoryEntries(metrics.history) : null;
  if (await isRedisAvailable()) {
    try {
      const { redisCommand } = await import('./redisClient');
      const key = metricsKey(slug);
      if (viewsValue !== null || likesValue !== null) {
        const fields = [];
        if (viewsValue !== null) fields.push('views', String(viewsValue));
        if (likesValue !== null) fields.push('likes', String(likesValue));
        if (fields.length) await redisCommand(['HSET', key, ...fields]);
      }
      await redisCommand(['DEL', viewSetKey(slug), likeSetKey(slug)]);
      const views = parseCount(await redisCommand(['HGET', key, 'views']));
      const likes = parseCount(await redisCommand(['HGET', key, 'likes']));
      return { views, likes };
    } catch (error) {
      console.warn('[metrics] Redis overwrite failed, falling back to store', error);
    }
  }

  const store = await getStore();
  const current = await store.read(slug);
  const nextHistory = historyValue !== null ? historyValue : normalizeHistoryEntries(current.history);
  const next = {
    views: viewsValue !== null ? viewsValue : parseCount(current.views),
    likes: likesValue !== null ? likesValue : parseCount(current.likes),
    history: nextHistory,
  };
  await store.write(slug, next);

  const memory = ensureMemoryState();
  memory.viewSets.delete(slug);
  memory.likeSets.delete(slug);

  return next;
}

async function getMetricsFromRedis(slug, viewerId, rangeOptions = {}) {
  const { redisCommand } = await import('./redisClient');
  const key = metricsKey(slug);
  const [viewsRaw, likesRaw] = await redisCommand(['HMGET', key, 'views', 'likes'], { allowReadOnly: true });
  const counts = {
    views: parseCount(viewsRaw),
    likes: parseCount(likesRaw),
  };

  let rangeTotals = null;
  if (rangeOptions.includeHistory) {
    const { startDate = null, endDate = null } = rangeOptions;
    const hasRangeRequest = Boolean(startDate || endDate);
    if (hasRangeRequest) {
      rangeTotals = prepareHistoryPayload([], startDate, endDate).rangeTotals;
    }
  }

  if (!viewerId) {
    return { ...counts, history: [], rangeTotals };
  }

  const member = await redisCommand(['SISMEMBER', likeSetKey(slug), viewerId], { allowReadOnly: true });
  return {
    ...counts,
    liked: redisBool(member),
    history: [],
    rangeTotals,
  };
}

async function bumpViewWithRedis(slug, viewerId) {
  const { redisCommand } = await import('./redisClient');
  const key = metricsKey(slug);
  let shouldIncrement = true;

  if (viewerId) {
    const added = await redisCommand(['SADD', viewSetKey(slug), viewerId]);
    if (!redisBool(added)) {
      shouldIncrement = false;
    } else {
      await redisCommand(['EXPIRE', viewSetKey(slug), String(VIEW_DEDUPE_TTL_SECONDS)]);
    }
  }

  let views;
  if (shouldIncrement) {
    views = await redisCommand(['HINCRBY', key, 'views', '1']);
  } else {
    views = await redisCommand(['HGET', key, 'views']);
  }
  const likes = await redisCommand(['HGET', key, 'likes']);

  let likedFlag = false;
  if (viewerId) {
    const member = await redisCommand(['SISMEMBER', likeSetKey(slug), viewerId]);
    likedFlag = redisBool(member);
  }

  return {
    views: parseCount(views),
    likes: parseCount(likes),
    liked: likedFlag,
    deduped: !shouldIncrement,
  };
}

async function setLikeStateWithRedis(slug, viewerId, desiredState) {
  const { redisCommand } = await import('./redisClient');
  const key = metricsKey(slug);

  let nextLiked = false;
  let likesValue;

  if (!viewerId) {
    // Without viewer tracking we simply adjust counts and return.
    if (typeof desiredState === 'boolean') {
      const delta = desiredState ? '1' : '-1';
      likesValue = await redisCommand(['HINCRBY', key, 'likes', delta]);
      nextLiked = desiredState;
    } else {
      likesValue = await redisCommand(['HGET', key, 'likes']);
    }
  } else {
    const likeKey = likeSetKey(slug);
    const currentlyLiked = redisBool(await redisCommand(['SISMEMBER', likeKey, viewerId]));
    nextLiked = typeof desiredState === 'boolean' ? desiredState : !currentlyLiked;

    if (nextLiked && !currentlyLiked) {
      await redisCommand(['SADD', likeKey, viewerId]);
      await redisCommand(['EXPIRE', likeKey, String(LIKE_SESSION_TTL_SECONDS)]);
      likesValue = await redisCommand(['HINCRBY', key, 'likes', '1']);
    } else if (!nextLiked && currentlyLiked) {
      await redisCommand(['SREM', likeKey, viewerId]);
      likesValue = await redisCommand(['HINCRBY', key, 'likes', '-1']);
    } else {
      likesValue = await redisCommand(['HGET', key, 'likes']);
    }
  }

  const viewsValue = await redisCommand(['HGET', key, 'views']);

  return {
    views: parseCount(viewsValue),
    likes: parseCount(likesValue),
    liked: nextLiked,
  };
}

async function getStore() {
  if (await isRedisAvailable()) return noopStore();
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStore();
  return memoryStore();
}

function noopStore() {
  return {
    async read() {
      return { views: 0, likes: 0, history: [] };
    },
    async write() {},
  };
}

function memoryStore() {
  if (!global.__metricsMem) global.__metricsMem = new Map();
  return {
    async read(slug) {
      const stored = global.__metricsMem.get(slug);
      if (!stored) return { views: 0, likes: 0, history: [] };
      return {
        views: parseCount(stored.views),
        likes: parseCount(stored.likes),
        history: normalizeHistoryEntries(stored.history),
      };
    },
    async write(slug, obj) {
      const existing = global.__metricsMem.get(slug) || {};
      const history = Array.isArray(obj.history)
        ? normalizeHistoryEntries(obj.history)
        : normalizeHistoryEntries(existing.history);
      global.__metricsMem.set(slug, {
        views: parseCount(obj.views),
        likes: parseCount(obj.likes),
        history,
      });
    },
  };
}

function blobKey(slug) {
  return `metrics/${slug}.json`;
}

async function blobStore() {
  const { loadBlob } = await import('./dynamicBlob');
  const { put, list } = await loadBlob();
  return {
    async read(slug) {
      try {
        const key = blobKey(slug);
        const { blobs } = await list({ prefix: key });
        const found = blobs.find((b) => b.pathname === key);
        if (!found) return { views: 0, likes: 0, history: [] };
        const res = await fetch(found.url);
        if (!res.ok) return { views: 0, likes: 0, history: [] };
        const json = await res.json();
        return {
          views: parseCount(json.views),
          likes: parseCount(json.likes),
          history: normalizeHistoryEntries(json.history),
        };
      } catch (e) {
        return { views: 0, likes: 0, history: [] };
      }
    },
    async write(slug, obj) {
      const key = blobKey(slug);
      let history = [];
      if (Array.isArray(obj.history)) {
        history = normalizeHistoryEntries(obj.history);
      } else {
        const current = await this.read(slug);
        history = normalizeHistoryEntries(current.history);
      }
      await put(
        key,
        JSON.stringify({
          views: parseCount(obj.views),
          likes: parseCount(obj.likes),
          history,
        }),
        {
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: 'application/json',
          access: 'public',
        }
      );
    },
  };
}
