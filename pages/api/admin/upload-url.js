import { assertAdmin } from './_auth';
import { createUploadURL, generateUploadURL } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const { contentType = 'video/mp4' } = req.body || {};
    const useCreate = typeof createUploadURL === 'function';
    const result = useCreate
      ? await createUploadURL({ access: 'public', contentType, token: process.env.BLOB_READ_WRITE_TOKEN })
      : await generateUploadURL({ access: 'public', contentType, token: process.env.BLOB_READ_WRITE_TOKEN });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create upload URL', detail: String(e && e.message || e) });
  }
}

export const config = {
  runtime: 'nodejs'
};
