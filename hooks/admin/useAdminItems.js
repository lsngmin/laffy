import { useCallback, useEffect, useRef, useState } from 'react';
import normalizeMeta from '../../lib/admin/normalizeMeta';

const POLL_INTERVAL = 15000;

export default function useAdminItems({ enabled, queryString }) {
  const [items, setItems] = useState([]);
  const refreshRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      return;
    }

    try {
      const res = await fetch(`/api/admin/list${queryString}`);
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      const baseItems = Array.isArray(data.items) ? data.items : [];

      const enriched = await Promise.all(
        baseItems.map(async (item) => {
          try {
            const metaFetchUrl = item.url
              ? `${item.url}${item.url.includes('?') ? '&' : '?'}_=${Date.now()}`
              : item.url;
            const metaRes = await fetch(metaFetchUrl, { cache: 'no-store' });
            if (!metaRes.ok) return { ...item, _error: true };
            const meta = await metaRes.json();
            const normalized = normalizeMeta(meta);
            const fallbackSlug = item.pathname?.replace(/^content\//, '').replace(/\.json$/, '');
            const slug = normalized.slug || fallbackSlug || '';
            const type = normalized.type || 'video';
            const preview = normalized.preview || normalized.thumbnail || normalized.poster || '';
            const routePath = slug
              ? type === 'image'
                ? `/x/${slug}`
                : `/m/${slug}`
              : '';
            const title = normalized.title || slug;
            const summary = normalized.summary || normalized.description || '';
            const description = normalized.description || summary;
            const src = normalized.src || meta?.sourceUrl || '';
            const poster = normalized.poster || '';
            const thumbnail = normalized.thumbnail || poster || '';
            const orientation = normalized.orientation || 'landscape';
            const durationSeconds = Number.isFinite(normalized.durationSeconds)
              ? normalized.durationSeconds
              : 0;
            const timestamps = Array.isArray(normalized.timestamps)
              ? normalized.timestamps
              : [];
            const likes = Number.isFinite(normalized.likes) ? normalized.likes : 0;
            const views = Number.isFinite(normalized.views) ? normalized.views : 0;
            const publishedAt = normalized.publishedAt || '';

            return {
              ...item,
              slug,
              type,
              preview,
              routePath,
              title,
              summary,
              description,
              src,
              poster,
              thumbnail,
              orientation,
              durationSeconds,
              timestamps,
              likes,
              views,
              publishedAt,
              rawMeta: meta,
            };
          } catch (error) {
            const slug = item.pathname?.replace(/^content\//, '').replace(/\.json$/, '');
            console.error('Failed to fetch meta', error);
            return { ...item, slug, _error: true };
          }
        })
      );

      setItems(enriched);
    } catch (error) {
      console.error('Failed to refresh admin items', error);
      setItems([]);
    }
  }, [enabled, queryString]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
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

  return { items, setItems, refresh };
}
