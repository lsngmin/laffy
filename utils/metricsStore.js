// Server-only utility for view/like metrics with optional Vercel Blob backing.
export async function getMetrics(slug) {
  const store = await getStore();
  return store.read(slug);
}

export async function bumpView(slug) {
  const { hasUpstash, redisCommand } = await import('./redisClient');
  if (hasUpstash()) {
    const key = `metrics:${slug}`;
    const views = await redisCommand(['HINCRBY', key, 'views', '1']);
    const likes = await redisCommand(['HGET', key, 'likes']);
    return { views: Number(views) || 0, likes: Number(likes) || 0 };
  }
  const store = await getStore();
  const current = await store.read(slug);
  const next = { ...current, views: (current.views || 0) + 1 };
  await store.write(slug, next);
  return next;
}

export async function setLikeDelta(slug, delta = 1) {
  const { hasUpstash, redisCommand } = await import('./redisClient');
  if (hasUpstash()) {
    const key = `metrics:${slug}`;
    const likes = await redisCommand(['HINCRBY', key, 'likes', String(delta)]);
    const views = await redisCommand(['HGET', key, 'views']);
    return { views: Number(views) || 0, likes: Math.max(0, Number(likes) || 0) };
  }
  const store = await getStore();
  const current = await store.read(slug);
  const nextLikes = Math.max(0, (current.likes || 0) + delta);
  const next = { ...current, likes: nextLikes };
  await store.write(slug, next);
  return next;
}

async function getStore() {
  const { hasUpstash } = await import('./redisClient');
  if (hasUpstash()) return redisStore();
  if (process.env.BLOB_READ_WRITE_TOKEN) return blobStore();
  return memoryStore();
}

function memoryStore() {
  if (!global.__metricsMem) global.__metricsMem = new Map();
  return {
    async read(slug) {
      return global.__metricsMem.get(slug) || { views: 0, likes: 0 };
    },
    async write(slug, obj) {
      global.__metricsMem.set(slug, obj);
    }
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
        // List to find exact url
        const { blobs } = await list({ prefix: key });
        const found = blobs.find((b) => b.pathname === key);
        if (!found) return { views: 0, likes: 0 };
        const res = await fetch(found.url);
        if (!res.ok) return { views: 0, likes: 0 };
        const json = await res.json();
        return { views: json.views || 0, likes: json.likes || 0 };
      } catch (e) {
        return { views: 0, likes: 0 };
      }
    },
    async write(slug, obj) {
      const key = blobKey(slug);
      await put(key, JSON.stringify(obj), {
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: 'application/json',
        access: 'public'
      });
    }
  };
}

async function redisStore() {
  const { redisCommand } = await import('./redisClient');
  return {
    async read(slug) {
      const key = `metrics:${slug}`;
      const result = await redisCommand(['HGETALL', key]);
      if (!result || result.length === 0) return { views: 0, likes: 0 };
      const obj = {};
      for (let i = 0; i < result.length; i += 2) obj[result[i]] = Number(result[i + 1]);
      return { views: obj.views || 0, likes: obj.likes || 0 };
    },
    async write(slug, obj) {
      const key = `metrics:${slug}`;
      const fields = [];
      if (typeof obj.views === 'number') { fields.push('views', String(obj.views)); }
      if (typeof obj.likes === 'number') { fields.push('likes', String(obj.likes)); }
      if (fields.length) await redisCommand(['HSET', key, ...fields]);
    }
  };
}
