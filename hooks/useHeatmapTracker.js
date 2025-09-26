import { useCallback, useEffect, useRef } from "react";

const DEFAULT_COLUMNS = 12;
const DEFAULT_ROWS = 8;
const DEFAULT_FLUSH_INTERVAL = 5000;
const DEFAULT_MAX_SAMPLES = 36;
const MIN_POINTERMOVE_INTERVAL = 80;
const MIN_SCROLL_INTERVAL = 250;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function computeViewportBucket(width, height) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;
  if (!safeWidth || !safeHeight) return "unknown";
  if (safeWidth <= 480) return "xs";
  if (safeWidth <= 640) return "sm";
  if (safeWidth <= 1024) return "md";
  if (safeWidth <= 1440) return "lg";
  return "xl";
}

function getClosestZone(target) {
  if (!target || typeof target.closest !== "function") return null;
  const el = target.closest("[data-heatmap-zone]");
  if (!el) return null;
  const zone = el.getAttribute("data-heatmap-zone");
  return typeof zone === "string" && zone.trim().length > 0 ? zone.trim().slice(0, 80) : null;
}

function serializeZoneEvent(zone, type) {
  return JSON.stringify({ zone, type });
}

function normalizeGridSize(value, fallback) {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.floor(value));
}

export default function useHeatmapTracker(options = {}) {
  const {
    slug,
    enabled = true,
    columns = DEFAULT_COLUMNS,
    rows = DEFAULT_ROWS,
    flushIntervalMs = DEFAULT_FLUSH_INTERVAL,
    maxSamples = DEFAULT_MAX_SAMPLES,
  } = options || {};

  const stateRef = useRef(null);

  const trackZoneEvent = useCallback((zone, type = "custom") => {
    if (typeof zone !== "string" || !zone.trim()) return;
    const state = stateRef.current;
    if (!state) return;
    const safeZone = zone.trim().slice(0, 80);
    const safeType = typeof type === "string" && type.trim() ? type.trim().slice(0, 40) : "custom";
    const key = serializeZoneEvent(safeZone, safeType);
    const nextValue = (state.zoneEvents.get(key) || 0) + 1;
    state.zoneEvents.set(key, nextValue);
    state.sampleCount += 1;
    state.totalEvents[safeType] = (state.totalEvents[safeType] || 0) + 1;

    if (state.sampleCount >= state.maxSamples) {
      if (typeof state.flush === "function") {
        state.flush({ reason: "quota" });
      }
      return;
    }

    if (typeof state.scheduleFlush === "function") {
      state.scheduleFlush();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return () => {};
    if (!enabled || typeof slug !== "string" || !slug.trim()) return () => {};

    const colCount = normalizeGridSize(columns, DEFAULT_COLUMNS);
    const rowCount = normalizeGridSize(rows, DEFAULT_ROWS);
    const normalizedMaxSamples = Math.max(4, normalizeGridSize(maxSamples, DEFAULT_MAX_SAMPLES));
    const normalizedFlushInterval = Math.max(1000, normalizeGridSize(flushIntervalMs, DEFAULT_FLUSH_INTERVAL));

    const state = {
      slug: slug.trim(),
      columns: colCount,
      rows: rowCount,
      counts: new Map(),
      zoneEvents: new Map(),
      totalEvents: {},
      sampleCount: 0,
      flushTimer: null,
      maxSamples: normalizedMaxSamples,
      flushInterval: normalizedFlushInterval,
      viewportBucket: computeViewportBucket(window.innerWidth, window.innerHeight),
      lastPointerMoveTs: 0,
      lastScrollTs: 0,
    };

    function resetBuffers() {
      state.counts.clear();
      state.zoneEvents.clear();
      state.totalEvents = {};
      state.sampleCount = 0;
    }

    function clearTimer() {
      if (state.flushTimer) {
        clearTimeout(state.flushTimer);
        state.flushTimer = null;
      }
    }

    function scheduleFlush() {
      if (state.flushTimer) return;
      state.flushTimer = setTimeout(() => {
        state.flushTimer = null;
        flush({ reason: "timer" });
      }, state.flushInterval);
    }

    function flush(options = {}) {
      if (state.counts.size === 0 && state.zoneEvents.size === 0) {
        clearTimer();
        return;
      }

      const width = window.innerWidth || 0;
      const height = window.innerHeight || 0;
      state.viewportBucket = computeViewportBucket(width, height);

      const cells = Array.from(state.counts.entries()).map(([key, value]) => ({
        cell: Number(key),
        total: value.total || 0,
        pointermove: value.pointermove || 0,
        pointerdown: value.pointerdown || 0,
        scroll: value.scroll || 0,
      }));

      const zoneSamples = Array.from(state.zoneEvents.entries()).map(([key, count]) => {
        try {
          const parsed = JSON.parse(key);
          return {
            zone: typeof parsed.zone === "string" ? parsed.zone : "unknown",
            type: typeof parsed.type === "string" ? parsed.type : "custom",
            count,
          };
        } catch {
          return { zone: "unknown", type: "custom", count };
        }
      });

      const payload = {
        slug: state.slug,
        viewport: { width, height },
        viewportBucket: state.viewportBucket,
        sampleCount: state.sampleCount,
        cells,
        zoneSamples,
        eventTotals: state.totalEvents,
      };

      try {
        const body = JSON.stringify(payload);
        const url = "/api/heatmap/record";
        let sent = false;
        const allowKeepalive = options?.keepalive !== false;
        if (navigator?.sendBeacon && allowKeepalive) {
          const blob = new Blob([body], { type: "application/json" });
          sent = navigator.sendBeacon(url, blob);
        }
        if (!sent) {
          fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
            keepalive: allowKeepalive,
          }).catch(() => {});
        }
      } catch {
        // ignore transport errors
      }

      clearTimer();
      resetBuffers();
    }

    function recordToCell(eventLike, type) {
      if (!eventLike) return;
      const width = window.innerWidth || 0;
      const height = window.innerHeight || 0;
      if (!width || !height) return;

      const clientX = clamp(Number(eventLike.clientX) || width / 2, 0, width - 1);
      const clientY = clamp(Number(eventLike.clientY) || height / 2, 0, height - 1);

      const column = Math.min(state.columns - 1, Math.floor((clientX / width) * state.columns));
      const row = Math.min(state.rows - 1, Math.floor((clientY / height) * state.rows));
      const key = String(row * state.columns + column);

      const entry = state.counts.get(key) || { total: 0, pointermove: 0, pointerdown: 0, scroll: 0 };
      entry.total += 1;
      if (type === "pointermove") entry.pointermove += 1;
      if (type === "pointerdown") entry.pointerdown += 1;
      if (type === "scroll") entry.scroll += 1;
      state.counts.set(key, entry);

      const zone = getClosestZone(eventLike.target || null);
      if (zone) {
        const zoneKey = serializeZoneEvent(zone, type);
        state.zoneEvents.set(zoneKey, (state.zoneEvents.get(zoneKey) || 0) + 1);
      }

      state.totalEvents[type] = (state.totalEvents[type] || 0) + 1;
      state.sampleCount += 1;

      if (state.sampleCount >= state.maxSamples) {
        flush({ reason: "quota" });
      } else {
        scheduleFlush();
      }
    }

    function handlePointerMove(event) {
      const now = Date.now();
      if (now - state.lastPointerMoveTs < MIN_POINTERMOVE_INTERVAL) return;
      state.lastPointerMoveTs = now;
      recordToCell(event, "pointermove");
    }

    function handlePointerDown(event) {
      recordToCell(event, "pointerdown");
    }

    function handleScroll() {
      const now = Date.now();
      if (now - state.lastScrollTs < MIN_SCROLL_INTERVAL) return;
      state.lastScrollTs = now;
      const doc = document.documentElement || document.body;
      const maxScroll = Math.max((doc?.scrollHeight || 0) - window.innerHeight, 1);
      const scrollY = clamp(window.scrollY || doc?.scrollTop || 0, 0, maxScroll);
      const virtualY = (scrollY / maxScroll) * window.innerHeight;
      recordToCell({ clientX: window.innerWidth / 2, clientY: virtualY, target: document.body }, "scroll");
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") {
        flush({ reason: "hidden" });
      }
    }

    function handlePageHide() {
      flush({ reason: "pagehide" });
    }

    function handleResize() {
      state.viewportBucket = computeViewportBucket(window.innerWidth, window.innerHeight);
    }

    state.flush = flush;
    state.scheduleFlush = scheduleFlush;

    stateRef.current = state;

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      clearTimer();
      if (typeof state.flush === "function") {
        state.flush({ reason: "cleanup" });
      }
      stateRef.current = null;
    };
  }, [slug, enabled, columns, rows, flushIntervalMs, maxSamples]);

  return { trackZoneEvent };
}
