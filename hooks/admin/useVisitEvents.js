import { useCallback, useEffect, useMemo, useState } from 'react';

export default function useVisitEvents({ enabled, slug, token, limit = 50 }) {
  const [state, setState] = useState({ items: [], loading: false, error: '' });
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refresh = useCallback(() => {
    setRefreshIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ items: [], loading: false, error: '' });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: '' }));

    const numericLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.round(Number(limit))) : 50;
    const params = new URLSearchParams();
    params.set('limit', String(numericLimit));
    if (token) params.set('token', token);
    if (slug) params.set('slug', slug);

    fetch(`/api/admin/x-visit?${params.toString()}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = payload?.error || '방문 로그를 불러오지 못했어요.';
          throw new Error(message);
        }
        if (cancelled) return;
        setState({
          items: Array.isArray(payload.items) ? payload.items : [],
          loading: false,
          error: '',
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ items: [], loading: false, error: error?.message || '방문 로그를 불러오지 못했어요.' });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, slug, token, limit, refreshIndex]);

  const items = useMemo(() => state.items, [state.items]);

  return {
    items,
    loading: state.loading,
    error: state.error,
    refresh,
  };
}
