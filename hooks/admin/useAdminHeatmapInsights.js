import { useCallback, useEffect, useMemo, useState } from 'react';

export default function useAdminHeatmapInsights({ enabled, token, initialSlug = '', limit = 5 } = {}) {
  const [slugFilter, setSlugFilter] = useState(initialSlug);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedToken = typeof token === 'string' ? token.trim() : '';
  const normalizedSlug = typeof slugFilter === 'string' ? slugFilter.trim() : '';

  const canRequest = useMemo(() => enabled && Boolean(normalizedToken), [enabled, normalizedToken]);

  const fetchInsights = useCallback(async () => {
    if (!canRequest) {
      setLoading(false);
      setError(normalizedToken ? '' : '관리 토큰이 필요해요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('token', normalizedToken);
      params.set('limit', String(limit));
      if (normalizedSlug) params.append('slug', normalizedSlug);

      const res = await fetch(`/api/admin/heatmap?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || '히트맵 데이터를 불러오지 못했어요.');
      }
      setInsights(json?.insights || null);
    } catch (err) {
      setError(err?.message || '히트맵 데이터를 불러오지 못했어요.');
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, [canRequest, limit, normalizedSlug, normalizedToken]);

  useEffect(() => {
    if (!canRequest) return;
    fetchInsights();
  }, [canRequest, fetchInsights]);

  return {
    insights,
    loading,
    error,
    slugFilter: normalizedSlug,
    setSlugFilter,
    refresh: fetchInsights,
  };
}
