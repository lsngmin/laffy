const FAVORITE_KEY = 'laffy:favorites@v1';

export const loadFavorites = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load favorites', error);
    return [];
  }
};

export const saveFavorites = (slugs) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAVORITE_KEY, JSON.stringify(slugs));
  } catch (error) {
    console.warn('Failed to save favorites', error);
  }
};

export const toggleFavoriteSlug = (slug) => {
  if (!slug) return [];
  const current = new Set(loadFavorites());
  if (current.has(slug)) {
    current.delete(slug);
  } else {
    current.add(slug);
  }
  const next = Array.from(current);
  saveFavorites(next);
  return next;
};

export const isFavoriteSlug = (slug) => {
  if (!slug) return false;
  return loadFavorites().includes(slug);
};

