const TRUTHY = new Set(['1', 'true', 'yes', 'on']);
const FALSY = new Set(['0', 'false', 'no', 'off']);

function normalize(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

export function isInternalRedisIngestionDisabled() {
  const enableRaw = process.env.ENABLE_INTERNAL_REDIS_EVENTS ?? process.env.ENABLE_INTERNAL_REDIS;
  if (enableRaw) {
    const normalized = normalize(enableRaw);
    if (TRUTHY.has(normalized)) {
      return false;
    }
    if (FALSY.has(normalized)) {
      return true;
    }
  }

  const disableRaw = process.env.DISABLE_INTERNAL_REDIS_EVENTS ?? process.env.DISABLE_INTERNAL_REDIS;
  if (disableRaw) {
    const normalized = normalize(disableRaw);
    if (TRUTHY.has(normalized)) {
      return true;
    }
    if (FALSY.has(normalized)) {
      return false;
    }
  }

  return true;
}
