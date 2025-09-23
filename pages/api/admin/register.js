import { assertAdmin } from './_auth';
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const {
      slug,
      title,
      description,
      url,
      durationSeconds = 0,
      orientation = 'landscape',
      type: rawType,
      poster: rawPoster,
      thumbnail: rawThumbnail
    } = req.body || {};
    if (!slug || !title || !url) return res.status(400).json({ error: 'Missing fields' });

    const lowerUrl = typeof url === 'string' ? url.toLowerCase() : '';
    const imageExtPattern = /(\.jpe?g|\.png|\.webp)$/;
    const hasImageExtension = imageExtPattern.test(lowerUrl);
    const normalizedType = rawType === 'image' || hasImageExtension ? 'image' : 'video';
    const poster = typeof rawPoster === 'string' && rawPoster.trim().length > 0 ? rawPoster : null;
    const thumbnail = typeof rawThumbnail === 'string' && rawThumbnail.trim().length > 0 ? rawThumbnail : null;

    const resolvedPoster =
      normalizedType === 'image'
        ? poster || url
        : poster;

    const resolvedThumbnail =
      normalizedType === 'image'
        ? thumbnail || resolvedPoster || url
        : thumbnail || resolvedPoster || null;

    const resolvedDuration =
      normalizedType === 'image' ? 0 : Number(durationSeconds) || 0;

    const meta = {
      slug,
      type: normalizedType,
      src: url,
      poster: resolvedPoster,
      title,
      description,
      thumbnail: resolvedThumbnail,
      orientation,
      durationSeconds: resolvedDuration,
      source: 'Blob',
      publishedAt: new Date().toISOString(),
      likes: 0,
      views: 0
    };
    const key = `content/${slug}.json`;
    await put(key, JSON.stringify(meta), {
      token: process.env.BLOB_READ_WRITE_TOKEN,
      access: 'public',
      contentType: 'application/json'
    });
    res.status(200).json({ ok: true, key });
  } catch (e) {
    res.status(500).json({ error: 'Failed to register meta' });
  }
}

export const config = {
  runtime: 'nodejs'
};
