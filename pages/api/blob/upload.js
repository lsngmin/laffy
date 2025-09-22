import { assertAdmin } from '../admin/_auth';
import { createUploadURL } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const { contentType = 'application/octet-stream' } = req.body || {};
    const result = await createUploadURL({
      access: 'public',
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create upload URL', detail: String(e?.message || e) });
  }
}

export const config = {
  runtime: 'nodejs'
};

