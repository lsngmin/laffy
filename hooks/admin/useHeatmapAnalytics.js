import { useCallback, useEffect, useMemo, useState } from 'react';

export default function useHeatmapAnalytics({ enabled, slug, token }) {
  const [state, setState] = useState({
    loading: false,
    error: '',
    data: null,
  });
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => {
    setRefreshIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!slug) {
      setState((prev) => ({ ...prev, loading: false, error: '', data: null }));
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: '' }));

    const params = new URLSearchParams();
    params.set('slug', slug);
    if (token) params.set('token', token);

    fetch(`/api/admin/heatmap?${params.toString()}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || '히트맵 데이터를 불러오지 못했어요.');
        }
        if (cancelled) return;
        setState({
          loading: false,
          error: '',
          data: payload,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message || '히트맵 데이터를 불러오지 못했어요.',
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, slug, token, refreshIndex]);

  const buckets = useMemo(() => {
    if (!state.data || !Array.isArray(state.data.buckets)) return [];
    return state.data.buckets;
  }, [state.data]);

  const availableBuckets = useMemo(() => buckets.map((bucket) => bucket.bucket), [buckets]);

  return {
    loading: state.loading,
    error: state.error,
    data: state.data,
    buckets,
    availableBuckets,
    refresh,
  };
}
