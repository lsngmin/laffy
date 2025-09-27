import { list } from '@vercel/blob';
import normalizeMeta from '@/lib/admin/normalizeMeta';
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

function resolveSource(meta) {
  if (!meta) return 'Blob';
  if (typeof meta.source === 'string' && meta.source.trim().length > 0) {
    return meta.source.trim();
  }
  if (meta.source && typeof meta.source === 'object') {
    const origin =
      typeof meta.source.origin === 'string' && meta.source.origin.trim().length > 0
        ? meta.source.origin.trim()
        : '';
    if (origin) return origin;
  }
  return 'Blob';
}

function normalize(meta) {
  const normalized = normalizeMeta(meta);

  const publishedAt = normalized.publishedAt || new Date().toISOString();
  const preview = normalized.preview || normalized.thumbnail || normalized.poster || '';
  const poster = normalized.poster || (preview || null);
  const thumbnail = normalized.thumbnail || preview || '';

  return {
    slug: normalized.slug,
    type: normalized.type || 'video',
    src: normalized.src || '',
    poster,
    title: normalized.title || '',
    description: normalized.description || '',
    thumbnail,
    preview,
    summary: normalized.summary || '',
    orientation: normalized.orientation || 'landscape',
    durationSeconds: Number.isFinite(Number(normalized.durationSeconds))
      ? Number(normalized.durationSeconds)
      : 0,
    source: resolveSource(meta),
    publishedAt,
    updatedAt: normalized.updatedAt || '',
    likes: Number.isFinite(Number(normalized.likes)) ? Number(normalized.likes) : 0,
    views: Number.isFinite(Number(normalized.views)) ? Number(normalized.views) : 0,
    timestamps: Array.isArray(normalized.timestamps) ? normalized.timestamps : [],
    channel: typeof normalized.channel === 'string' && normalized.channel.toLowerCase() === 'l' ? 'l' : 'x',
  };
}

function sortByPublishedAt(items) {
  return items
    .slice()
    .sort((a, b) => (new Date(b.publishedAt).getTime() || 0) - (new Date(a.publishedAt).getTime() || 0));
}
