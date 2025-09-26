// Vercel Analytics helper (safe wrapper)
import { track } from '@vercel/analytics';

const INTERNAL_ENDPOINT = '/api/events/log';
const INTERNAL_BATCH_SIZE = 12;
const INTERNAL_FLUSH_MS = 2000;
const INTERNAL_MAX_QUEUE = 120;

function getInternalState() {
  if (typeof window === 'undefined') return null;
  if (!window.__vaInternal) {
    window.__vaInternal = {
      queue: [],
      timer: null,
      pending: false,
    };
  }
  return window.__vaInternal;
}

function ensureSessionId() {
  if (typeof window === 'undefined') return '';
  try {
    const storage = window.sessionStorage || window.localStorage;
    if (!storage) throw new Error('no storage');
    const key = 'va:eventSessionId';
    let sessionId = storage.getItem(key);
    if (!sessionId) {
      const generator =
        (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionId = generator.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 36);
      storage.setItem(key, sessionId);
    }
    return sessionId;
  } catch (error) {
    console.warn('[events] failed to persist session id', error);
    return '';
  }
}

function sanitizeProps(props) {
  if (!props || typeof props !== 'object') return {};
  const sanitized = {};
  Object.entries(props).forEach(([key, value]) => {
    if (typeof key !== 'string') return;
    const trimmedKey = key.trim();
    if (!trimmedKey) return;
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
      sanitized[trimmedKey] = value.slice(0, 500);
      return;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      sanitized[trimmedKey] = value;
      return;
    }
    if (typeof value === 'boolean') {
      sanitized[trimmedKey] = value;
    }
  });
  return sanitized;
}

function flushInternalQueue(reason = 'timer') {
  const state = getInternalState();
  if (!state || !state.queue.length || state.pending) return;
  const batch = state.queue.splice(0, INTERNAL_BATCH_SIZE);
  if (!batch.length) return;

  const payload = {
    sessionId: ensureSessionId(),
    events: batch,
    sentAt: Date.now(),
    reason,
  };

  state.pending = true;

  const serialized = JSON.stringify(payload);
  const finalize = () => {
    state.pending = false;
    if (state.queue.length) {
      flushInternalQueue('drain');
    }
  };

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([serialized], { type: 'application/json' });
      const ok = navigator.sendBeacon(INTERNAL_ENDPOINT, blob);
      if (ok) {
        finalize();
        return;
      }
    }
  } catch (error) {
    console.warn('[events] sendBeacon failed', error);
  }

  try {
    fetch(INTERNAL_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: serialized,
      keepalive: true,
    })
      .catch(() => {})
      .finally(finalize);
  } catch (error) {
    console.warn('[events] fetch failed', error);
    finalize();
  }
}

function scheduleInternalFlush() {
  const state = getInternalState();
  if (!state) return;
  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.timer = null;
    flushInternalQueue('interval');
  }, INTERNAL_FLUSH_MS);
}

function queueInternalEvent(name, props) {
  if (typeof window === 'undefined') return;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) return;
  const state = getInternalState();
  if (!state) return;

  const sanitizedProps = sanitizeProps(props);
  const slugValue = typeof sanitizedProps.slug === 'string' ? sanitizedProps.slug.trim() : '';
  const event = {
    name: trimmedName,
    props: sanitizedProps,
    slug: slugValue || undefined,
    ts: Date.now(),
  };

  state.queue.push(event);
  if (state.queue.length >= INTERNAL_MAX_QUEUE) {
    state.queue.splice(0, state.queue.length - INTERNAL_MAX_QUEUE);
  }

  if (state.queue.length >= INTERNAL_BATCH_SIZE) {
    flushInternalQueue('batch');
  } else {
    scheduleInternalFlush();
  }
}

function setupVisibilityHandler() {
  if (typeof window === 'undefined') return;
  if (window.__vaInternalVisibilityHooked) return;
  window.__vaInternalVisibilityHooked = true;
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushInternalQueue('hidden');
    }
  });
  window.addEventListener('beforeunload', () => {
    flushInternalQueue('unload');
  });
}

// Simple client-side queue to avoid early-call loss before <Analytics /> hydrates
function getQueue() {
  if (typeof window === 'undefined') return null;
  if (!window.__vaq) window.__vaq = [];
  return window.__vaq;
}

function isTrackReady() {
  try { return typeof track === 'function'; } catch { return false; }
}

function flushQueue() {
  const q = getQueue();
  if (!q || !q.length || !isTrackReady()) return;
  const items = q.splice(0, q.length);
  for (const it of items) {
    try { track(it.name, it.props || {}); } catch {}
  }
}

export function vaTrack(name, props = {}) {
  try {
    if (isTrackReady()) {
      track(name, props);
    } else {
      const q = getQueue();
      if (q) q.push({ name, props });
      // try flushing shortly after
      if (typeof window !== 'undefined') {
        setTimeout(flushQueue, 100);
      }
    }
    queueInternalEvent(name, props);
    setupVisibilityHandler();
  } catch (e) {
    // no-op in SSR or if analytics is unavailable
  }
}
