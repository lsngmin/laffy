import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'laffy:user-liked-slugs@v1';

export function useLikes() {
  const [likedSlugs, setLikedSlugs] = useState(() => new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLikedSlugs(new Set(parsed));
        }
      }
    } catch (error) {
      console.warn('Failed to load liked memes from storage', error);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;
    try {
      const serialised = JSON.stringify(Array.from(likedSlugs));
      window.localStorage.setItem(STORAGE_KEY, serialised);
    } catch (error) {
      console.warn('Failed to persist liked memes', error);
    }
  }, [likedSlugs, ready]);

  const isLiked = useCallback((slug) => likedSlugs.has(slug), [likedSlugs]);

  const toggleLike = useCallback((slug) => {
    setLikedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  return { isLiked, toggleLike, ready };
}
