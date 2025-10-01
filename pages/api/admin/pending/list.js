import { assertAdmin } from '../_auth';
import { list } from '@vercel/blob';
import { getBlobReadToken } from '@/utils/blobTokens';
import normalizeMeta from '@/lib/admin/normalizeMeta';

const MAX_PENDING_RESULTS = 120;
const PAGE_LIMIT = 60;
const MAX_ITERATIONS = 20;

function parseISOString(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : '';
}

function parseTimestamp(value) {
  if (!value) return 0;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function buildPendingItem(blob, meta) {
  const normalized = normalizeMeta(meta);
  const pendingBlock =
    meta && typeof meta.timestamps === 'object' && !Array.isArray(meta.timestamps)
      ? meta.timestamps
      : {};
  const pendingAt = parseISOString(pendingBlock.pendingAt || pendingBlock.createdAt || '');

  return {
    pathname: blob.pathname,
    url: blob.url,
    size: blob.size,
    uploadedAt: blob.uploadedAt,
    slug: normalized.slug || blob.pathname?.replace(/^content\/pending\//, '').replace(/\.json$/, '') || '',
    type: normalized.type || 'video',
    channel: normalized.channel || 'x',
    title: normalized.title || normalized.slug || '',
    summary: normalized.summary || '',
    description: normalized.description || '',
    preview: normalized.preview || normalized.thumbnail || normalized.poster || '',
    poster: normalized.poster || '',
    thumbnail: normalized.thumbnail || '',
    src: normalized.src || '',
    orientation: normalized.orientation || 'landscape',
    durationSeconds: Number.isFinite(normalized.durationSeconds) ? normalized.durationSeconds : 0,
    likes: Number.isFinite(normalized.likes) ? normalized.likes : 0,
    views: Number.isFinite(normalized.views) ? normalized.views : 0,
    timestamps: Array.isArray(normalized.timestamps) ? normalized.timestamps : [],
    status: typeof meta?.status === 'string' ? meta.status : 'pending',
    pendingAt,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!assertAdmin(req, res)) return;

  try {
    const token = getBlobReadToken();
    if (!token) {
      return res.status(503).json({ error: 'Blob access token unavailable' });
    }

    let cursor;
    let iterations = 0;
    const collected = [];

    while (collected.length < MAX_PENDING_RESULTS && iterations < MAX_ITERATIONS) {
      const response = await list({
        prefix: 'content/pending/',
        token,
        limit: PAGE_LIMIT,
        cursor,
      });

      const blobs = Array.isArray(response?.blobs)
        ? response.blobs.filter((blob) => blob?.pathname?.endsWith('.json'))
        : [];

      if (!blobs.length) {
        break;
      }

      const metas = await Promise.all(
        blobs.map(async (blob) => {
          if (!blob?.url) return null;
          try {
            const resp = await fetch(blob.url, { cache: 'no-store' });
            if (!resp.ok) return null;
            return await resp.json();
          } catch (error) {
            console.error('Failed to fetch pending meta', blob.pathname, error);
            return null;
          }
        })
      );

      blobs.forEach((blob, index) => {
        const meta = metas[index];
        if (!meta) return;
        collected.push(buildPendingItem(blob, meta));
      });

      cursor = response?.cursor;
      if (!cursor) {
        break;
      }

      iterations += 1;
    }

    const sorted = collected.sort((a, b) => {
      const aTime = parseTimestamp(a.pendingAt) || parseTimestamp(a.uploadedAt);
      const bTime = parseTimestamp(b.pendingAt) || parseTimestamp(b.uploadedAt);
      return bTime - aTime;
    });

    res.status(200).json({ items: sorted });
  } catch (error) {
    console.error('Failed to list pending uploads', error);
    res.status(500).json({ error: 'Failed to list pending uploads' });
  }
}

export const config = {
  runtime: 'nodejs',
};
