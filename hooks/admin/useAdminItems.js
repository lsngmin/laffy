import { useCallback, useEffect, useMemo, useState } from 'react';
import normalizeMeta from '../../lib/admin/normalizeMeta';

export default function useAdminItems(token) {
  const hasToken = Boolean(token);
  const qs = useMemo(() => (hasToken ? `?token=${encodeURIComponent(token)}` : ''), [hasToken, token]);
  const [items, setItems] = useState([]);

  const refresh = useCallback(async () => {
    if (!hasToken) return;
    try {
      const res = await fetch(`/api/admin/list${qs}`);
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      const baseItems = Array.isArray(data.items) ? data.items : [];
      const enriched = await Promise.all(
        baseItems.map(async (it) => {
          try {
            const metaFetchUrl = it.url
              ? `${it.url}${it.url.includes('?') ? '&' : '?'}_=${Date.now()}`
              : it.url;
            const metaRes = await fetch(metaFetchUrl, { cache: 'no-store' });
            if (!metaRes.ok) return { ...it, _error: true };
            const meta = await metaRes.json();
            const normalized = normalizeMeta(meta);
            const fallbackSlug = it.pathname?.replace(/^content\//, '').replace(/\.json$/, '');
            const slug = normalized.slug || fallbackSlug || '';
            const type = normalized.type || 'video';
            const preview = normalized.preview || normalized.thumbnail || normalized.poster || '';
            const routePath = slug
              ? type === 'image'
                ? `/x/${slug}`
                : `/m/${slug}`
              : '';
            const titleValue = normalized.title || slug;
            const summaryValue = normalized.summary || normalized.description || '';
            const descriptionValue = normalized.description || summaryValue;
            const sourceUrl = normalized.src || meta?.sourceUrl || '';
            const poster = normalized.poster || '';
            const thumbnail = normalized.thumbnail || poster || '';
            const orientationValue = normalized.orientation || 'landscape';
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
              ...it,
              slug,
              type,
              preview,
              routePath,
              title: titleValue,
              summary: summaryValue,
              description: descriptionValue,
              src: sourceUrl,
              poster,
              thumbnail,
              orientation: orientationValue,
              durationSeconds,
              timestamps,
              likes,
              views,
              publishedAt,
              rawMeta: meta,
            };
          } catch {
            const slug = it.pathname?.replace(/^content\//, '').replace(/\.json$/, '');
            return { ...it, slug, _error: true };
          }
        })
      );
      setItems(enriched);
    } catch {
      setItems([]);
    }
  }, [hasToken, qs]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hasToken) return undefined;
    const interval = setInterval(() => {
      refresh();
    }, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hasToken, refresh]);

  return { items, setItems, refresh, hasToken, qs };
}
