import { assertAdmin } from './_auth';
import { list } from '@vercel/blob';
import { getBlobReadToken } from '@/utils/blobTokens';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

function parseLimit(value) {
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(Math.floor(parsed), MAX_LIMIT);
    }
  }
  return DEFAULT_LIMIT;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!assertAdmin(req, res)) return;

  const limit = parseLimit(req.query.limit);
  const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : undefined;

  try {
    const token = getBlobReadToken();
    if (!token) {
      return res.status(503).json({ error: 'Blob access token unavailable' });
    }

    const response = await list({
      prefix: 'content/',
      token,
      limit,
      cursor,
    });

    const items = Array.isArray(response?.blobs)
      ? response.blobs
          .filter((blob) => blob?.pathname?.endsWith('.json'))
          .map((blob) => ({
            pathname: blob.pathname,
            url: blob.url,
            size: blob.size,
            uploadedAt: blob.uploadedAt,
          }))
      : [];

    const nextCursor = response?.cursor || null;
    const hasMore = Boolean(nextCursor);

    res.status(200).json({ items, nextCursor, hasMore });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list content' });
  }
}

export const config = {
  runtime: 'nodejs'
};
