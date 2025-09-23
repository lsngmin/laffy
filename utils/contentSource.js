import { list } from '@vercel/blob';
import { getBlobReadToken } from './blobTokens';
import localMemes from './localMemes';

const isProduction = process.env.NODE_ENV === 'production';

export async function listBlobContent() {
  const token = getBlobReadToken();
  if (!token) {
    return isProduction ? { items: [], source: 'blob' } : getLocalFallback();
  }

  try {
    const { blobs } = await list({ prefix: 'content/', token });
    const metas = blobs.filter((b) => b.pathname.endsWith('.json'));
    const items = await Promise.all(
      metas.map(async (b) => {
        try {
          const res = await fetch(b.url);
          if (!res.ok) return null;
          const m = await res.json();
          return normalize(m);
        } catch {
          return null;
        }
      })
    );
    return { items: items.filter(Boolean), source: 'blob' };
  } catch (error) {
    if (!isProduction) {
      console.warn('[contentSource] Failed to load blob content, using local fallback', error);
      return getLocalFallback();
    }
    return { items: [], source: 'blob' };
  }
}

export async function getAllContent() {
  const { items, source } = await listBlobContent();
  return { items: sortByPublishedAt(items), source };
}

export async function getContentBySlug(slug) {
  const { items, source } = await getAllContent();
  const meme = items.find((item) => item.slug === slug) || null;
  return { meme, items, source };
}

function getLocalFallback() {
  return {
    items: localMemes.map((item) => ({ ...item })),
    source: 'local'
  };
}

function normalize(meta) {
  const normalizedPoster = meta.poster || meta.thumbnail || null;
  const normalizedThumbnail = meta.thumbnail || normalizedPoster || '';

  return {
    slug: meta.slug,
    type: meta.type || 'video',
    src: meta.src || meta.url,
    poster: normalizedPoster,
    title: meta.title || '',
    description: meta.description || '',
    thumbnail: normalizedThumbnail,
    orientation: meta.orientation || 'landscape',
    durationSeconds: Number(meta.durationSeconds) || 0,
    source: meta.source || 'Blob',
    publishedAt: meta.publishedAt || new Date().toISOString(),
    likes: Number(meta.likes) || 0,
    views: Number(meta.views) || 0
  };
}

function sortByPublishedAt(items) {
  return items
    .slice()
    .sort((a, b) => (new Date(b.publishedAt).getTime() || 0) - (new Date(a.publishedAt).getTime() || 0));
}
