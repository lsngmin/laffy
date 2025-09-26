import { useEffect, useMemo, useRef, useState } from 'react';

export default function useAnalyticsMetrics({ items, view, hasToken }) {
  const [metricsBySlug, setMetricsBySlug] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const pendingMetricsRef = useRef(new Set());

  useEffect(() => {
    setMetricsBySlug((prev) => {
      if (!prev || typeof prev !== 'object') return {};
      const next = {};
      items.forEach((item) => {
        if (item.slug && prev[item.slug]) next[item.slug] = prev[item.slug];
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === next[key])
      ) {
        return prev;
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (!hasToken || view !== 'analytics') return undefined;
    const slugs = items.map((it) => it.slug).filter(Boolean);
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
          results.forEach(({ slug: targetSlug, metrics }) => {
            next[targetSlug] = metrics;
          });
          return next;
        });
      } catch (err) {
        if (!cancelled) setMetricsError('메트릭을 불러오지 못했어요.');
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
  }, [hasToken, view, items, metricsBySlug]);

  const analyticsRows = useMemo(
    () =>
      items
        .filter((it) => it.slug)
        .map((it) => ({
          ...it,
          metrics: metricsBySlug[it.slug] || null,
        })),
    [items, metricsBySlug]
  );

  const sortedAnalyticsRows = useMemo(
    () =>
      [...analyticsRows].sort((a, b) => {
        const aViews = a.metrics?.views ?? 0;
        const bViews = b.metrics?.views ?? 0;
        return bViews - aViews;
      }),
    [analyticsRows]
  );

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
    const totalRate = withViews.reduce((acc, row) => acc + row.metrics.likes / row.metrics.views, 0);
    return totalRate / withViews.length;
  }, [analyticsRows]);

  return {
    metricsBySlug,
    setMetricsBySlug,
    metricsLoading,
    metricsError,
    analyticsRows,
    sortedAnalyticsRows,
    analyticsTotals,
    averageLikeRate,
  };
}
