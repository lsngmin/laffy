import { useCallback, useEffect, useMemo, useState } from 'react';

function createDefaultState() {
  return {
    slugs: [],
    totals: { samples: 0, viewers: 0, slugCount: 0, bucketCount: 0 },
    generatedAt: '',
  };
}

export default function useHeatmapInsights({ enabled, queryString }) {
  const [state, setState] = useState(() => createDefaultState());
  const [selectedSlug, setSelectedSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = useCallback(async () => {
    if (!enabled) return;
    const url = queryString ? `/api/admin/heatmap/summary${queryString}` : '/api/admin/heatmap/summary';
    setLoading(true);
    setError('');

    try {
      const res = await fetch(url);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || '히트맵 데이터를 불러오지 못했어요.');
      }

      const slugs = Array.isArray(json?.slugs) ? json.slugs : [];
      const totals =
        typeof json?.totals === 'object' && json.totals !== null ? json.totals : createDefaultState().totals;
      const generatedAt = typeof json?.generatedAt === 'string' ? json.generatedAt : '';

      setState({ slugs, totals, generatedAt });
      setSelectedSlug((prev) => {
        if (prev && slugs.some((entry) => entry?.slug === prev)) {
          return prev;
        }
        return slugs.length ? slugs[0].slug : '';
      });
    } catch (err) {
      setError(err?.message || '히트맵 데이터를 불러오지 못했어요.');
      setState(createDefaultState());
    } finally {
      setLoading(false);
    }
  }, [enabled, queryString]);

  useEffect(() => {
    if (!enabled) return;
    fetchInsights();
  }, [enabled, fetchInsights]);

  useEffect(() => {
    if (!enabled) {
      setState(createDefaultState());
      setSelectedSlug('');
      setError('');
      setLoading(false);
    }
  }, [enabled]);

  const activeSlug = useMemo(() => {
    if (!selectedSlug) return null;
    return state.slugs.find((entry) => entry?.slug === selectedSlug) || null;
  }, [selectedSlug, state.slugs]);

  return {
    loading,
    error,
    totals: state.totals,
    generatedAt: state.generatedAt,
    slugs: state.slugs,
    selectedSlug,
    setSelectedSlug,
    activeSlug,
    refresh: fetchInsights,
  };
}
