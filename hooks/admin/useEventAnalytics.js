import { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_LIMIT = 200;

function buildQueryParams({ token, startDate, endDate, eventName, slug }) {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  if (startDate) params.set('start', startDate);
  if (endDate) params.set('end', endDate);
  if (eventName) params.append('event', eventName);
  if (slug) params.set('slug', slug);
  params.set('limit', String(DEFAULT_LIMIT));
  return params;
}

export default function useEventAnalytics({ enabled, token, startDate, endDate }) {
  const [eventNameFilter, setEventNameFilter] = useState('');
  const [slugFilter, setSlugFilter] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totals, setTotals] = useState({ totalEvents: 0, totalUnique: 0 });
  const [availableNames, setAvailableNames] = useState([]);
  const [availableSlugs, setAvailableSlugs] = useState([]);
  const [range, setRange] = useState({ start: '', end: '' });
  const [generatedAt, setGeneratedAt] = useState('');
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => {
    setRefreshIndex((index) => index + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const params = buildQueryParams({
      token,
      startDate,
      endDate,
      eventName: eventNameFilter,
      slug: slugFilter,
    });

    setLoading(true);
    setError('');

    fetch(`/api/admin/events/summary?${params.toString()}`, {
      signal: controller.signal,
      headers: { 'cache-control': 'no-store' },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('이벤트 요약을 불러오지 못했어요.');
        }
        return res.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setEvents(Array.isArray(data?.events) ? data.events : []);
        setTotals({
          totalEvents: Number(data?.totals?.totalEvents) || 0,
          totalUnique: Number(data?.totals?.totalUnique) || 0,
        });
        setAvailableNames(Array.isArray(data?.meta?.eventNames) ? data.meta.eventNames : []);
        setAvailableSlugs(Array.isArray(data?.meta?.slugs) ? data.meta.slugs : []);
        setRange({
          start: typeof data?.range?.start === 'string' ? data.range.start : '',
          end: typeof data?.range?.end === 'string' ? data.range.end : '',
        });
        setGeneratedAt(typeof data?.generatedAt === 'string' ? data.generatedAt : new Date().toISOString());
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setEvents([]);
        setTotals({ totalEvents: 0, totalUnique: 0 });
        setAvailableNames([]);
        setAvailableSlugs([]);
        setRange({ start: '', end: '' });
        setGeneratedAt('');
        setError(err.message || '이벤트 요약을 불러오지 못했어요.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [enabled, token, startDate, endDate, eventNameFilter, slugFilter, refreshIndex]);

  useEffect(() => {
    if (!enabled) {
      setEvents([]);
      setTotals({ totalEvents: 0, totalUnique: 0 });
      setAvailableNames([]);
      setAvailableSlugs([]);
      setRange({ start: '', end: '' });
      setGeneratedAt('');
      setError('');
    }
  }, [enabled]);

  const downloadCsv = useCallback(() => {
    const params = buildQueryParams({
      token,
      startDate,
      endDate,
      eventName: eventNameFilter,
      slug: slugFilter,
    });
    params.set('format', 'csv');
    const url = `/api/admin/events/summary?${params.toString()}`;
    const link = document.createElement('a');
    link.href = url;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    link.download = 'event-summary.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [token, startDate, endDate, eventNameFilter, slugFilter]);

  const derived = useMemo(
    () => ({
      events,
      totals,
      range,
      availableNames,
      availableSlugs,
      generatedAt,
    }),
    [events, totals, range, availableNames, availableSlugs, generatedAt]
  );

  return {
    ...derived,
    loading,
    error,
    eventNameFilter,
    setEventNameFilter,
    slugFilter,
    setSlugFilter,
    refresh,
    downloadCsv,
  };
}
