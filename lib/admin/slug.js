import { randomBytes } from 'crypto';
import { list } from '@vercel/blob';

const SLUG_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateRandomSlugInternal(length = 6) {
  try {
    const bytes = randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
    }
    return result;
  } catch (error) {
    console.error('Failed to generate random slug via crypto.randomBytes, fallback to Math.random', error);
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += SLUG_ALPHABET[Math.floor(Math.random() * SLUG_ALPHABET.length)];
    }
    return result;
  }
}

async function hasBlobAtPrefix(prefix, token) {
  try {
    const response = await list({ prefix, token, limit: 1 });
    return Array.isArray(response?.blobs) && response.blobs.length > 0;
  } catch (error) {
    console.error('Failed to verify blob existence', prefix, error);
    return false;
  }
}

export async function isSlugTaken({ folder, slug, includePending = true }) {
  if (!folder || !slug) return false;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  const publishedPrefix = `content/${folder}/${slug}.json`;
  const pendingPrefix = `content/pending/${slug}.json`;
  const [publishedExists, pendingExists] = await Promise.all([
    hasBlobAtPrefix(publishedPrefix, token),
    includePending ? hasBlobAtPrefix(pendingPrefix, token) : Promise.resolve(false),
  ]);
  return publishedExists || pendingExists;
}

export async function generateUniqueSlug(folder, { includePending = true } = {}, attempt = 0) {
  if (attempt >= 20) {
    throw new Error('Unable to allocate unique slug');
  }
  const candidate = generateRandomSlugInternal();
  if (await isSlugTaken({ folder, slug: candidate, includePending })) {
    return generateUniqueSlug(folder, { includePending }, attempt + 1);
  }
  return candidate;
}

export function generateRandomSlug(length = 6) {
  return generateRandomSlugInternal(length);
}
