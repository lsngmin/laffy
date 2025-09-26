import { useCallback, useEffect, useMemo, useState } from 'react';

const EMPTY_SUMMARY = Object.freeze({
  items: [],
  totals: { count: 0, uniqueSessions: 0 },
  timeseries: [],
  catalog: { events: [], slugsByEvent: {} },
});

function sanitizeFilters(filters = {}) {
  return {
    eventName: typeof filters.eventName === 'string' ? filters.eventName.trim() : '',
    slug: typeof filters.slug === 'string' ? filters.slug.trim() : '',
    limit: typeof filters.limit === 'number' ? filters.limit : undefined,
  };
}

export default function useEventAnalytics({
  enabled,
  token,
  startDate,
  endDate,
  filters = {},
}) {
  const [data, setData] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  const normalizedFilters = useMemo(() => sanitizeFilters(filters), [filters]);

  const refresh = useCallback(() => {
    setVersion((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        if (token) params.set('token', token);
        if (startDate) params.set('start', startDate);
        if (endDate) params.set('end', endDate);
        if (normalizedFilters.eventName) params.set('event', normalizedFilters.eventName);
        if (normalizedFilters.slug) params.set('slug', normalizedFilters.slug);
        if (normalizedFilters.limit) params.set('limit', String(normalizedFilters.limit));

        const res = await fetch(`/api/admin/events/summary?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.error || '이벤트 데이터를 불러오지 못했어요.');
        }
        setData({
          items: Array.isArray(json.items) ? json.items : [],
          totals: json.totals || { count: 0, uniqueSessions: 0 },
          timeseries: Array.isArray(json.timeseries) ? json.timeseries : [],
          catalog: json.catalog || { events: [], slugsByEvent: {} },
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err?.message || '이벤트 데이터를 불러오지 못했어요.');
        setData(EMPTY_SUMMARY);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    run();
    return () => controller.abort();
  }, [enabled, endDate, normalizedFilters.eventName, normalizedFilters.limit, normalizedFilters.slug, startDate, token, version]);

  return {
    data,
    loading,
    error,
    refresh,
    setError,
  };
}
