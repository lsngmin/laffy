import { assertAdmin } from '../_auth';
import { del, list, put } from '@vercel/blob';
import normalizeMeta from '@/lib/admin/normalizeMeta';
import buildRevalidateTargets from '@/lib/admin/revalidateTargets';

function parseString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function findBlobUrl(pathname, token) {
  if (!pathname) return null;
  try {
    const response = await list({ prefix: pathname, token, limit: 1 });
    const blob = Array.isArray(response?.blobs)
      ? response.blobs.find((entry) => entry?.pathname === pathname)
      : null;
    return blob?.url || null;
  } catch (error) {
    console.error('Failed to find blob by pathname', pathname, error);
    return null;
  }
}

async function hasPendingConflict(slug, token) {
  if (!slug) return false;
  try {
    const response = await list({ prefix: `content/pending/${slug}.json`, token, limit: 1 });
    return Array.isArray(response?.blobs) && response.blobs.length > 0;
  } catch (error) {
    console.error('Failed to check pending conflict', slug, error);
    return false;
  }
}

function normalizeChannel(value) {
  const normalized = parseString(value).toLowerCase();
  return ['x', 'l', 'k', 'g'].includes(normalized) ? normalized : 'x';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;

  const slugInput = parseString(req.body?.slug);
  const pathname = parseString(req.body?.pathname);
  const providedUrl = parseString(req.body?.url);

  if (!slugInput && !pathname && !providedUrl) {
    return res.status(400).json({ error: '게시 대기 전환 대상 정보를 찾을 수 없습니다.' });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(503).json({ error: 'Blob write token unavailable' });
  }

  try {
    const sourceUrl = providedUrl || (await findBlobUrl(pathname, token));
    if (!sourceUrl) {
      return res.status(404).json({ error: '게시된 메타 정보를 찾지 못했습니다.' });
    }

    const metaRes = await fetch(sourceUrl, { cache: 'no-store' });
    if (!metaRes.ok) {
      return res.status(500).json({ error: '게시 메타 데이터를 불러오지 못했습니다.' });
    }
    const meta = await metaRes.json();
    const normalized = normalizeMeta(meta);

    const slugFromMeta = parseString(normalized.slug);
    const slug = slugFromMeta || slugInput || (pathname ? pathname.replace(/^content\/(?:videos|images)\//, '').replace(/\.json$/, '') : '');

    if (!slug) {
      return res.status(400).json({ error: '게시 대기 전환에 사용할 슬러그를 확인할 수 없습니다.' });
    }

    if (await hasPendingConflict(slug, token)) {
      return res.status(409).json({ error: '동일한 슬러그의 게시 대기 항목이 이미 존재합니다.' });
    }

    const channel = normalizeChannel(normalized.channel || meta.channel);
    const type = (normalized.type || meta.type) === 'image' ? 'image' : 'video';
    const nowIso = new Date().toISOString();
    const timestampsBlock =
      meta && typeof meta.timestamps === 'object' && !Array.isArray(meta.timestamps)
        ? { ...meta.timestamps }
        : {};
    timestampsBlock.pendingAt = nowIso;
    timestampsBlock.updatedAt = nowIso;

    const pendingMeta = {
      ...meta,
      schemaVersion: meta.schemaVersion || '2024-05',
      slug,
      status: 'pending',
      channel,
      timestamps: timestampsBlock,
    };

    const pendingKey = `content/pending/${slug}.json`;

    await put(pendingKey, JSON.stringify(pendingMeta, null, 2), {
      token,
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: false,
    });

    const deleteTarget = pathname || sourceUrl;
    await del(deleteTarget, { token });

    const revalidateTargets = buildRevalidateTargets(channel, type, slug);
    if (typeof res.revalidate === 'function') {
      await Promise.all(
        revalidateTargets.map(async (path) => {
          try {
            await res.revalidate(path);
          } catch (error) {
            console.error('Failed to revalidate path after requeue', path, error);
          }
        })
      );
    }

    res.status(200).json({ ok: true, slug, key: pendingKey, revalidated: revalidateTargets });
  } catch (error) {
    console.error('Failed to move published item to pending', error);
    res.status(500).json({ error: '게시 대기 전환에 실패했습니다.' });
  }
}

export const config = {
  runtime: 'nodejs',
};
