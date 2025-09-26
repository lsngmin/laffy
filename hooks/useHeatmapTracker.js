import { useEffect, useMemo, useRef } from 'react';

const GRID_COLUMNS = 12;
const GRID_ROWS = 8;
const MAX_BUFFER_SAMPLES = 8;
const FLUSH_INTERVAL_MS = 10000;
const SCROLL_SAMPLE_INTERVAL_MS = 500;

function clampRatio(value) {
  if (!Number.isFinite(value)) return null;
  const clamped = Math.max(0, Math.min(0.9999, value));
  return clamped;
}

function computeCellIndex(xRatio, yRatio) {
  const clampedX = clampRatio(xRatio);
  const clampedY = clampRatio(yRatio);
  if (clampedX === null || clampedY === null) return null;
  const column = Math.min(GRID_COLUMNS - 1, Math.floor(clampedX * GRID_COLUMNS));
  const row = Math.min(GRID_ROWS - 1, Math.floor(clampedY * GRID_ROWS));
  return row * GRID_COLUMNS + column;
}

function resolveSectionId(target) {
  if (!target || typeof target.closest !== 'function') return 'root';
  const element = target.closest('[data-heatmap-section]');
  if (!element) return 'root';
  const value = element.getAttribute('data-heatmap-section');
  return typeof value === 'string' && value.trim() ? value.trim() : 'root';
}

function bucketForDimension(value) {
  if (!Number.isFinite(value) || value <= 0) return 'xs';
  if (value < 480) return 'xs';
  if (value < 768) return 'sm';
  if (value < 1024) return 'md';
  if (value < 1440) return 'lg';
  return 'xl';
}

function getViewportBucket() {
  if (typeof window === 'undefined') return 'unknown';
  const width = Math.round(window.innerWidth || 0);
  const height = Math.round(window.innerHeight || 0);
  const dpr = window.devicePixelRatio || 1;
  const widthBucket = bucketForDimension(width);
  const heightBucket = bucketForDimension(height);
  const roundedDpr = Math.max(1, Math.round(dpr * 10) / 10);
  return `${widthBucket}x${heightBucket}@${roundedDpr}`;
}

function sendPayload(body) {
  if (!body) return;
  try {
    const json = JSON.stringify(body);
    const url = '/api/heatmap/record';
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([json], { type: 'application/json' });
      if (navigator.sendBeacon(url, blob)) return;
    }
    if (typeof fetch === 'function') {
      fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: json,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // swallow
  }
}

function normalizeSlug(slug) {
  if (typeof slug !== 'string') return '';
  const trimmed = slug.trim();
  return trimmed || '';
}

export default function useHeatmapTracker({ slug, enabled = true } = {}) {
  const containerRef = useRef(null);
  const stateRef = useRef({
    cells: new Map(),
    sampleCount: 0,
    lastFlushAt: 0,
  });
  const scrollTimerRef = useRef(null);

  const normalizedSlug = useMemo(() => normalizeSlug(slug), [slug]);
  const isActive = Boolean(enabled && normalizedSlug);

  useEffect(() => {
    stateRef.current.cells.clear();
    stateRef.current.sampleCount = 0;
    stateRef.current.lastFlushAt = 0;
  }, [normalizedSlug]);

  useEffect(() => {
    if (!isActive) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const state = stateRef.current;

    const flush = (reason = 'interval') => {
      if (!state.cells.size) return;
      const payload = {
        slug: normalizedSlug,
        viewportBucket: getViewportBucket(),
        reason,
        cells: Array.from(state.cells.entries()).map(([key, count]) => {
          const [eventType, sectionId, cellIndex] = key.split('|');
          return {
            eventType,
            sectionId,
            cell: Number(cellIndex),
            count,
          };
        }),
      };
      state.cells.clear();
      state.sampleCount = 0;
      state.lastFlushAt = Date.now();
      sendPayload(payload);
    };

    const queueSample = ({ eventType, sectionId, xRatio, yRatio }) => {
      if (!normalizedSlug) return;
      const cellIndex = computeCellIndex(xRatio, yRatio);
      if (cellIndex === null) return;
      const key = `${eventType}|${sectionId}|${cellIndex}`;
      const prev = state.cells.get(key) || 0;
      state.cells.set(key, prev + 1);
      state.sampleCount += 1;
      if (state.sampleCount >= MAX_BUFFER_SAMPLES) {
        flush('threshold');
      }
    };

    let pointerRaf = null;
    let pendingPointerEvent = null;

    const processPointerEvent = () => {
      if (!pendingPointerEvent) return;
      const event = pendingPointerEvent;
      pendingPointerEvent = null;
      const rect = container.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (!width || !height) return;
      const x = (event.clientX - rect.left) / width;
      const y = (event.clientY - rect.top) / height;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const sectionId = resolveSectionId(event.target);
      queueSample({
        eventType: event.type === 'pointerdown' ? 'pointerdown' : 'pointermove',
        sectionId,
        xRatio: x,
        yRatio: y,
      });
    };

    const handlePointer = (event) => {
      pendingPointerEvent = event;
      if (pointerRaf) return;
      pointerRaf = window.requestAnimationFrame(() => {
        pointerRaf = null;
        processPointerEvent();
      });
    };

    const processScroll = () => {
      scrollTimerRef.current = null;
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      const doc = document.documentElement;
      if (!doc) return;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const yRatio = clampRatio(scrollY / maxScroll);
      if (yRatio === null) return;
      queueSample({
        eventType: 'scroll',
        sectionId: 'scroll',
        xRatio: 0.5,
        yRatio,
      });
    };

    const handleScroll = () => {
      if (scrollTimerRef.current) return;
      scrollTimerRef.current = window.setTimeout(processScroll, SCROLL_SAMPLE_INTERVAL_MS);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush('hidden');
      }
    };

    const handlePageHide = () => {
      flush('pagehide');
    };

    const intervalId = window.setInterval(() => flush('interval'), FLUSH_INTERVAL_MS);

    container.addEventListener('pointermove', handlePointer, { passive: true });
    container.addEventListener('pointerdown', handlePointer, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      if (pointerRaf) {
        window.cancelAnimationFrame(pointerRaf);
        pointerRaf = null;
      }
      if (scrollTimerRef.current) {
        window.clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
      window.clearInterval(intervalId);
      container.removeEventListener('pointermove', handlePointer);
      container.removeEventListener('pointerdown', handlePointer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      flush('cleanup');
    };
  }, [isActive, normalizedSlug]);

  return { containerRef };
}
