import { assertAdmin } from './_auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const { slug, title, description, url, durationSeconds = 0, orientation = 'landscape' } = req.body || {};
    if (!slug || !title || !url) return res.status(400).json({ error: 'Missing fields' });
    const { loadBlob } = await import('../../../utils/dynamicBlob');
    const { put } = await loadBlob();
    const meta = {
      slug,
      type: 'video',
      src: url,
      poster: null,
      title,
      description,
      thumbnail: null,
      orientation,
      durationSeconds: Number(durationSeconds) || 0,
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
