const MAX_BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 4000;
const MAX_QUEUE_SIZE = 200;
const EVENT_ENDPOINT = '/api/events/ingest';

function ensureState() {
  if (typeof window === 'undefined') return null;
  if (!window.__laffyInternalEvents) {
    window.__laffyInternalEvents = {
      queue: [],
      timer: null,
      inflight: null,
      lastFlush: 0,
    };
  }
  return window.__laffyInternalEvents;
}

function sanitizeValue(value, depth = 0) {
  if (depth > 3) return undefined;
  if (value === null) return null;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    const arr = value
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item) => item !== undefined);
    return arr.length ? arr : undefined;
  }
  if (type === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return undefined;
    const result = {};
    entries.forEach(([key, val]) => {
      if (typeof key !== 'string' || !key) return;
      const sanitized = sanitizeValue(val, depth + 1);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    });
    return Object.keys(result).length ? result : undefined;
  }
  return undefined;
}

function sanitizeProps(props) {
  if (!props || typeof props !== 'object') return {};
  const sanitized = sanitizeValue(props, 0);
  if (!sanitized || typeof sanitized !== 'object') return {};
  return sanitized;
}

function encodePayload(events) {
  try {
    return JSON.stringify({
      sentAt: new Date().toISOString(),
      events,
    });
  } catch (error) {
    return null;
  }
}

function trySendBeacon(body) {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
      return false;
    }
    const blob = new Blob([body], { type: 'application/json' });
    return navigator.sendBeacon(EVENT_ENDPOINT, blob);
  } catch (error) {
    return false;
  }
}

async function sendBatch(batch) {
  const payload = batch.map((event) => ({
    name: event.name,
    props: event.props,
    timestamp: event.timestamp,
  }));
  const body = encodePayload(payload);
  if (!body) return false;

  if (trySendBeacon(body)) {
    return true;
  }

  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller
      ? setTimeout(() => {
          try {
            controller.abort();
          } catch (error) {
            // ignore abort errors
          }
        }, 5000)
      : null;

    const res = await fetch(EVENT_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
      signal: controller ? controller.signal : undefined,
    });

    if (timeoutId) clearTimeout(timeoutId);
    return res.ok;
  } catch (error) {
    return false;
  }
}

function scheduleFlush() {
  const state = ensureState();
  if (!state) return;
  if (state.timer) return;
  state.timer = setTimeout(() => {
    state.timer = null;
    flushQueue();
  }, FLUSH_INTERVAL_MS);
}

function requeueEvents(events) {
  const state = ensureState();
  if (!state) return;
  if (!Array.isArray(events) || !events.length) return;
  const queue = state.queue;
  const combined = events.concat(queue);
  state.queue = combined.slice(0, MAX_QUEUE_SIZE);
  if (state.queue.length) {
    scheduleFlush();
  }
}

function flushQueue(force = false) {
  const state = ensureState();
  if (!state) return;
  if (state.inflight) return;

  const now = Date.now();
  if (!force && state.queue.length === 0) {
    return;
  }
  if (!force && now - state.lastFlush < 500 && state.queue.length < MAX_BATCH_SIZE) {
    scheduleFlush();
    return;
  }

  const batch = state.queue.splice(0, MAX_BATCH_SIZE);
  if (!batch.length) return;
  state.lastFlush = now;
  const pending = batch.map((item) => ({ ...item }));
  const promise = sendBatch(pending)
    .catch(() => false)
    .then((ok) => {
      if (!ok) {
        requeueEvents(pending);
      }
    })
    .finally(() => {
      state.inflight = null;
      if (state.queue.length) {
        scheduleFlush();
      }
    });
  state.inflight = promise;
}

export function dispatchInternalEvent(name, props = {}) {
  if (typeof window === 'undefined') return;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  if (!normalizedName) return;

  const state = ensureState();
  if (!state) return;
  const sanitizedProps = sanitizeProps(props);
  const event = {
    name: normalizedName,
    props: sanitizedProps,
    timestamp: Date.now(),
  };

  state.queue.push(event);
  if (state.queue.length > MAX_QUEUE_SIZE) {
    state.queue.splice(0, state.queue.length - MAX_QUEUE_SIZE);
  }

  if (state.queue.length >= MAX_BATCH_SIZE) {
    flushQueue(true);
  } else {
    scheduleFlush();
  }
}

export function flushInternalEventQueue() {
  flushQueue(true);
}
