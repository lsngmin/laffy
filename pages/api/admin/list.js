import { assertAdmin } from './_auth';
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const { blobs } = await list({ prefix: 'content/' });
    // Return only json meta files
    const items = blobs
      .filter((b) => b.pathname.endsWith('.json'))
      .map((b) => ({ pathname: b.pathname, url: b.url }));
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list content' });
  }
}

export const config = {
  runtime: 'nodejs'
};
