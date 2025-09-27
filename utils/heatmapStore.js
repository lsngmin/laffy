import {
  hasSupabaseConfig,
  callSupabaseRpc,
  SUPABASE_HEATMAP_ROLLUP_FUNCTION,
} from './supabaseClient';

const FIELD_DELIMITER = '|';
const DEFAULT_BUCKET = 'default';
const MAX_CELLS_PER_BATCH = 30;

function sanitizeSegment(value, fallback, maxLength = 48) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const safe = trimmed.replace(/[^a-z0-9_\-\.]/gi, '').slice(0, maxLength);
  return safe || fallback;
}

function sanitizeBucket(value) {
  return sanitizeSegment(value, DEFAULT_BUCKET, 40);
}

export function normalizeHeatmapBucket(value) {
  return sanitizeBucket(value);
}

function heatmapKey(slug) {
  return `heatmap:${slug}`;
}

function normalizeCells(cells) {
  if (!Array.isArray(cells)) return [];
  const merged = new Map();
  for (const entry of cells) {
    const index = Number(entry?.cell);
    if (!Number.isFinite(index) || index < 0) continue;
    const count = Number(entry?.count ?? 1);
    if (!Number.isFinite(count) || count <= 0) continue;
    const type = sanitizeSegment(entry?.type, 'generic', 24);
    const section = sanitizeSegment(entry?.section, 'root', 32);
    const cell = Math.floor(index);
    const key = `${section}${FIELD_DELIMITER}${type}${FIELD_DELIMITER}${cell}`;
    const existing = merged.get(key) || { cell, count: 0, type, section };
    existing.count += Math.max(1, Math.round(count));
    merged.set(key, existing);
    if (merged.size >= MAX_CELLS_PER_BATCH) {
      break;
    }
  }
  return Array.from(merged.values());
}

function formatField(bucket, section, type, cell) {
  const safeBucket = sanitizeBucket(bucket);
  const safeSection = sanitizeSegment(section, 'root', 32);
  const safeType = sanitizeSegment(type, 'generic', 24);
  return `${safeBucket}${FIELD_DELIMITER}${safeSection}${FIELD_DELIMITER}${safeType}${FIELD_DELIMITER}${cell}`;
}

function parseFieldKey(field) {
  if (typeof field !== 'string') return null;
  const [bucket, section, type, cellStr] = field.split(FIELD_DELIMITER);
  const cell = Number.parseInt(cellStr, 10);
  if (!Number.isFinite(cell) || cell < 0) return null;
  return {
    bucket: sanitizeBucket(bucket),
    section: sanitizeSegment(section, 'root', 32),
    type: sanitizeSegment(type, 'generic', 24),
    cell,
  };
}

function mergeBucketCell(map, bucket, entry) {
  const bucketKey = sanitizeBucket(bucket);
  const bucketMap = map.get(bucketKey) || new Map();
  const cellKey = `${entry.section}${FIELD_DELIMITER}${entry.type}${FIELD_DELIMITER}${entry.cell}`;
  const current = bucketMap.get(cellKey) || { ...entry, count: 0 };
  current.count += entry.count;
  bucketMap.set(cellKey, current);
  map.set(bucketKey, bucketMap);
}

function ensureMemoryState() {
  if (!global.__heatmapMemState) {
    global.__heatmapMemState = new Map();
  }
  return global.__heatmapMemState;
}

const REDIS_INCR_SCRIPT = `
  local key = KEYS[1]
  local total = 0
  for index = 1, #ARGV, 2 do
    local field = ARGV[index]
    local increment = tonumber(ARGV[index + 1])
    if field and increment and increment > 0 then
      redis.call('HINCRBY', key, field, increment)
      total = total + increment
    end
  end
  return total
`;

async function recordWithRedis(slug, bucket, cells) {
  const { redisEval } = await import('./redisClient');
  const key = heatmapKey(slug);
  const args = [];
  for (const cell of cells) {
    args.push(formatField(bucket, cell.section, cell.type, cell.cell));
    args.push(String(cell.count));
  }

  const recorded = await redisEval(REDIS_INCR_SCRIPT, [key], args);
  if (typeof recorded !== 'number') {
    throw new Error('Unexpected Redis eval response');
  }

  return recorded;
}

async function recordWithMemory(slug, bucket, cells) {
  const state = ensureMemoryState();
  const slugMap = state.get(slug) || new Map();
  const bucketKey = sanitizeBucket(bucket);
  const bucketMap = slugMap.get(bucketKey) || new Map();
  let recorded = 0;
  for (const cell of cells) {
    const field = formatField(bucketKey, cell.section, cell.type, cell.cell);
    const current = bucketMap.get(field) || 0;
    bucketMap.set(field, current + cell.count);
    recorded += cell.count;
  }
  slugMap.set(bucketKey, bucketMap);
  state.set(slug, slugMap);
  return recorded;
}

function resolveDateKey(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

async function persistHeatmapSamplesToSupabase(slug, bucket, cells, timestamp) {
  if (!Array.isArray(cells) || cells.length === 0) return;
  if (!hasSupabaseConfig()) return;

  const dateKey = resolveDateKey(timestamp);
  const rows = cells.map((cell) => ({
    date_key: dateKey,
    slug,
    bucket,
    cell: cell.cell,
    section: cell.section,
    type: cell.type,
    count: cell.count,
  }));

  try {
    await callSupabaseRpc(SUPABASE_HEATMAP_ROLLUP_FUNCTION, { rows });
  } catch (error) {
    console.warn('[heatmap] supabase ingest failed', error);
  }
}

async function loadFromRedis(slug) {
  const { redisCommand } = await import('./redisClient');
  const key = heatmapKey(slug);
  const result = await redisCommand(['HGETALL', key], { allowReadOnly: true });
  return Array.isArray(result) ? result : [];
}

async function loadFromMemory(slug) {
  const state = ensureMemoryState();
  const slugMap = state.get(slug);
  if (!slugMap) return [];
  const payload = [];
  for (const [bucketKey, bucketMap] of slugMap.entries()) {
    for (const [field, count] of bucketMap.entries()) {
      payload.push(field, count);
    }
  }
  return payload;
}

function aggregateEntries(entries) {
  const buckets = new Map();
  for (let i = 0; i < entries.length; i += 2) {
    const field = entries[i];
    const value = Number(entries[i + 1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const parsed = parseFieldKey(field);
    if (!parsed) continue;
    mergeBucketCell(buckets, parsed.bucket, {
      cell: parsed.cell,
      section: parsed.section,
      type: parsed.type,
      count: Math.round(value),
    });
  }
  return Array.from(buckets.entries()).map(([bucket, cellMap]) => ({
    bucket,
    cells: Array.from(cellMap.values()).sort((a, b) => a.cell - b.cell),
  }));
}

export async function recordHeatmapSamples(slug, options = {}) {
  const normalizedSlug = typeof slug === 'string' ? slug.trim() : '';
  if (!normalizedSlug) return { recorded: 0 };
  const bucket = sanitizeBucket(options.bucket);
  const cells = normalizeCells(options.cells);
  if (cells.length === 0) return { recorded: 0 };

  const timestamp = Number.isFinite(Number(options.timestamp)) ? Number(options.timestamp) : Date.now();

  const { hasUpstash } = await import('./redisClient');
  let recorded = 0;
  let redisSucceeded = false;

  if (hasUpstash()) {
    try {
      recorded = await recordWithRedis(normalizedSlug, bucket, cells);
      redisSucceeded = true;
    } catch (error) {
      console.warn('[heatmap] Redis record failed, falling back to memory', error);
    }
  }

  if (!redisSucceeded) {
    recorded = await recordWithMemory(normalizedSlug, bucket, cells);
  }

  await persistHeatmapSamplesToSupabase(normalizedSlug, bucket, cells, timestamp);

  return { recorded };
}

export async function getHeatmapSnapshot(slug) {
  const normalizedSlug = typeof slug === 'string' ? slug.trim() : '';
  if (!normalizedSlug) return { slug: '', buckets: [] };

  const { hasUpstash } = await import('./redisClient');
  if (hasUpstash()) {
    try {
      const entries = await loadFromRedis(normalizedSlug);
      return { slug: normalizedSlug, buckets: aggregateEntries(entries) };
    } catch (error) {
      console.warn('[heatmap] Redis fetch failed, falling back to memory', error);
    }
  }

  const entries = await loadFromMemory(normalizedSlug);
  return { slug: normalizedSlug, buckets: aggregateEntries(entries) };
}

export function __dangerousResetHeatmapStore() {
  if (global.__heatmapMemState) {
    global.__heatmapMemState = new Map();
  }
}
