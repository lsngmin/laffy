import { useCallback, useEffect, useMemo, useState } from 'react';

export default function usePendingUploads({ enabled, queryString }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const qs = useMemo(() => {
    if (!queryString) return '';
    return queryString.startsWith('?') || queryString.startsWith('&')
      ? queryString
      : `?${queryString}`;
  }, [queryString]);

  const fetchItems = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/pending/list${qs}`);
      if (!res.ok) {
        throw new Error(`request_failed_${res.status}`);
      }
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setError(null);
    } catch (err) {
      console.error('Failed to load pending uploads', err);
      setItems([]);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, qs]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setError(null);
      return;
    }
    fetchItems();
  }, [enabled, fetchItems]);

  return {
    items,
    setItems,
    refresh: fetchItems,
    isLoading,
    error,
  };
}
