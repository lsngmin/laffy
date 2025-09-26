const CLICK_STORAGE_PREFIX = 'laffy:sponsorClicks:';
const SESSION_TOKEN_KEY = 'laffy:sponsorSessionToken';

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage || window.localStorage || null;
  } catch {
    return null;
  }
}

function safeParseInt(value, fallback = 0) {
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) ? num : fallback;
}

export function getSponsorSessionToken() {
  if (typeof window === 'undefined') return '';
  const storage = getStorage();
  if (!storage) return '';
  try {
    let token = storage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      const generator =
        (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      token = generator.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36);
      storage.setItem(SESSION_TOKEN_KEY, token);
    }
    return token;
  } catch {
    return '';
  }
}

export function buildSmartLinkUrl(baseUrl, token) {
  if (typeof baseUrl !== 'string' || !baseUrl) return '';
  if (!token) return baseUrl;
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('sid', token);
    return url.toString();
  } catch {
    try {
      const hasQuery = baseUrl.includes('?');
      const separator = hasQuery ? '&' : '?';
      return `${baseUrl}${separator}sid=${encodeURIComponent(token)}`;
    } catch {
      return baseUrl;
    }
  }
}

export function incrementSponsorClickCount(slug) {
  const storage = getStorage();
  if (!storage) return 1;
  const normalizedSlug = typeof slug === 'string' && slug.trim() ? slug.trim() : '__global__';
  const key = `${CLICK_STORAGE_PREFIX}${normalizedSlug}`;
  try {
    const nextCount = safeParseInt(storage.getItem(key), 0) + 1;
    storage.setItem(key, String(nextCount));
    return nextCount;
  } catch {
    return 1;
  }
}

export function markReadyStateOnce(slug, placement) {
  const storage = getStorage();
  if (!storage) return false;
  const normalizedSlug = typeof slug === 'string' && slug.trim() ? slug.trim() : '__global__';
  const normalizedPlacement = typeof placement === 'string' && placement.trim() ? placement.trim() : 'default';
  const key = `laffy:ctaReady:${normalizedSlug}:${normalizedPlacement}`;
  try {
    if (storage.getItem(key) === '1') return false;
    storage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}
