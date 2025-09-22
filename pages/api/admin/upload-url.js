import { assertAdmin } from './_auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const { loadBlob } = await import('../../../utils/dynamicBlob');
    const blob = await loadBlob();
    if (!blob.generateUploadURL) {
      return res.status(501).json({ error: 'Blob direct upload not available' });
    }
    const { contentType = 'video/mp4' } = req.body || {};
    const result = await blob.generateUploadURL({
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType,
      // Optional: prefix so we can list later
      // @vercel/blob uses pathname from client; we enforce under uploads/
      // Using prefix isn't supported here, but we can later register metadata.
    });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create upload URL', detail: String(e && e.message || e) });
  }
}
