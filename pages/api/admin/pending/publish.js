import { assertAdmin } from '../_auth';
import { del, list, put } from '@vercel/blob';
import normalizeMeta from '@/lib/admin/normalizeMeta';
import { generateUniqueSlug, isSlugTaken } from '@/lib/admin/slug';

function parseString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildRevalidateTargets(channel, type, slug) {
  const targets = new Set();
  if (channel === 'l') {
    targets.add('/l');
    if (slug) targets.add(`/l/${slug}`);
  } else if (channel === 'k') {
    targets.add('/k');
    if (slug) targets.add(`/k/${slug}`);
  } else if (channel === 'g') {
    targets.add('/gofile.io/d');
    if (slug) targets.add(`/gofile.io/d/${slug}`);
  } else if (type === 'image') {
    targets.add('/x');
    if (slug) targets.add(`/x/${slug}`);
  } else {
    targets.add('/m');
    if (slug) targets.add(`/m/${slug}`);
  }
  return Array.from(targets);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;

  const slugInput = parseString(req.body?.slug);
  if (!slugInput) {
    return res.status(400).json({ error: 'Missing slug' });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Blob write token unavailable' });
  }

  try {
    const { blobs } = await list({
      prefix: `content/pending/${slugInput}.json`,
      token,
      limit: 1,
    });
    const blob = Array.isArray(blobs) && blobs.length > 0 ? blobs[0] : null;
    if (!blob?.url) {
      return res.status(404).json({ error: 'Pending entry not found' });
    }

    const pendingMetaRes = await fetch(blob.url, { cache: 'no-store' });
    if (!pendingMetaRes.ok) {
      return res.status(500).json({ error: 'Failed to fetch pending meta' });
    }
    const pendingMeta = await pendingMetaRes.json();
    const normalized = normalizeMeta(pendingMeta);

    const folder = normalized.type === 'image' ? 'images' : 'videos';
    let finalSlug = normalized.slug || slugInput;
    const channel = parseString(normalized.channel) || 'x';
    const effectiveChannel = ['x', 'l', 'k', 'g'].includes(channel) ? channel : 'x';
    const nowIso = new Date().toISOString();

    if (await isSlugTaken({ folder, slug: finalSlug, includePending: false })) {
      finalSlug = await generateUniqueSlug(folder, { includePending: false });
    }

    const timestampsBlock =
      pendingMeta && typeof pendingMeta.timestamps === 'object' && !Array.isArray(pendingMeta.timestamps)
        ? { ...pendingMeta.timestamps }
        : {};
    timestampsBlock.publishedAt = nowIso;
    timestampsBlock.updatedAt = nowIso;

    const publishedMeta = {
      ...pendingMeta,
      schemaVersion: '2024-05',
      slug: finalSlug,
      type: normalized.type === 'image' ? 'image' : 'video',
      channel: effectiveChannel,
      timestamps: timestampsBlock,
    };
    if (publishedMeta.status) {
      delete publishedMeta.status;
    }

    const key = `content/${folder}/${finalSlug}.json`;
    await put(key, JSON.stringify(publishedMeta, null, 2), {
      token,
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    await del(blob.url || blob.pathname, { token });

    const revalidateTargets = buildRevalidateTargets(effectiveChannel, publishedMeta.type, finalSlug);
    if (typeof res.revalidate === 'function') {
      await Promise.all(
        revalidateTargets.map(async (path) => {
          try {
            await res.revalidate(path);
          } catch (error) {
            console.error('Failed to revalidate path', path, error);
          }
        })
      );
    }

    res.status(200).json({ ok: true, slug: finalSlug, key, revalidated: revalidateTargets });
  } catch (error) {
    console.error('Failed to publish pending item', error);
    res.status(500).json({ error: 'Failed to publish pending item' });
  }
}

export const config = {
  runtime: 'nodejs',
};
