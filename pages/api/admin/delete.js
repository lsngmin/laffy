import { assertAdmin } from './_auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const { url, pathname } = req.body || {};
    const target = url || pathname;
    if (!target) return res.status(400).json({ error: 'Missing url or pathname' });
    const { loadBlob } = await import('../../../utils/dynamicBlob');
    const { del } = await loadBlob();
    await del(target, { token: process.env.BLOB_READ_WRITE_TOKEN });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete content' });
  }
}
