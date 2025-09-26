import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_GRID = Object.freeze({ cols: 12, rows: 8 });
const MAX_BUFFER_SAMPLES = 10;
const FLUSH_INTERVAL_MS = 4000;
const SCROLL_SAMPLE_INTERVAL_MS = 750;

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function safeSectionId(target, container) {
  if (!target || typeof target !== 'object') return 'root';
  let node = target.nodeType === 1 ? target : target.parentElement;
  while (node) {
    if (node.dataset && typeof node.dataset.heatmapSection === 'string') {
      const value = node.dataset.heatmapSection.trim();
      if (value) return value.slice(0, 50);
    }
    if (node === container) break;
    node = node.parentElement;
  }
  return 'root';
}

function resolveViewportBucket() {
  if (typeof window === 'undefined') return 'ssr';
  const width = Math.max(1, Math.floor(window.innerWidth || 0));
  const height = Math.max(1, Math.floor(window.innerHeight || 0));
  const density = Math.round((window.devicePixelRatio || 1) * 10) / 10;
  const widthBucket = width <= 640 ? 'sm' : width <= 1024 ? 'md' : 'lg';
  const heightBucket = height <= 700 ? 'short' : height <= 900 ? 'medium' : 'tall';
  return `${widthBucket}-${heightBucket}-${width}x${height}-d${density}`;
}

function ensureSessionId() {
  if (typeof window === 'undefined') return null;
  const storageKey = 'laffy_heatmap_session';
  try {
    const storage = window.sessionStorage;
    if (!storage) return null;
    const existing = storage.getItem(storageKey);
    if (existing && typeof existing === 'string') return existing;
    const cryptoObj = window.crypto;
    let generated = null;
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
      generated = cryptoObj.randomUUID().replace(/-/g, '');
    } else {
      generated = Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
    if (generated) {
      storage.setItem(storageKey, generated);
    }
    return generated;
  } catch (error) {
    return null;
  }
}

function serializeSamples(buffer) {
  const cells = [];
  buffer.forEach((count, key) => {
    if (!Number.isFinite(count) || count <= 0) return;
    const [cellIndexStr, type, section] = key.split('|');
    const cell = Number.parseInt(cellIndexStr, 10);
    if (!Number.isFinite(cell)) return;
    cells.push({ cell, type: type || 'generic', section: section || 'root', count: Math.round(count) });
  });
  return cells;
}

async function sendPayload(payload) {
  const body = JSON.stringify(payload);
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/heatmap/record', blob)) return;
    } catch (error) {
      // swallow beacon errors and fallback to fetch
    }
  }

  try {
    await fetch('/api/heatmap/record', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch (error) {
    // ignore network errors
  }
}

export function useHeatmapTracker(options = {}) {
  const { slug, enabled = true, grid = DEFAULT_GRID } = options;
  const [container, setContainer] = useState(null);
  const containerRef = useCallback((node) => {
    setContainer(node || null);
  }, []);

  const gridState = useMemo(() => {
    const cols = Number.isFinite(grid?.cols) && grid.cols > 0 ? Math.floor(grid.cols) : DEFAULT_GRID.cols;
    const rows = Number.isFinite(grid?.rows) && grid.rows > 0 ? Math.floor(grid.rows) : DEFAULT_GRID.rows;
    return { cols, rows, total: cols * rows };
  }, [grid]);

  const bufferRef = useRef(new Map());
  const sampleCountRef = useRef(0);
  const flushTimerRef = useRef(null);
  const rafRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const sessionIdRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    if (rafRef.current && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const resetBuffer = useCallback(() => {
    bufferRef.current = new Map();
    sampleCountRef.current = 0;
  }, []);

  const flushBuffer = useCallback(
    async (reason = 'interval') => {
      if (!slug || !enabled) {
        resetBuffer();
        return;
      }
      const buffer = bufferRef.current;
      if (!(buffer instanceof Map) || buffer.size === 0) {
        resetBuffer();
        return;
      }
      const cells = serializeSamples(buffer);
      resetBuffer();
      if (cells.length === 0) return;

      const payload = {
        slug,
        viewportBucket: resolveViewportBucket(),
        cells,
        sessionId: sessionIdRef.current || null,
        reason,
        ts: Date.now(),
      };
      await sendPayload(payload);
    },
    [enabled, resetBuffer, slug]
  );

  const scheduleFlush = useCallback(
    (reason) => {
      if (sampleCountRef.current >= MAX_BUFFER_SAMPLES) {
        flushBuffer(reason || 'sample_limit');
        return;
      }
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        flushBuffer('timer');
      }, FLUSH_INTERVAL_MS);
    },
    [flushBuffer]
  );

  const pushSample = useCallback(
    (sample) => {
      if (!enabled || !slug) return;
      if (!sample) return;
      const cols = gridState.cols;
      const rows = gridState.rows;
      const x = clamp01(sample.xRatio ?? 0.5);
      const y = clamp01(sample.yRatio ?? 0.5);
      const column = Math.min(cols - 1, Math.floor(x * cols));
      const row = Math.min(rows - 1, Math.floor(y * rows));
      const cellIndex = row * cols + column;
      const type = typeof sample.type === 'string' && sample.type ? sample.type.slice(0, 24) : 'generic';
      const section = typeof sample.section === 'string' && sample.section ? sample.section.slice(0, 32) : 'root';
      const key = `${cellIndex}|${type}|${section}`;
      const current = bufferRef.current.get(key) || 0;
      bufferRef.current.set(key, current + 1);
      sampleCountRef.current += 1;
      scheduleFlush('buffer');
    },
    [enabled, gridState.cols, gridState.rows, scheduleFlush, slug]
  );

  const processPointerEvent = useCallback(
    (event, type) => {
      if (!event || !enabled) return;
      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth || 1 : 1;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight || 1 : 1;
      const xRatio = clamp01(event.clientX / Math.max(1, viewportWidth));
      const yRatio = clamp01(event.clientY / Math.max(1, viewportHeight));
      const section = safeSectionId(event.target, container);
      pushSample({ type, xRatio, yRatio, section });
    },
    [container, enabled, pushSample]
  );

  const pointerHandler = useCallback(
    (type) => (event) => {
      if (!enabled) return;
      if (rafRef.current && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const handle = () => {
        rafRef.current = null;
        processPointerEvent(event, type);
      };
      if (typeof requestAnimationFrame === 'function') {
        rafRef.current = requestAnimationFrame(handle);
      } else {
        setTimeout(handle, 16);
      }
    },
    [enabled, processPointerEvent]
  );

  const handleScroll = useCallback(() => {
    if (!enabled) return;
    if (scrollTimerRef.current) return;
    scrollTimerRef.current = setTimeout(() => {
      scrollTimerRef.current = null;
      const doc = typeof document !== 'undefined' ? document.documentElement : null;
      if (!doc) return;
      const scrollable = Math.max(1, doc.scrollHeight - (window.innerHeight || 0));
      const yRatio = clamp01((window.scrollY || window.pageYOffset || 0) / scrollable);
      pushSample({ type: 'scroll', xRatio: 0.5, yRatio, section: 'page' });
    }, SCROLL_SAMPLE_INTERVAL_MS);
  }, [enabled, pushSample]);

  useEffect(() => {
    if (!enabled || !slug) return undefined;
    sessionIdRef.current = ensureSessionId();
    return () => {
      sessionIdRef.current = null;
    };
  }, [enabled, slug]);

  useEffect(() => {
    if (!enabled || !container) return undefined;

    const moveListener = pointerHandler('pointermove');
    const downListener = pointerHandler('pointerdown');
    container.addEventListener('pointermove', moveListener, { passive: true });
    container.addEventListener('pointerdown', downListener, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    const visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        flushBuffer('hidden');
      }
    };
    const pagehideHandler = () => flushBuffer('pagehide');

    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('pagehide', pagehideHandler);
    window.addEventListener('beforeunload', pagehideHandler);

    return () => {
      container.removeEventListener('pointermove', moveListener);
      container.removeEventListener('pointerdown', downListener);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('pagehide', pagehideHandler);
      window.removeEventListener('beforeunload', pagehideHandler);
      clearTimers();
      flushBuffer('teardown');
    };
  }, [clearTimers, container, enabled, flushBuffer, handleScroll, pointerHandler, slug]);

  useEffect(() => () => {
    clearTimers();
    flushBuffer('unmount');
  }, [clearTimers, flushBuffer]);

  return { containerRef };
}

export default useHeatmapTracker;
