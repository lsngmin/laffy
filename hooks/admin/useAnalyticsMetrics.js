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

export default function useAnalyticsMetrics({ items, enabled, initialFilters }) {
  const [metricsBySlug, setMetricsBySlug] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const [sortKey, setSortKey] = useState('views');
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [metricsEditor, setMetricsEditor] = useState(null);
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    ...(initialFilters || {}),
  }));

  const pendingMetricsRef = useRef(new Set());

  const normalizedInitialFilters = useMemo(
    () => ({
      ...DEFAULT_FILTERS,
      ...(initialFilters || {}),
    }),
    [initialFilters?.orientation, initialFilters?.query, initialFilters?.type]
  );

  useEffect(() => {
    setFilters((prev) => {
      const next = normalizedInitialFilters;
      if (
        prev.type === next.type &&
        prev.orientation === next.orientation &&
        prev.query === next.query
      ) {
        return prev;
      }
      return next;
    });
  }, [normalizedInitialFilters]);

  useEffect(() => {
    setMetricsBySlug((prev) => {
      if (!prev || typeof prev !== 'object') return {};
      const next = {};
      items.forEach((item) => {
        if (item.slug && prev[item.slug]) next[item.slug] = prev[item.slug];
      });
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (!enabled) return undefined;
    const slugs = items.map((item) => item.slug).filter(Boolean);
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

    (async () => {
      try {
        const results = await Promise.all(
          fetchTargets.map(async (slug) => {
            const res = await fetch(`/api/metrics/get?slug=${encodeURIComponent(slug)}`);
            if (!res.ok) {
              throw new Error('metrics_error');
            }
            const data = await res.json();
            return {
              slug,
              metrics: {
                views: Number(data?.views) || 0,
                likes: Math.max(0, Number(data?.likes) || 0),
              },
            };
          })
        );
        if (cancelled) return;
        setMetricsBySlug((prev) => {
          const next = { ...prev };
          results.forEach(({ slug, metrics }) => {
            next[slug] = metrics;
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
  }, [enabled, items, metricsBySlug]);

  const filteredItems = useMemo(() => {
    const activeType = filters.type || '';
    const activeOrientation = filters.orientation || '';
    const query = (filters.query || '').trim().toLowerCase();

    return items.filter((item) => {
      if (!item?.slug) return false;
      if (activeType && item.type !== activeType) return false;
      if (activeOrientation && item.orientation !== activeOrientation) return false;
      if (query) {
        const haystack = `${item.title || ''} ${item.slug || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [filters.orientation, filters.query, filters.type, items]);

  const analyticsRows = useMemo(
    () =>
      filteredItems.map((item) => ({
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

  const updateFilters = useCallback((nextFilters) => {
    setFilters((prev) => {
      const updates =
        typeof nextFilters === 'function' ? nextFilters(prev) : { ...nextFilters };
      if (!updates || typeof updates !== 'object') {
        return prev;
      }
      const merged = { ...prev, ...updates };
      if (
        merged.type === prev.type &&
        merged.orientation === prev.orientation &&
        merged.query === prev.query
      ) {
        return prev;
      }
      return merged;
    });
  }, []);

  return {
    analyticsRows,
    sortedAnalyticsRows,
    analyticsTotals,
    averageLikeRate,
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
    filters,
    setFilters,
    updateFilters,
  };
}
