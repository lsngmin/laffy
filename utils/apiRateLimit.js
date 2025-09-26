const GLOBAL_KEY = Symbol.for('laffy.apiRateLimit');

function getStore() {
  const globalObject = globalThis;
  if (!globalObject[GLOBAL_KEY]) {
    globalObject[GLOBAL_KEY] = {
      buckets: new Map(),
    };
  }
  return globalObject[GLOBAL_KEY];
}

function cleanupBuckets(store, now) {
  const maxChecks = 50;
  let checked = 0;
  for (const [key, bucket] of store.buckets) {
    if (bucket.resetAt <= now) {
      store.buckets.delete(key);
    }
    checked += 1;
    if (checked >= maxChecks) break;
  }
}

function getClientIp(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor) {
    const parts = xForwardedFor.split(',');
    if (parts.length) {
      return parts[0].trim();
    }
  }
  if (Array.isArray(xForwardedFor) && xForwardedFor.length) {
    return xForwardedFor[0];
  }
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }
  return 'unknown';
}

export function applyRateLimit(req, bucketId, options) {
  const { limit = 60, windowMs = 60_000 } = options || {};
  const store = getStore();
  const now = Date.now();
  cleanupBuckets(store, now);

  const clientId = getClientIp(req);
  const key = `${bucketId}:${clientId}`;
  const bucket = store.buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    store.buckets.set(key, { count: 1, resetAt });
    return {
      ok: true,
      key,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfter: Math.ceil(windowMs / 1000),
    };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      key,
      limit,
      remaining: 0,
      resetAt: bucket.resetAt,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    key,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function setRateLimitHeaders(res, result) {
  if (!result || !res?.setHeader) return;
  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
  if (!result.ok) {
    res.setHeader('Retry-After', String(result.retryAfter));
  }
}
