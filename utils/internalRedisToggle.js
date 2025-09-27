const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

function normalize(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

export function isInternalRedisIngestionDisabled() {
  const raw = process.env.DISABLE_INTERNAL_REDIS_EVENTS ?? process.env.DISABLE_INTERNAL_REDIS;
  if (!raw) return false;
  const normalized = normalize(raw);
  if (!normalized) return false;
  if (TRUTHY.has(normalized)) return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'off' || normalized === 'no') {
    return false;
  }
  return true;
}
