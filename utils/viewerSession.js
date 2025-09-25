const COOKIE_NAME = 'laffy_vid';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function generateViewerId() {
  const cryptoObj = globalThis.crypto;
  try {
    if (typeof cryptoObj?.randomUUID === 'function') {
      return cryptoObj.randomUUID().replace(/-/g, '');
    }
  } catch (error) {
    // ignore and fallback
  }

  const bytes = new Uint8Array(16);
  if (typeof cryptoObj?.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes);
  } else {
    // eslint-disable-next-line global-require
    const { randomBytes } = require('crypto');
    randomBytes(16).forEach((value, index) => {
      bytes[index] = value;
    });
  }

  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${value}`];
  if (options.maxAge) segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.httpOnly) segments.push('HttpOnly');
  if (options.secure) segments.push('Secure');
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);
  if (options.path) segments.push(`Path=${options.path}`);
  if (options.domain) segments.push(`Domain=${options.domain}`);
  if (options.expires) segments.push(`Expires=${options.expires.toUTCString()}`);
  return segments.join('; ');
}

function appendSetCookie(res, cookie) {
  const current = res.getHeader('Set-Cookie');
  if (!current) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }
  const next = Array.isArray(current) ? current.concat(cookie) : [current, cookie];
  res.setHeader('Set-Cookie', next);
}

export function getViewerId(req) {
  const raw = req?.cookies?.[COOKIE_NAME];
  return typeof raw === 'string' && raw ? raw : null;
}

export function ensureViewerId(req, res) {
  let viewerId = getViewerId(req);
  if (viewerId) return viewerId;

  viewerId = generateViewerId();
  const cookie = serializeCookie(COOKIE_NAME, viewerId, {
    maxAge: ONE_YEAR_SECONDS,
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  appendSetCookie(res, cookie);
  if (req && req.cookies) req.cookies[COOKIE_NAME] = viewerId;
  return viewerId;
}
