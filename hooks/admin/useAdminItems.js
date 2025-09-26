import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const POLL_INTERVAL = 15000;
const DEFAULT_PAGE_SIZE = 6;

const buildMetaKey = (item) => item?.pathname || item?.slug || item?.url || '';

export default function useAdminItems({ enabled, queryString, pageSize = DEFAULT_PAGE_SIZE }) {
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const refreshRef = useRef(null);
  const baseQuery = useMemo(() => (queryString || '').replace(/^\?/, ''), [queryString]);

  const fetchPage = useCallback(
    async ({ mode, cursor } = {}) => {
      if (!enabled) {
        setItems([]);
        setNextCursor(null);
        setHasMore(false);
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
        setError(null);
        return;
      }

      const params = new URLSearchParams(baseQuery);
      params.set('limit', String(pageSize));
      if (cursor) {
        params.set('cursor', cursor);
      } else {
        params.delete('cursor');
      }

      const url = `/api/admin/list?${params.toString()}`;

      if (mode === 'append') {
        setIsLoadingMore(true);
      } else if (mode === 'refresh-first') {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`request_failed_${res.status}`);
        }

        const data = await res.json();
        const enriched = Array.isArray(data.items) ? data.items : [];

        setNextCursor(data?.nextCursor || null);
        setHasMore(Boolean(data?.hasMore));
        setError(null);

        setItems((prev) => {
          if (mode === 'append') {
            const existingKeys = new Set(prev.map((item) => buildMetaKey(item)));
            const deduped = enriched.filter((item) => !existingKeys.has(buildMetaKey(item)));
            return [...prev, ...deduped];
          }

          if (mode === 'refresh-first') {
            const firstKeys = new Set(enriched.map((item) => buildMetaKey(item)));
            const remaining = prev.filter((item) => !firstKeys.has(buildMetaKey(item)));
            return [...enriched, ...remaining];
          }

          return enriched;
        });
      } catch (err) {
        console.error('Failed to load admin items', err);
        setError(err);
        if (mode !== 'append') {
          setItems([]);
          setNextCursor(null);
          setHasMore(false);
        }
      } finally {
        if (mode === 'append') {
          setIsLoadingMore(false);
        } else if (mode === 'refresh-first') {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [baseQuery, enabled, pageSize]
  );

  const refresh = useCallback(() => fetchPage({ mode: 'replace' }), [fetchPage]);
  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor || isLoadingMore) return;
    fetchPage({ mode: 'append', cursor: nextCursor });
  }, [fetchPage, hasMore, isLoadingMore, nextCursor]);
  const refreshFirstPage = useCallback(() => fetchPage({ mode: 'refresh-first' }), [fetchPage]);

  useEffect(() => {
    refreshRef.current = refreshFirstPage;
  }, [refreshFirstPage]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setNextCursor(null);
      setHasMore(false);
      return undefined;
    }

    refresh();

    const interval = setInterval(() => {
      refreshRef.current?.();
    }, POLL_INTERVAL);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, refresh]);

  return {
    items,
    setItems,
    refresh,
    loadMore,
    hasMore,
    nextCursor,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
  };
}
