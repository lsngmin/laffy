import { assertAdmin } from './_auth';
import { generateUploadUrl } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;

  try {
    const { contentType = 'video/mp4' } = req.body || {};

    // Blob SDK v2: generateUploadUrl 사용
    const { url, pathname, id } = await generateUploadUrl({
      contentType,
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN, // 필요하다면 추가
    });

    res.status(200).json({ url, pathname, id });
  } catch (e) {
    res.status(500).json({
      error: 'Failed to generate upload URL',
      detail: String((e && e.message) || e),
    });
  }
}

export const config = {
  runtime: 'nodejs',
};
