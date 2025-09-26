// Vercel Analytics helper (safe wrapper)
import { track } from '@vercel/analytics';
import { dispatchInternalEvent } from './internalEventsClient';

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
    dispatchInternalEvent(name, props);
  } catch (error) {
    // internal event tracking failures must not block page interactions
  }
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
  } catch (e) {
    // no-op in SSR or if analytics is unavailable
  }
}
