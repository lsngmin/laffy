import { assertAdmin } from './_auth';
import { list } from '@vercel/blob';
import { getBlobReadToken } from '@/utils/blobTokens';
import normalizeMeta from '@/lib/admin/normalizeMeta';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 60;
const MAX_ITERATIONS = 40;

const VALID_SORTS = new Set(['recent', 'title', 'duration']);

function parseLimit(value) {
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(Math.floor(parsed), MAX_LIMIT);
    }
  }
  return DEFAULT_LIMIT;
}

function parseSearch(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : '';
}

function parseType(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return ['video', 'image'].includes(normalized) ? normalized : '';
}

function parseOrientation(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return ['landscape', 'portrait', 'square'].includes(normalized) ? normalized : '';
}

function parseSort(value) {
  if (typeof value !== 'string') return 'recent';
  const normalized = value.trim().toLowerCase();
  return VALID_SORTS.has(normalized) ? normalized : 'recent';
}

function parseChannel(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return ['x', 'l', 'k', 'g'].includes(normalized) ? normalized : '';
}

function matchesFilters(item, filters) {
  if (!item) return false;
  const { search, type, orientation, channel } = filters;

  if (type && (item.type || '').toLowerCase() !== type) return false;
  if (orientation && (item.orientation || '').toLowerCase() !== orientation) return false;
  if (channel && (item.channel || '').toLowerCase() !== channel) return false;

  if (search) {
    const haystacks = [item.slug, item.title, item.description]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const matched = haystacks.some((value) => value.includes(search));
    if (!matched) return false;
  }

  return true;
}

function sortItems(items, sort) {
  if (!Array.isArray(items) || !items.length) return [];
  if (sort === 'title') {
    return [...items].sort((a, b) => {
      const aTitle = (a.title || a.slug || '').toLowerCase();
      const bTitle = (b.title || b.slug || '').toLowerCase();
      return aTitle.localeCompare(bTitle);
    });
  }
  if (sort === 'duration') {
    return [...items].sort((a, b) => (Number(b.durationSeconds) || 0) - (Number(a.durationSeconds) || 0));
  }
  return items;
}

async function fetchMetaForBlob(blob) {
  if (!blob?.url) {
    return { meta: null, normalized: null, error: true };
  }

  try {
    const metaRes = await fetch(blob.url, { cache: 'no-store' });
    if (!metaRes.ok) {
      return { meta: null, normalized: null, error: true };
    }
    const meta = await metaRes.json();
    const normalized = normalizeMeta(meta);
    return { meta, normalized, error: false };
  } catch (error) {
    console.error('Failed to fetch blob meta', error);
    return { meta: null, normalized: null, error: true };
  }
}

function buildItem(blob, metaInfo) {
  const fallbackSlug = blob.pathname?.replace(/^content\//, '').replace(/\.json$/, '') || '';
  const normalized = metaInfo.normalized || {};
  const slug = normalized.slug || fallbackSlug;
  const type = normalized.type || 'video';
  const channelValue = typeof normalized.channel === 'string' ? normalized.channel.toLowerCase() : '';
  const channel = ['x', 'l', 'k', 'g'].includes(channelValue) ? channelValue : 'x';
  let routePath = '';
  if (slug) {
    if (channel === 'l') {
      routePath = `/l/${slug}`;
    } else if (channel === 'k') {
      routePath = `/k/${slug}`;
    } else if (channel === 'g') {
      routePath = `/gofile.io/${slug}`;
    } else if ((type || '').toLowerCase() === 'image') {
      routePath = `/x/${slug}`;
    } else {
      routePath = `/m/${slug}`;
    }
  }

  return {
    pathname: blob.pathname,
    url: blob.url,
    size: blob.size,
    uploadedAt: blob.uploadedAt,
    slug,
    type,
    channel,
    routePath,
    title: normalized.title || slug,
    summary: normalized.summary || '',
    description: normalized.description || '',
    src: normalized.src || '',
    poster: normalized.poster || '',
    thumbnail: normalized.thumbnail || '',
    preview: normalized.preview || normalized.thumbnail || normalized.poster || '',
    orientation: normalized.orientation || 'landscape',
    durationSeconds: Number.isFinite(normalized.durationSeconds) ? normalized.durationSeconds : 0,
    timestamps: Array.isArray(normalized.timestamps) ? normalized.timestamps : [],
    likes: Number.isFinite(normalized.likes) ? normalized.likes : 0,
    views: Number.isFinite(normalized.views) ? normalized.views : 0,
    publishedAt: normalized.publishedAt || '',
    updatedAt: normalized.updatedAt || '',
    _error: Boolean(metaInfo.error),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!assertAdmin(req, res)) return;

  const limit = parseLimit(req.query.limit);
  const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : undefined;
  const search = parseSearch(req.query.search);
  const type = parseType(req.query.type);
  const orientation = parseOrientation(req.query.orientation);
  const sort = parseSort(req.query.sort);
  const channel = parseChannel(req.query.channel);

  const filters = { search, type, orientation, channel };

  try {
    const token = getBlobReadToken();
    if (!token) {
      return res.status(503).json({ error: 'Blob access token unavailable' });
    }

    let currentCursor = cursor;
    let iterations = 0;
    let nextCursor = null;
    let hasMore = false;
    const targetCount = sort === 'recent' ? limit : MAX_LIMIT;
    const collected = [];

    while (collected.length < targetCount && iterations < MAX_ITERATIONS) {
      const response = await list({
        prefix: 'content/',
        token,
        limit,
        cursor: currentCursor,
      });

      const blobs = Array.isArray(response?.blobs)
        ? response.blobs.filter((blob) => blob?.pathname?.endsWith('.json'))
        : [];

      if (!blobs.length) {
        nextCursor = null;
        hasMore = false;
        break;
      }

      const metaInfos = await Promise.all(blobs.map((blob) => fetchMetaForBlob(blob)));

      const pageItems = blobs.map((blob, index) => buildItem(blob, metaInfos[index]));
      const filteredItems = pageItems.filter((item) => matchesFilters(item, filters));

      for (const item of filteredItems) {
        if (collected.length < limit) {
          collected.push(item);
        } else if (sort !== 'recent' && collected.length < targetCount) {
          collected.push(item);
        }
      }

      nextCursor = response?.cursor || null;
      hasMore = Boolean(nextCursor);

      if (!hasMore || collected.length >= targetCount) {
        break;
      }

      currentCursor = nextCursor;
      iterations += 1;
    }

    const finalItems = sortItems(collected, sort).slice(0, limit);
    const finalHasMore = sort === 'recent' ? hasMore : hasMore || collected.length > limit;

    res.status(200).json({ items: finalItems, nextCursor, hasMore: finalHasMore });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list content' });
  }
}

export const config = {
  runtime: 'nodejs'
};
