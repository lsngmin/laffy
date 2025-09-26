import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildAnalyticsCsv } from '../../components/admin/analytics/export/AnalyticsCsvExporter';

const DEFAULT_COLUMNS = {
  views: true,
  likes: true,
  likeRate: true,
  route: true,
  edit: true,
};

const DEFAULT_FILTERS = {
  type: '',
  orientation: '',
  query: '',
};

const BATCH_FETCH_LIMIT = 25;

function normalizeFilters(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_FILTERS };
  }

  const type = typeof raw.type === 'string' ? raw.type.trim() : DEFAULT_FILTERS.type;
  const orientation =
    typeof raw.orientation === 'string' ? raw.orientation.trim() : DEFAULT_FILTERS.orientation;
  const query = typeof raw.query === 'string' ? raw.query.trim() : DEFAULT_FILTERS.query;

  return {
    type,
    orientation,
    query,
  };
}

export default function useAnalyticsMetrics({ items, enabled, initialFilters }) {
  const [metricsBySlug, setMetricsBySlug] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const [sortKey, setSortKey] = useState('views');
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [metricsEditor, setMetricsEditor] = useState(null);
  const [filtersState, setFiltersState] = useState(() => normalizeFilters(initialFilters));

  const pendingMetricsRef = useRef(new Set());

  useEffect(() => {
    if (!initialFilters) return;
    setFiltersState((prev) => {
      const next = normalizeFilters(initialFilters);
      const keys = Object.keys(next);
      const changed = keys.some((key) => next[key] !== prev[key]);
      return changed ? next : prev;
    });
  }, [initialFilters]);

  const filters = useMemo(() => ({ ...filtersState }), [filtersState]);

  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const normalizedQuery = filters.query.trim().toLowerCase();

    return items.filter((item) => {
      if (!item) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.orientation && item.orientation !== filters.orientation) return false;
      if (normalizedQuery) {
        const haystack = `${item.title || ''} ${item.slug || ''}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }
      return true;
    });
  }, [items, filters]);

  useEffect(() => {
    setMetricsBySlug((prev) => {
      if (!prev || typeof prev !== 'object') return {};
      const next = {};
      const allowedSlugs = new Set();
      filteredItems.forEach((item) => {
        if (item.slug && prev[item.slug]) next[item.slug] = prev[item.slug];
        if (item.slug) allowedSlugs.add(item.slug);
      });
      const pendingSet = pendingMetricsRef.current;
      pendingSet.forEach((slug) => {
        if (!allowedSlugs.has(slug)) {
          pendingSet.delete(slug);
        }
      });
      return next;
    });
  }, [filteredItems]);

  useEffect(() => {
    if (!enabled) return undefined;
    const slugs = filteredItems.map((item) => item.slug).filter(Boolean);
    const pendingSet = pendingMetricsRef.current;
    const fetchTargets = slugs.filter((slug) => !metricsBySlug[slug] && !pendingSet.has(slug));

    if (!fetchTargets.length) {
      setMetricsLoading(false);
      return undefined;
    }

    fetchTargets.forEach((slug) => pendingSet.add(slug));
    let cancelled = false;

    setMetricsLoading(true);
    setMetricsError(null);

    const fetchBatch = async (chunkSlugs) => {
      if (!chunkSlugs.length) return {};

      const aggregated = {};
      let cursor = 0;
      let safetyCounter = 0;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams();
        chunkSlugs.forEach((slug) => params.append('slugs[]', slug));
        params.set('limit', String(BATCH_FETCH_LIMIT));
        if (cursor > 0) params.set('cursor', String(cursor));
        const res = await fetch(`/api/metrics/batch?${params.toString()}`);
        if (!res.ok) {
          throw new Error('metrics_error');
        }
        const data = await res.json();
        if (data?.metrics && typeof data.metrics === 'object') {
          Object.entries(data.metrics).forEach(([slug, metrics]) => {
            aggregated[slug] = {
              views: Number(metrics?.views) || 0,
              likes: Math.max(0, Number(metrics?.likes) || 0),
            };
            if (typeof metrics?.liked === 'boolean') {
              aggregated[slug].liked = metrics.liked;
            }
          });
        }

        if (data && data.nextCursor !== null && data.nextCursor !== undefined) {
          const nextValue = Number(data.nextCursor);
          hasMore = Number.isFinite(nextValue) && nextValue > cursor && nextValue < chunkSlugs.length;
          cursor = hasMore ? nextValue : 0;
        } else {
          hasMore = false;
        }

        safetyCounter += 1;
        if (safetyCounter > Math.ceil(chunkSlugs.length / BATCH_FETCH_LIMIT) + 1) {
          throw new Error('metrics_batch_loop');
        }
      }

      return aggregated;
    };

    (async () => {
      try {
        const chunks = [];
        for (let index = 0; index < fetchTargets.length; index += BATCH_FETCH_LIMIT) {
          chunks.push(fetchTargets.slice(index, index + BATCH_FETCH_LIMIT));
        }

        const batchResults = await Promise.all(chunks.map((chunk) => fetchBatch(chunk)));

        if (cancelled) return;
        setMetricsBySlug((prev) => {
          const next = { ...prev };
          batchResults.forEach((batch) => {
            Object.entries(batch).forEach(([slug, metrics]) => {
              next[slug] = metrics;
            });
          });
          return next;
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Metrics fetch failed', error);
          setMetricsError('메트릭을 불러오지 못했어요.');
        }
      } finally {
        fetchTargets.forEach((slug) => pendingSet.delete(slug));
        if (!cancelled) setMetricsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      fetchTargets.forEach((slug) => pendingSet.delete(slug));
      setMetricsLoading(false);
    };
  }, [enabled, filteredItems, metricsBySlug]);

  const analyticsRows = useMemo(
    () =>
      filteredItems
        .filter((item) => item.slug)
        .map((item) => ({
          ...item,
          metrics: metricsBySlug[item.slug] || null,
        })),
    [filteredItems, metricsBySlug]
  );

  const sortedAnalyticsRows = useMemo(() => {
    const rows = [...analyticsRows];
    const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const metricsA = a.metrics || {};
      const metricsB = b.metrics || {};
      const aValue = sortKey === 'likes' ? metricsA.likes ?? 0 : metricsA.views ?? 0;
      const bValue = sortKey === 'likes' ? metricsB.likes ?? 0 : metricsB.views ?? 0;
      return (bValue - aValue) * directionMultiplier;
    });
    return rows;
  }, [analyticsRows, sortDirection, sortKey]);

  const analyticsTotals = useMemo(
    () =>
      analyticsRows.reduce(
        (acc, row) => {
          if (!row.metrics) return acc;
          return {
            views: acc.views + (row.metrics.views || 0),
            likes: acc.likes + (row.metrics.likes || 0),
          };
        },
        { views: 0, likes: 0 }
      ),
    [analyticsRows]
  );

  const averageLikeRate = useMemo(() => {
    const withViews = analyticsRows.filter((row) => row.metrics && row.metrics.views > 0);
    if (!withViews.length) return 0;
    const totalRate = withViews.reduce(
      (acc, row) => acc + row.metrics.likes / row.metrics.views,
      0
    );
    return totalRate / withViews.length;
  }, [analyticsRows]);

  const toggleColumn = useCallback((column) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  }, []);

  const setFilters = useCallback((updater) => {
    setFiltersState((prev) => {
      const draft = { ...prev };
      const patch = typeof updater === 'function' ? updater(draft) : updater;
      const merged = { ...prev, ...(patch || {}) };
      const normalized = normalizeFilters(merged);
      const keys = Object.keys(normalized);
      const changed = keys.some((key) => normalized[key] !== prev[key]);
      return changed ? normalized : prev;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState((prev) => {
      const next = { ...DEFAULT_FILTERS };
      const keys = Object.keys(next);
      const changed = keys.some((key) => next[key] !== prev[key]);
      return changed ? next : prev;
    });
  }, []);

  const setSort = useCallback((key) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setSortDirection('desc');
      return key;
    });
  }, []);

  const openMetricsEditor = useCallback((row) => {
    if (!row?.slug) return;
    const baseViews =
      typeof row.metrics?.views === 'number'
        ? row.metrics.views
        : typeof row.views === 'number'
          ? row.views
          : null;
    const baseLikes =
      typeof row.metrics?.likes === 'number'
        ? row.metrics.likes
        : typeof row.likes === 'number'
          ? row.likes
          : null;
    const views = baseViews === null ? '' : String(baseViews);
    const likes = baseLikes === null ? '' : String(baseLikes);
    setMetricsEditor({
      slug: row.slug,
      title: row.title || row.slug,
      views,
      likes,
      status: 'idle',
      error: '',
    });
  }, []);

  const closeMetricsEditor = useCallback(() => {
    setMetricsEditor(null);
  }, []);

  const handleMetricsFieldChange = useCallback((field, value) => {
    setMetricsEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
        error: '',
        status: prev.status === 'error' ? 'idle' : prev.status,
      };
    });
  }, []);

  const updateMetricsForSlug = useCallback((slug, views, likes) => {
    setMetricsBySlug((prev) => ({
      ...prev,
      [slug]: { views, likes },
    }));
  }, []);

  const buildCsv = useCallback(() => buildAnalyticsCsv(sortedAnalyticsRows), [sortedAnalyticsRows]);

  return {
    analyticsRows,
    sortedAnalyticsRows,
    analyticsTotals,
    averageLikeRate,
    filteredItems,
    filters,
    setFilters,
    resetFilters,
    metricsBySlug,
    metricsLoading,
    metricsError,
    setMetricsBySlug,
    sortKey,
    sortDirection,
    setSort,
    visibleColumns,
    toggleColumn,
    metricsEditor,
    openMetricsEditor,
    closeMetricsEditor,
    handleMetricsFieldChange,
    setMetricsEditor,
    updateMetricsForSlug,
    buildCsv,
  };
}
