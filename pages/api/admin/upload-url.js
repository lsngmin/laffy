import { assertAdmin } from './_auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const { loadBlob } = await import('../../../utils/dynamicBlob');
    const blob = await loadBlob();
    const { contentType = 'video/mp4' } = req.body || {};
    let result;
    if (typeof blob.createUploadURL === 'function') {
      // @vercel/blob v2+
      result = await blob.createUploadURL({
        access: 'public',
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
    } else if (typeof blob.generateUploadURL === 'function') {
      // back-compat
      result = await blob.generateUploadURL({
        access: 'public',
        contentType,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
    } else {
      return res.status(501).json({ error: 'Blob direct upload not available' });
    }
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create upload URL', detail: String(e && e.message || e) });
  }
}

export const config = {
  runtime: 'nodejs'
};
