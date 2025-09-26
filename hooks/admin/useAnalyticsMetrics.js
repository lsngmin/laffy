import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildAnalyticsCsv } from '../../components/admin/analytics/export/AnalyticsCsvExporter';

const DEFAULT_COLUMNS = {
  views: true,
  likes: true,
  likeRate: true,
  route: true,
  edit: true,
};

export default function useAnalyticsMetrics({ items, enabled }) {
  const [metricsBySlug, setMetricsBySlug] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const [sortKey, setSortKey] = useState('views');
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [metricsEditor, setMetricsEditor] = useState(null);
  const [selectedSlugs, setSelectedSlugs] = useState([]);

  const pendingMetricsRef = useRef(new Set());

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

  const selectedSlugSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);

  const analyticsRows = useMemo(
    () =>
      items
        .filter((item) => item.slug)
        .map((item) => ({
          ...item,
          metrics: metricsBySlug[item.slug] || null,
          isSelected: selectedSlugSet.has(item.slug),
        })),
    [items, metricsBySlug, selectedSlugSet]
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
      list.forEach((update) => {
        if (!update || typeof update.slug !== 'string') return;
        const slug = update.slug;
        const views = Number(update.views) || 0;
        const likes = Number(update.likes) || 0;
        next[slug] = { views, likes };
      });
      return next;
    });
  }, []);

  const buildCsv = useCallback(() => buildAnalyticsCsv(sortedAnalyticsRows), [sortedAnalyticsRows]);

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
    selectedSlugs,
    toggleRowSelection,
    clearSelection,
    selectAllRows,
    buildCsv,
  };
}
