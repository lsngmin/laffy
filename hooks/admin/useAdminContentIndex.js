import { useCallback, useEffect, useMemo, useState } from 'react';

function buildRequestUrl(token) {
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  const query = params.toString();
  return `/api/admin/content/all${query ? `?${query}` : ''}`;
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .filter((item) => item && typeof item.slug === 'string' && item.slug.trim())
    .map((item) => {
      const slug = item.slug.trim();
      const type = typeof item.type === 'string' ? item.type : '';
      const routePath = item.routePath || (type === 'image' ? `/x/${slug}` : `/m/${slug}`);
      return {
        ...item,
        slug,
        type,
        routePath,
        title: item.title || item.display?.socialTitle || item.display?.cardTitle || slug,
        description: item.description || item.summary || '',
        orientation: item.orientation || 'landscape',
        likes: Number.isFinite(Number(item.likes)) ? Number(item.likes) : 0,
        views: Number.isFinite(Number(item.views)) ? Number(item.views) : 0,
      };
    });
}

export default function useAdminContentIndex({ enabled, token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const url = useMemo(() => buildRequestUrl(token), [token]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(url, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || '전체 콘텐츠를 불러오지 못했어요.');
      }
      setItems(normalizeItems(payload.items));
    } catch (err) {
      console.error('[admin] failed to load content index', err);
      setItems([]);
      setError(err?.message || '전체 콘텐츠를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [enabled, url]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setError('');
      setLoading(false);
      return;
    }
    refresh();
  }, [enabled, refresh]);

  const safeSetItems = useCallback((updater) => {
    setItems((prev) => {
      if (typeof updater === 'function') {
        return normalizeItems(updater(prev));
      }
      return normalizeItems(updater);
    });
  }, []);

  return {
    items,
    setItems: safeSetItems,
    loading,
    error,
    refresh,
  };
}
