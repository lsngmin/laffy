const VIEW_DEDUPE_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const LIKE_SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

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
  const { viewerId } = options;
  const { hasUpstash } = await import('./redisClient');
  if (hasUpstash()) {
    return getMetricsFromRedis(slug, viewerId);
  }

  const store = await getStore();
  const base = await store.read(slug);
  const counts = {
    views: parseCount(base.views),
    likes: parseCount(base.likes),
  };

  if (!viewerId) {
    return counts;
  }

  const memory = ensureMemoryState();
  const likeSet = memory.likeSets.get(slug);
  const liked = Boolean(likeSet && likeSet.has(viewerId));
  return { ...counts, liked };
}

export async function bumpView(slug, options = {}) {
  const { viewerId } = options;
  const { hasUpstash } = await import('./redisClient');
  if (hasUpstash()) {
    return bumpViewWithRedis(slug, viewerId);
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
  const { hasUpstash } = await import('./redisClient');
  if (hasUpstash()) {
    return setLikeStateWithRedis(slug, viewerId, desiredState);
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
  const { hasUpstash } = await import('./redisClient');

  if (hasUpstash()) {
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
  }

  const store = await getStore();
  const current = await store.read(slug);
  const next = {
    views: viewsValue !== null ? viewsValue : parseCount(current.views),
    likes: likesValue !== null ? likesValue : parseCount(current.likes),
  };
  await store.write(slug, next);

  const memory = ensureMemoryState();
  memory.viewSets.delete(slug);
  memory.likeSets.delete(slug);

  return next;
}

async function getMetricsFromRedis(slug, viewerId) {
  const { redisCommand } = await import('./redisClient');
  const key = metricsKey(slug);
  const result = await redisCommand(['HGETALL', key]);
  const counts = parseRedisCounts(result);

  if (!viewerId) {
    return counts;
  }

  const member = await redisCommand(['SISMEMBER', likeSetKey(slug), viewerId]);
  return { ...counts, liked: redisBool(member) };
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

function parseRedisCounts(result) {
  if (!Array.isArray(result) || result.length === 0) {
    return { views: 0, likes: 0 };
  }
  const obj = {};
  for (let i = 0; i < result.length; i += 2) {
    obj[result[i]] = result[i + 1];
  }
  return {
    views: parseCount(obj.views),
    likes: parseCount(obj.likes),
  };
}

async function getStore() {
  const { hasUpstash } = await import('./redisClient');
  if (hasUpstash()) return noopStore();
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStore();
  return memoryStore();
}

function noopStore() {
  return {
    async read() {
      return { views: 0, likes: 0 };
    },
    async write() {},
  };
}

function memoryStore() {
  if (!global.__metricsMem) global.__metricsMem = new Map();
  return {
    async read(slug) {
      return global.__metricsMem.get(slug) || { views: 0, likes: 0 };
    },
    async write(slug, obj) {
      global.__metricsMem.set(slug, obj);
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
        if (!found) return { views: 0, likes: 0 };
        const res = await fetch(found.url);
        if (!res.ok) return { views: 0, likes: 0 };
        const json = await res.json();
        return { views: parseCount(json.views), likes: parseCount(json.likes) };
      } catch (e) {
        return { views: 0, likes: 0 };
      }
    },
    async write(slug, obj) {
      const key = blobKey(slug);
      await put(key, JSON.stringify({
        views: parseCount(obj.views),
        likes: parseCount(obj.likes),
      }), {
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: 'application/json',
        access: 'public',
      });
    },
  };
}
