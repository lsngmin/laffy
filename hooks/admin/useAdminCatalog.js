import { useCallback, useEffect, useMemo, useState } from 'react';

const PAGE_LIMIT = 60;
const MAX_PAGES = 100;

function buildBaseQuery(raw) {
  if (!raw) return '';
  return String(raw).replace(/^\?/, '');
}

export default function useAdminCatalog({ enabled, queryString }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const baseQuery = useMemo(() => buildBaseQuery(queryString), [queryString]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const aggregated = [];
      const seenKeys = new Set();
      let cursor = null;
      let hasMore = true;
      let iterations = 0;

      while (hasMore && iterations < MAX_PAGES) {
        const prevCursor = cursor;
        const params = new URLSearchParams(baseQuery);
        params.set('limit', String(PAGE_LIMIT));
        if (cursor) {
          params.set('cursor', cursor);
        }

        const response = await fetch(`/api/admin/list?${params.toString()}`);
        if (!response.ok) {
          throw new Error('catalog_fetch_failed');
        }

        const payload = await response.json().catch(() => ({}));
        const pageItems = Array.isArray(payload?.items) ? payload.items : [];
        pageItems.forEach((item) => {
          const key = item?.pathname || item?.slug || item?.url;
          if (!key || seenKeys.has(key)) return;
          seenKeys.add(key);
          aggregated.push(item);
        });

        const nextCursorValue = typeof payload?.nextCursor === 'string' ? payload.nextCursor : null;
        if (payload?.hasMore && nextCursorValue && nextCursorValue !== prevCursor) {
          cursor = nextCursorValue;
          hasMore = true;
        } else {
          cursor = null;
          hasMore = false;
        }
        iterations += 1;

        if (!hasMore) break;
      }

      setItems(aggregated);
    } catch (err) {
      console.error('Failed to load admin catalog', err);
      setError('전체 콘텐츠 목록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [baseQuery, enabled]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setError('');
      return;
    }
    refresh();
  }, [enabled, refresh]);

  return {
    items,
    loading,
    error,
    refresh,
  };
}
