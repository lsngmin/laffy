import { isInternalRedisIngestionDisabled } from './internalRedisToggle';

const AUDIT_GLOBAL_KEY = 'metrics:audit-log';
const AUDIT_BLOB_KEY = 'metrics/audit-log.json';
const AUDIT_MAX_ENTRIES = 500;

function toNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.round(num));
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const slug = typeof entry.slug === 'string' ? entry.slug.trim() : '';
  if (!slug) return null;
  const changedAt = typeof entry.changedAt === 'string' ? entry.changedAt : new Date().toISOString();
  const changedBy = typeof entry.changedBy === 'string' && entry.changedBy.trim() ? entry.changedBy.trim() : 'unknown';
  const before = {
    views: toNumber(entry.before?.views),
    likes: toNumber(entry.before?.likes),
  };
  const after = {
    views: toNumber(entry.after?.views),
    likes: toNumber(entry.after?.likes),
  };
  const id =
    typeof entry.id === 'string' && entry.id.trim()
      ? entry.id.trim()
      : `${slug}:${Date.now()}:${Math.random().toString(16).slice(2, 10)}`;
  return {
    id,
    slug,
    changedAt,
    changedBy,
    before,
    after,
  };
}

function ensureMemoryStore() {
  if (!global.__metricsAuditLog) {
    global.__metricsAuditLog = {
      entries: [],
    };
  }
  return global.__metricsAuditLog;
}

async function hasRedis() {
  if (isInternalRedisIngestionDisabled()) {
    return false;
  }
  const { hasUpstash } = await import('./redisClient');
  return hasUpstash();
}

async function memoryRecord(entries) {
  const store = ensureMemoryStore();
  entries.forEach((entry) => {
    store.entries.unshift(entry);
  });
  if (store.entries.length > AUDIT_MAX_ENTRIES) {
    store.entries.length = AUDIT_MAX_ENTRIES;
  }
}

async function memoryList({ slugs, limit }) {
  const store = ensureMemoryStore();
  const filtered = filterEntries(store.entries, slugs);
  return filtered.slice(0, limit || AUDIT_MAX_ENTRIES);
}

async function blobLoadAll(blobClient) {
  try {
    const { list } = blobClient;
    const { blobs } = await list({ prefix: AUDIT_BLOB_KEY });
    const found = blobs.find((blob) => blob.pathname === AUDIT_BLOB_KEY);
    if (!found) return [];
    const res = await fetch(found.url);
    if (!res.ok) return [];
    const json = await res.json();
    if (!json || !Array.isArray(json.entries)) return [];
    return json.entries
      .map((entry) => sanitizeEntry(entry))
      .filter(Boolean);
  } catch (error) {
    console.warn('[metrics:audit] Failed to load blob audit log', error);
    return [];
  }
}

async function blobRecord(entries) {
  const { loadBlob } = await import('./dynamicBlob');
  const client = await loadBlob();
  const existing = await blobLoadAll(client);
  const nextEntries = [...entries, ...existing].slice(0, AUDIT_MAX_ENTRIES);
  const payload = JSON.stringify({ entries: nextEntries });
  await client.put(AUDIT_BLOB_KEY, payload, {
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: 'application/json',
    access: 'private',
  });
}

async function blobList({ slugs, limit }) {
  const { loadBlob } = await import('./dynamicBlob');
  const client = await loadBlob();
  const entries = await blobLoadAll(client);
  const filtered = filterEntries(entries, slugs);
  return filtered.slice(0, limit || AUDIT_MAX_ENTRIES);
}

function filterEntries(entries, slugs) {
  if (!Array.isArray(entries)) return [];
  if (!slugs || !slugs.length) return [...entries];
  const slugSet = new Set(slugs.map((slug) => slug.trim()).filter(Boolean));
  return entries.filter((entry) => slugSet.has(entry.slug));
}

async function redisRecord(entries) {
  const { redisCommand } = await import('./redisClient');
  for (const entry of entries) {
    const payload = JSON.stringify(entry);
    await redisCommand(['LPUSH', AUDIT_GLOBAL_KEY, payload]);
  }
  await redisCommand(['LTRIM', AUDIT_GLOBAL_KEY, 0, AUDIT_MAX_ENTRIES - 1]);
}

async function redisList({ slugs, limit }) {
  const { redisCommand } = await import('./redisClient');
  const rangeEnd = Math.max((limit || AUDIT_MAX_ENTRIES) * 4 - 1, AUDIT_MAX_ENTRIES - 1);
  const rawEntries = await redisCommand(['LRANGE', AUDIT_GLOBAL_KEY, 0, rangeEnd]);
  const parsed = (rawEntries || [])
    .map((value) => {
      try {
        return sanitizeEntry(JSON.parse(value));
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
  const filtered = filterEntries(parsed, slugs);
  return filtered.slice(0, limit || AUDIT_MAX_ENTRIES);
}

export async function recordMetricsAudit(entries) {
  if (!Array.isArray(entries) || !entries.length) return;
  const sanitized = entries.map(sanitizeEntry).filter(Boolean);
  if (!sanitized.length) return;

  if (await hasRedis()) {
    await redisRecord(sanitized);
    return;
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await blobRecord(sanitized);
    return;
  }

  await memoryRecord(sanitized);
}

export async function listMetricsAudit({ slugs = [], limit = 50 } = {}) {
  const normalizedLimit = Number(limit);
  const safeLimit = Number.isFinite(normalizedLimit) && normalizedLimit > 0 ? Math.min(normalizedLimit, AUDIT_MAX_ENTRIES) : 50;

  if (await hasRedis()) {
    return redisList({ slugs, limit: safeLimit });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return blobList({ slugs, limit: safeLimit });
  }

  return memoryList({ slugs, limit: safeLimit });
}

