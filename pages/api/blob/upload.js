import { handleUpload } from '@vercel/blob/client';
import { assertAdmin } from '../admin/_auth';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.mp4'];
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
const MAX_SIZE_BYTES = 200 * 1024 * 1024;

function parseBody(body) {
  if (!body) return null;
  if (Buffer.isBuffer(body)) {
    return parseBody(body.toString('utf8'));
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (e) {
      return null;
    }
  }
  if (typeof body === 'object') return body;
  return null;
}

function ensureAllowedPath(pathname = '') {
  const lower = pathname.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;

  const body = parseBody(req.body);
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid upload payload' });
  }

  try {
    const result = await handleUpload({
      request: req,
      body,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        if (!ensureAllowedPath(pathname)) {
          throw new Error('Unsupported file extension');
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return res.status(200).json(result);
  } catch (e) {
    const message = e?.message || 'Failed to handle upload';
    const status = message === 'Unsupported file extension' ? 400 : 500;
    return res.status(status).json({ error: message });
  }
}

export const config = {
  runtime: 'nodejs'
};
