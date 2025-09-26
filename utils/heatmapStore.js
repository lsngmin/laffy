const HEATMAP_KEY_PREFIX = 'heatmap:';

function normalizeSlug(slug) {
  if (typeof slug !== 'string') return '';
  const trimmed = slug.trim();
  return trimmed || '';
}

function normalizeBucket(bucket) {
  if (typeof bucket !== 'string') return '';
  const trimmed = bucket.trim();
  return trimmed || '';
}

function normalizeSectionId(value) {
  if (typeof value !== 'string') return 'root';
  const trimmed = value.trim();
  if (!trimmed) return 'root';
  return trimmed.slice(0, 64);
}

function normalizeEventType(value) {
  if (typeof value !== 'string') return 'pointer';
  const trimmed = value.trim();
  if (!trimmed) return 'pointer';
  return trimmed.slice(0, 32);
}

function normalizeCellIndex(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num);
}

function normalizeCount(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.max(1, Math.round(num));
}

function redisKeyForSlug(slug) {
  return `${HEATMAP_KEY_PREFIX}${slug}`;
}

function memoryStore() {
  if (!global.__heatmapMemoryStore) {
    global.__heatmapMemoryStore = new Map();
  }
  return global.__heatmapMemoryStore;
}

function memoryKey(slug, field) {
  return `${slug}::${field}`;
}

function sanitizeCells(cells) {
  if (!Array.isArray(cells)) return [];
  const sanitized = [];
  cells.forEach((cell) => {
    const cellIndex = normalizeCellIndex(cell?.cell ?? cell?.index ?? cell?.id);
    const count = normalizeCount(cell?.count ?? cell?.value);
    if (cellIndex === null || count === null) return;
    const sectionId = normalizeSectionId(cell?.sectionId ?? cell?.section ?? cell?.bucket);
    const eventType = normalizeEventType(cell?.eventType ?? cell?.type);
    sanitized.push({ cellIndex, count, sectionId, eventType });
  });
  return sanitized;
}

async function hasRedis() {
  const { hasUpstash } = await import('./redisClient');
  return hasUpstash();
}

async function sendRedisIncrements(slug, bucket, increments) {
  if (!increments.length) return false;
  const { redisCommand } = await import('./redisClient');
  const key = redisKeyForSlug(slug);
  const tasks = increments.map((item) => {
    const field = `${bucket}:${item.eventType}:${item.sectionId}:${item.cellIndex}`;
    return redisCommand(['HINCRBY', key, field, item.count]).catch((error) => {
      console.warn('[heatmap] redis increment failed', error);
      return null;
    });
  });
  const results = await Promise.all(tasks);
  return results.some((value) => value !== null && value !== undefined);
}

function applyMemoryIncrements(slug, bucket, increments) {
  if (!increments.length) return false;
  const store = memoryStore();
  let changed = false;
  increments.forEach((item) => {
    const field = `${bucket}:${item.eventType}:${item.sectionId}:${item.cellIndex}`;
    const key = memoryKey(slug, field);
    const prev = store.get(key) || 0;
    store.set(key, prev + item.count);
    changed = true;
  });
  return changed;
}

export async function recordHeatmapSamples({ slug, viewportBucket, cells, sessionId } = {}) {
  const normalizedSlug = normalizeSlug(slug);
  const bucket = normalizeBucket(viewportBucket) || 'default';
  const normalizedCells = sanitizeCells(cells);

  if (!normalizedSlug || !normalizedCells.length) {
    return { stored: false, backend: null, count: 0 };
  }

  const totalCount = normalizedCells.reduce((sum, item) => sum + item.count, 0);

  if (await hasRedis()) {
    try {
      const persisted = await sendRedisIncrements(normalizedSlug, bucket, normalizedCells);
      if (persisted) {
        return { stored: true, backend: 'redis', count: totalCount };
      }
    } catch (error) {
      console.warn('[heatmap] redis write failed, falling back to memory', error);
    }
  }

  const persisted = applyMemoryIncrements(normalizedSlug, bucket, normalizedCells);
  return { stored: persisted, backend: 'memory', count: totalCount };
}

export async function getHeatmapSnapshot({ slug, viewportBucket } = {}) {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return { slug: '', bucket: '', cells: [] };
  const bucket = normalizeBucket(viewportBucket);

  if (await hasRedis()) {
    try {
      const { redisCommand } = await import('./redisClient');
      const key = redisKeyForSlug(normalizedSlug);
      const raw = await redisCommand(['HGETALL', key], { allowReadOnly: true });
      const cells = [];
      if (Array.isArray(raw)) {
        for (let i = 0; i < raw.length; i += 2) {
          const field = raw[i];
          const countRaw = raw[i + 1];
          if (typeof field !== 'string') continue;
          const parts = field.split(':');
          if (parts.length < 4) continue;
          const [fieldBucket, eventType, sectionId, cellIndexRaw] = parts;
          if (bucket && bucket !== fieldBucket) continue;
          const count = Number(countRaw);
          if (!Number.isFinite(count)) continue;
          const cellIndex = Number(cellIndexRaw);
          if (!Number.isFinite(cellIndex)) continue;
          cells.push({
            bucket: fieldBucket,
            eventType,
            sectionId,
            cell: cellIndex,
            count,
          });
        }
      }
      return { slug: normalizedSlug, bucket: bucket || null, cells };
    } catch (error) {
      console.warn('[heatmap] redis read failed, falling back to memory', error);
    }
  }

  const store = memoryStore();
  const cells = [];
  store.forEach((count, key) => {
    const [keySlug, field] = key.split('::');
    if (keySlug !== normalizedSlug) return;
    const parts = field.split(':');
    if (parts.length < 4) return;
    const [fieldBucket, eventType, sectionId, cellIndexRaw] = parts;
    if (bucket && bucket !== fieldBucket) return;
    const cellIndex = Number(cellIndexRaw);
    if (!Number.isFinite(cellIndex)) return;
    cells.push({
      bucket: fieldBucket,
      eventType,
      sectionId,
      cell: cellIndex,
      count,
    });
  });
  return { slug: normalizedSlug, bucket: bucket || null, cells };
}
