import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildAnalyticsCsv } from '../../components/admin/analytics/export/AnalyticsCsvExporter';

const DEFAULT_COLUMNS = {
  views: true,
  likes: true,
  likeRate: true,
  route: true,
  edit: true,
};

function normalizeHistory(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      date: typeof entry?.date === 'string' ? entry.date : null,
      views: Number(entry?.views) || 0,
      likes: Math.max(0, Number(entry?.likes) || 0),
    }))
    .filter((entry) => Boolean(entry.date));
}

export default function useAnalyticsMetrics({ items, enabled, startDate, endDate }) {
  const [metricsBySlug, setMetricsBySlug] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const [sortKey, setSortKey] = useState('views');
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [metricsEditor, setMetricsEditor] = useState(null);
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const [filtersState, setFiltersState] = useState(() => normalizeFilters(initialFilters));


  const pendingMetricsRef = useRef(new Set());
  const rangeActive = Boolean(startDate && endDate);

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
    pendingMetricsRef.current = new Set();
    setMetricsBySlug({});
  }, [startDate, endDate]);

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
        const results = await Promise.all(
          fetchTargets.map(async (slug) => {
            const params = new URLSearchParams();
            params.set('slug', slug);
            if (startDate) params.set('start', startDate);
            if (endDate) params.set('end', endDate);
            const res = await fetch(`/api/metrics/get?${params.toString()}`);
            if (!res.ok) {
              throw new Error('metrics_error');
            }
            const data = await res.json();
            const totalViews = Number(data?.views) || 0;
            const totalLikes = Math.max(0, Number(data?.likes) || 0);
            const history = normalizeHistory(data?.history);
            const rawRangeTotals = data?.rangeTotals;
            const rangeTotals =
              rawRangeTotals && typeof rawRangeTotals === 'object'
                ? {
                    views: Number(rawRangeTotals.views) || 0,
                    likes: Math.max(0, Number(rawRangeTotals.likes) || 0),
                  }
                : null;
            const liked = typeof data?.liked === 'boolean' ? data.liked : undefined;
            return {
              slug,
              metrics: {
                views: totalViews,
                likes: totalLikes,
                liked,
                history,
                rangeTotals,
              },
            };
          })
        );

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

  }, [enabled, filteredItems, metricsBySlug, startDate, endDate, items]);

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

  const selectedSlugSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

  const analyticsRows = useMemo(
    () =>
      filteredItems
        .filter((item) => item.slug)
        .map((item) => ({
          ...item,
          metrics: metricsBySlug[item.slug] || null,
          isSelected: selectedSlugSet.has(item.slug),
        })),

    [filteredItems, items, metricsBySlug, selectedSlugSet]
  );

  const hasRangeData = useMemo(() => analyticsRows.some((row) => row.metrics?.rangeTotals), [analyticsRows]);

  const rowsWithDisplayMetrics = useMemo(
    () =>
      analyticsRows.map((row) => {
        const metrics = row.metrics;
        if (!metrics) return { ...row, displayMetrics: null };
        const useRangeTotals = rangeActive && hasRangeData && metrics.rangeTotals;
        const viewsForDisplay = useRangeTotals ? metrics.rangeTotals.views ?? metrics.views : metrics.views;
        const likesForDisplay = useRangeTotals ? metrics.rangeTotals.likes ?? metrics.likes : metrics.likes;
        return {
          ...row,
          displayMetrics: {
            ...metrics,
            views: Number(viewsForDisplay) || 0,
            likes: Math.max(0, Number(likesForDisplay) || 0),
          },
        };
      }),
    [analyticsRows, hasRangeData, rangeActive]
  );

  const sortedAnalyticsRows = useMemo(() => {
    const rows = [...rowsWithDisplayMetrics];
    const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const metricsA = a.displayMetrics || {};
      const metricsB = b.displayMetrics || {};
      const aValue = sortKey === 'likes' ? metricsA.likes ?? 0 : metricsA.views ?? 0;
      const bValue = sortKey === 'likes' ? metricsB.likes ?? 0 : metricsB.views ?? 0;
      return (bValue - aValue) * directionMultiplier;
    });
    return rows;
  }, [rowsWithDisplayMetrics, sortDirection, sortKey]);

  const analyticsTotals = useMemo(
    () =>
      rowsWithDisplayMetrics.reduce(
        (acc, row) => {
          if (!row.displayMetrics) return acc;
          return {
            views: acc.views + (row.displayMetrics.views || 0),
            likes: acc.likes + (row.displayMetrics.likes || 0),
          };
        },
        { views: 0, likes: 0 }
      ),
    [rowsWithDisplayMetrics]
  );

  const averageLikeRate = useMemo(() => {
    const withViews = rowsWithDisplayMetrics.filter((row) => row.displayMetrics && row.displayMetrics.views > 0);
    if (!withViews.length) return 0;
    const totalRate = withViews.reduce((acc, row) => acc + row.displayMetrics.likes / row.displayMetrics.views, 0);
    return totalRate / withViews.length;
  }, [rowsWithDisplayMetrics]);

  const aggregatedRangeTotals = useMemo(() => {
    let hasRangeTotals = false;
    const totals = analyticsRows.reduce(
      (acc, row) => {
        if (!row.metrics?.rangeTotals) return acc;
        hasRangeTotals = true;
        return {
          views: acc.views + (row.metrics.rangeTotals.views || 0),
          likes: acc.likes + (row.metrics.rangeTotals.likes || 0),
        };
      },
      { views: 0, likes: 0 }
    );
    return { totals, hasRangeTotals };
  }, [analyticsRows]);

  const trendHistory = useMemo(() => {
    const buckets = new Map();
    analyticsRows.forEach((row) => {
      const history = row.metrics?.history;
      if (!Array.isArray(history)) return;
      history.forEach((entry) => {
        if (!entry?.date) return;
        const existing = buckets.get(entry.date) || { date: entry.date, views: 0, likes: 0 };
        existing.views += Number(entry.views) || 0;
        existing.likes += Math.max(0, Number(entry.likes) || 0);
        buckets.set(entry.date, existing);
      });
    });
    return Array.from(buckets.values()).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [analyticsRows]);

  const exportRows = useMemo(
    () =>
      sortedAnalyticsRows.map((row) => ({
        ...row,
        metrics: row.displayMetrics || row.metrics || { views: 0, likes: 0 },
      })),
    [sortedAnalyticsRows]
  );

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

  const toggleRowSelection = useCallback((slug) => {
    if (typeof slug !== 'string' || !slug) return;
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return Array.from(next);
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSlugs([]);
  }, []);

  const selectAllRows = useCallback(() => {
    setSelectedSlugs(analyticsRows.map((row) => row.slug));
  }, [analyticsRows]);

  const getBaseMetricValue = useCallback((row, key) => {
    if (!row) return null;
    if (typeof row.metrics?.[key] === 'number') return row.metrics[key];
    if (typeof row[key] === 'number') return row[key];
    return null;
  }, []);

  const openMetricsEditor = useCallback(
    (input) => {
      const candidates = (() => {
        if (Array.isArray(input)) return input;
        if (input && typeof input === 'object') return [input];
        return analyticsRows.filter((row) => selectedSlugSet.has(row.slug));
      })();

      const deduped = [];
      const seen = new Set();
      candidates.forEach((candidate) => {
        if (!candidate?.slug || seen.has(candidate.slug)) return;
        seen.add(candidate.slug);
        deduped.push(candidate);
      });

      if (!deduped.length) return;

      const rows = deduped.map((row) => {
        const metrics = metricsBySlug[row.slug] || row.metrics || null;
        return { ...row, metrics };
      });

      const slugs = rows.map((row) => row.slug);
      const first = rows[0];

      const viewsValues = rows.map((row) => getBaseMetricValue(row, 'views'));
      const likesValues = rows.map((row) => getBaseMetricValue(row, 'likes'));

      const allViewsFilled = viewsValues.every((value) => typeof value === 'number');
      const allLikesFilled = likesValues.every((value) => typeof value === 'number');

      const allViewsEqual =
        rows.length > 1 && allViewsFilled
          ? viewsValues.every((value) => value === viewsValues[0])
          : allViewsFilled;
      const allLikesEqual =
        rows.length > 1 && allLikesFilled
          ? likesValues.every((value) => value === likesValues[0])
          : allLikesFilled;

      const views = allViewsEqual && allViewsFilled ? String(viewsValues[0]) : '';
      const likes = allLikesEqual && allLikesFilled ? String(likesValues[0]) : '';

      const placeholders = {
        views: allViewsEqual && allViewsFilled ? viewsValues[0] : null,
        likes: allLikesEqual && allLikesFilled ? likesValues[0] : null,
      };

      const selectionPreview = rows.slice(0, 5).map((row) => ({
        slug: row.slug,
        title: row.title || row.slug,
      }));

      setMetricsEditor({
        slugs,
        slug: rows.length === 1 ? first.slug : '',
        title: rows.length === 1 ? first.title || first.slug : '선택된 메트릭 일괄 편집',
        subtitle: rows.length === 1 ? `Slug · ${first.slug}` : `${rows.length}개 항목 선택됨`,
        selectionPreview,
        views,
        likes,
        placeholders,
        status: 'idle',
        error: '',
        isBulk: rows.length > 1,
      });
    },
    [analyticsRows, getBaseMetricValue, metricsBySlug, selectedSlugSet]
  );

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

  const updateMetricsForSlug = useCallback((updates) => {
    const list = Array.isArray(updates) ? updates : [updates];
    setMetricsBySlug((prev) => {
      const next = { ...prev };
      const existing = next[slug] || {};

      list.forEach((update) => {
        if (!update || typeof update.slug !== 'string') return;
        const slug = update.slug;
        const views = Number(update.views) || 0;
        const likes = Number(update.likes) || 0;
        next[slug] = { ...existing, views, likes };
      });

      return next;
    });
  }, []);

  const buildCsv = useCallback(() => buildAnalyticsCsv(exportRows), [exportRows]);

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
    rangeTotals: aggregatedRangeTotals.hasRangeTotals ? aggregatedRangeTotals.totals : null,
    hasRangeTotals: aggregatedRangeTotals.hasRangeTotals,
    isRangeActive: rangeActive,
    trendHistory,
    exportRows,
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
    selectedSlugs,
    toggleRowSelection,
    clearSelection,
    selectAllRows,
    buildCsv,
    filters,
    setFilters,
    updateFilters,
  };
}
