const POINTER_GRID_X = 12;
const POINTER_GRID_Y = 8;

function normalizeSlug(slug) {
  if (typeof slug !== 'string') return '';
  const trimmed = slug.trim();
  return trimmed.slice(0, 120);
}

function normalizeBucket(bucket, fallback = 'all') {
  if (typeof bucket !== 'string' || !bucket.trim()) return fallback;
  return bucket.trim().slice(0, 32);
}

function pointerKey(slug, bucket) {
  return `heatmap:${slug}:pointer:${bucket}`;
}

function scrollKey(slug, bucket) {
  return `heatmap:${slug}:scroll:${bucket}`;
}

function ensureMemoryStore() {
  if (!global.__heatmapMemoryStore) {
    global.__heatmapMemoryStore = {
      pointer: new Map(),
      scroll: new Map(),
    };
  }
  return global.__heatmapMemoryStore;
}

function storePointerInMemory(store, slug, bucket, cell) {
  const key = `${slug}|${bucket}`;
  const map = store.pointer.get(key) || new Map();
  const field = `${cell.area}|${cell.type}|${cell.x}|${cell.y}`;
  map.set(field, (map.get(field) || 0) + cell.count);
  store.pointer.set(key, map);
}

function storeScrollInMemory(store, slug, bucket, entry) {
  const key = `${slug}|${bucket}`;
  const map = store.scroll.get(key) || new Map();
  const field = String(entry.bucket);
  map.set(field, (map.get(field) || 0) + entry.count);
  store.scroll.set(key, map);
}

async function storePointerWithRedis(slug, bucket, cells) {
  if (!cells.length) return;
  const { redisCommand } = await import('./redisClient');
  const key = pointerKey(slug, bucket);
  for (const cell of cells) {
    const field = `${cell.area}|${cell.type}|${cell.x}|${cell.y}`;
    const count = String(cell.count);
    await redisCommand(['HINCRBY', key, field, count]);
  }
}

async function storeScrollWithRedis(slug, bucket, entries) {
  if (!entries.length) return;
  const { redisCommand } = await import('./redisClient');
  const key = scrollKey(slug, bucket);
  for (const entry of entries) {
    const field = String(entry.bucket);
    const count = String(entry.count);
    await redisCommand(['HINCRBY', key, field, count]);
  }
}

export async function recordHeatmapSample({
  slug,
  viewportBucket,
  sessionId,
  pointerCells = [],
  scrollBuckets = [],
}) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return;

  const bucket = normalizeBucket(viewportBucket);
  const validPointerCells = pointerCells
    .map((cell) => ({
      area: typeof cell.area === 'string' && cell.area ? cell.area.slice(0, 40) : 'generic',
      type: typeof cell.type === 'string' && cell.type ? cell.type.slice(0, 20) : 'move',
      x: Number.isFinite(cell.x) ? Math.min(POINTER_GRID_X - 1, Math.max(0, Math.floor(cell.x))) : 0,
      y: Number.isFinite(cell.y) ? Math.min(POINTER_GRID_Y - 1, Math.max(0, Math.floor(cell.y))) : 0,
      count: Number.isFinite(cell.count) ? Math.max(1, Math.floor(cell.count)) : 1,
    }))
    .filter((cell) => cell.count > 0);

  const validScrollBuckets = scrollBuckets
    .map((entry) => ({
      bucket: Number.isFinite(entry.bucket) ? Math.max(0, Math.floor(entry.bucket)) : 0,
      count: Number.isFinite(entry.count) ? Math.max(1, Math.floor(entry.count)) : 1,
    }))
    .filter((entry) => entry.count > 0);

  if (!validPointerCells.length && !validScrollBuckets.length) {
    return;
  }

  const { hasUpstash } = await import('./redisClient');
  if (hasUpstash()) {
    try {
      await storePointerWithRedis(normalizedSlug, bucket, validPointerCells);
      await storeScrollWithRedis(normalizedSlug, bucket, validScrollBuckets);
      return;
    } catch (error) {
      console.warn('[heatmap] redis write failed, falling back to memory store', error);
    }
  }

  const store = ensureMemoryStore();
  validPointerCells.forEach((cell) => storePointerInMemory(store, normalizedSlug, bucket, cell));
  validScrollBuckets.forEach((entry) => storeScrollInMemory(store, normalizedSlug, bucket, entry));

  if (sessionId) {
    // Track session-specific dedupe hints to avoid unbounded growth (best-effort)
    if (!store.sessions) store.sessions = new Map();
    const sessionKey = `${normalizedSlug}|${bucket}`;
    const sessionsForKey = store.sessions.get(sessionKey) || new Set();
    sessionsForKey.add(sessionId);
    store.sessions.set(sessionKey, sessionsForKey);
  }
}

export async function getHeatmapSnapshot({ slug, viewportBucket } = {}) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return { pointer: [], scroll: [] };
  const bucket = normalizeBucket(viewportBucket);

  const { hasUpstash } = await import('./redisClient');
  if (hasUpstash()) {
    try {
      const { redisCommand } = await import('./redisClient');
      const pointerRaw = await redisCommand(['HGETALL', pointerKey(normalizedSlug, bucket)]);
      const scrollRaw = await redisCommand(['HGETALL', scrollKey(normalizedSlug, bucket)]);
      const pointer = [];
      if (Array.isArray(pointerRaw)) {
        for (let i = 0; i < pointerRaw.length; i += 2) {
          const field = pointerRaw[i];
          const count = Number(pointerRaw[i + 1]) || 0;
          if (!field || count <= 0) continue;
          const [area = 'generic', type = 'move', x = '0', y = '0'] = field.split('|');
          pointer.push({ area, type, x: Number(x) || 0, y: Number(y) || 0, count });
        }
      }
      const scroll = [];
      if (Array.isArray(scrollRaw)) {
        for (let i = 0; i < scrollRaw.length; i += 2) {
          const bucketKey = scrollRaw[i];
          const count = Number(scrollRaw[i + 1]) || 0;
          if (typeof bucketKey !== 'string' || count <= 0) continue;
          scroll.push({ bucket: Number(bucketKey) || 0, count });
        }
      }
      return { pointer, scroll };
    } catch (error) {
      console.warn('[heatmap] redis read failed, falling back to memory snapshot', error);
    }
  }

  const store = ensureMemoryStore();
  const pointerKeyMem = `${normalizedSlug}|${bucket}`;
  const pointerEntries = Array.from(store.pointer.get(pointerKeyMem)?.entries() || []);
  const scrollEntries = Array.from(store.scroll.get(pointerKeyMem)?.entries() || []);

  const pointer = pointerEntries.map(([field, count]) => {
    const [area = 'generic', type = 'move', x = '0', y = '0'] = field.split('|');
    return {
      area,
      type,
      x: Number(x) || 0,
      y: Number(y) || 0,
      count: Number(count) || 0,
    };
  });

  const scroll = scrollEntries.map(([bucketKey, count]) => ({
    bucket: Number(bucketKey) || 0,
    count: Number(count) || 0,
  }));

  return { pointer, scroll };
}
