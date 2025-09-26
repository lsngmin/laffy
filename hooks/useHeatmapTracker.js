import { useEffect, useRef, useCallback } from 'react';

const GRID_X = 12;
const GRID_Y = 8;
const MOVE_SAMPLE_MS = 120;
const SCROLL_SAMPLE_MS = 400;
const MIN_BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5000;

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function quantize(value, bucketCount) {
  if (bucketCount <= 1) return 0;
  const clamped = clamp01(value);
  const index = Math.floor(clamped * bucketCount);
  return Math.min(bucketCount - 1, Math.max(0, index));
}

function resolveArea(target, root) {
  if (!target || !(target instanceof Element)) return 'generic';
  let current = target;
  while (current && current instanceof Element) {
    if (current.dataset?.heatmapArea) {
      return current.dataset.heatmapArea;
    }
    if (current === root) break;
    current = current.parentElement;
  }
  return 'generic';
}

function getViewportBucket() {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth || 0;
  if (width < 480) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1440) return 'lg';
  return 'xl';
}

function ensureSessionId(slug) {
  if (typeof window === 'undefined') return null;
  const storageKey = slug ? `heatmap_session:${slug}` : 'heatmap_session';
  try {
    const existing = window.sessionStorage?.getItem(storageKey);
    if (existing) return existing;
  } catch {
    // ignore storage errors (private mode, etc.)
  }

  const cryptoObj = globalThis.crypto;
  let generated = '';
  try {
    if (typeof cryptoObj?.randomUUID === 'function') {
      generated = cryptoObj.randomUUID().replace(/-/g, '');
    }
  } catch {
    // ignore and fall back to manual generation
  }

  if (!generated) {
    try {
      const bytes = new Uint8Array(16);
      if (typeof cryptoObj?.getRandomValues === 'function') {
        cryptoObj.getRandomValues(bytes);
      } else {
        const { randomBytes } = require('crypto');
        randomBytes(16).forEach((value, index) => {
          bytes[index] = value;
        });
      }
      generated = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      generated = `${Date.now()}${Math.random().toString(16).slice(2)}`;
    }
  }

  try {
    window.sessionStorage?.setItem(storageKey, generated);
  } catch {
    // ignore persistence failure
  }

  return generated;
}

async function postHeatmapPayload(payload) {
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (navigator.sendBeacon('/api/heatmap/record', blob)) {
      return;
    }
  }

  try {
    await fetch('/api/heatmap/record', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // network failure is tolerated silently
  }
}

export default function useHeatmapTracker({ slug, enabled = true } = {}) {
  const rootRef = useRef(null);
  const bufferRef = useRef({ pointer: new Map(), scroll: new Map() });
  const moveStateRef = useRef({ lastTs: 0, lastCell: '' });
  const scrollStateRef = useRef({ lastTs: 0 });
  const flushTimerRef = useRef(null);
  const viewportRef = useRef('unknown');
  const sessionIdRef = useRef(null);

  const resetBuffer = useCallback(() => {
    bufferRef.current = { pointer: new Map(), scroll: new Map() };
  }, []);

  const flushBuffer = useCallback(
    (options = {}) => {
      const { immediate = false } = options;
      if (!slug || typeof window === 'undefined') return;
      const pointerEntries = Array.from(bufferRef.current.pointer.entries());
      const scrollEntries = Array.from(bufferRef.current.scroll.entries());
      if (!pointerEntries.length && !scrollEntries.length) return;

      const pointer = pointerEntries.map(([key, count]) => {
        const [area, type, xIndex, yIndex] = key.split('|');
        return {
          area,
          type,
          x: Number(xIndex),
          y: Number(yIndex),
          count,
        };
      });

      const scroll = scrollEntries.map(([bucket, count]) => ({
        bucket: Number(bucket),
        count,
      }));

      const payload = {
        slug,
        viewportBucket: viewportRef.current,
        sessionId: sessionIdRef.current,
        pointer,
        scroll,
        sentAt: new Date().toISOString(),
      };

      if (immediate) {
        postHeatmapPayload(payload);
      } else {
        postHeatmapPayload(payload);
      }

      resetBuffer();
    },
    [resetBuffer, slug]
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    sessionIdRef.current = ensureSessionId(slug);
    viewportRef.current = getViewportBucket();
    resetBuffer();

    const root = rootRef.current;
    if (!root) return undefined;

    const handlePointerEvent = (event, type) => {
      if (!root) return;
      const rect = root.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      const xRatio = (event.clientX - rect.left) / rect.width;
      const yRatio = (event.clientY - rect.top) / rect.height;
      const xIndex = quantize(xRatio, GRID_X);
      const yIndex = quantize(yRatio, GRID_Y);
      const area = resolveArea(event.target, root);
      const cellKey = `${area}|${type}|${xIndex}|${yIndex}`;
      if (type === 'move') {
        const perf = typeof globalThis !== 'undefined' ? globalThis.performance : undefined;
        const now = typeof perf?.now === 'function' ? perf.now() : Date.now();
        const last = moveStateRef.current;
        if (last.lastCell === cellKey && now - last.lastTs < MOVE_SAMPLE_MS) {
          return;
        }
        moveStateRef.current = { lastCell: cellKey, lastTs: now };
      }

      const buffer = bufferRef.current.pointer;
      buffer.set(cellKey, (buffer.get(cellKey) || 0) + 1);

      if (buffer.size + bufferRef.current.scroll.size >= MIN_BATCH_SIZE) {
        flushBuffer();
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
      } else if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushBuffer();
        }, FLUSH_INTERVAL_MS);
      }
    };

    const onPointerMove = (event) => handlePointerEvent(event, 'move');
    const onPointerDown = (event) => handlePointerEvent(event, 'down');

    const onScroll = () => {
      const perf = typeof globalThis !== 'undefined' ? globalThis.performance : undefined;
      const now = typeof perf?.now === 'function' ? perf.now() : Date.now();
      if (now - scrollStateRef.current.lastTs < SCROLL_SAMPLE_MS) return;
      scrollStateRef.current.lastTs = now;
      const doc = document.documentElement;
      const maxScroll = Math.max(0, (doc?.scrollHeight || 0) - (window.innerHeight || 0));
      const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      const bucket = quantize(ratio, GRID_Y);
      const scrollBuffer = bufferRef.current.scroll;
      scrollBuffer.set(String(bucket), (scrollBuffer.get(String(bucket)) || 0) + 1);

      if (scrollBuffer.size + bufferRef.current.pointer.size >= MIN_BATCH_SIZE) {
        flushBuffer();
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
      } else if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushBuffer();
        }, FLUSH_INTERVAL_MS);
      }
    };

    const onResize = () => {
      viewportRef.current = getViewportBucket();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushBuffer({ immediate: true });
      }
    };

    root.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', flushBuffer);

    return () => {
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', flushBuffer);
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flushBuffer({ immediate: true });
    };
  }, [enabled, flushBuffer, resetBuffer, slug]);

  return rootRef;
}
