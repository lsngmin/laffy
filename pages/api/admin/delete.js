import { assertAdmin } from './_auth';
import { del } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const { url, pathname, slug, type } = req.body || {};
    const target = url || pathname;
    if (!target) return res.status(400).json({ error: 'Missing url or pathname' });
    await del(target, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const revalidateTargets = new Set(['/m', '/x']);
    const normalizedType = typeof type === 'string' ? type.toLowerCase() : '';
    if (slug) {
      if (normalizedType === 'image') {
        revalidateTargets.add(`/x/${slug}`);
      } else {
        revalidateTargets.add(`/m/${slug}`);
      }
    }
    if (typeof res.revalidate === 'function') {
      await Promise.all(
        Array.from(revalidateTargets).map(async (path) => {
          try {
            await res.revalidate(path);
          } catch (error) {
            console.error('Failed to revalidate path', path, error);
          }
        })
      );
    }
    res.status(200).json({ ok: true, revalidated: Array.from(revalidateTargets) });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete content' });
  }
}

export const config = {
  runtime: 'nodejs'
};
