import { assertAdmin } from './_auth';
import { put } from '@vercel/blob';
import { buildLatestMeta, normalizeMeta } from '@/utils/metaNormalizer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const {
      slug,
      title,
      description,
      url,
      durationSeconds,
      orientation,
      type: rawType,
      poster: rawPoster,
      thumbnail: rawThumbnail,
      likes,
      views,
      publishedAt,
      metaUrl,
    } = req.body || {};

    const existingMeta = await (async () => {
      if (!metaUrl) return null;
      try {
        const resMeta = await fetch(metaUrl);
        if (!resMeta.ok) return null;
        return await resMeta.json();
      } catch (error) {
        console.error('Failed to fetch existing meta', error);
        return null;
      }
    })();

    const existingNormalized = existingMeta ? normalizeMeta(existingMeta) : null;

    const resolvedSlug = (slug || existingNormalized?.slug || existingMeta?.slug || '').trim();
    if (!resolvedSlug) return res.status(400).json({ error: 'Missing slug' });

    const trimmedTitle = typeof title === 'string' && title.trim().length > 0
      ? title.trim()
      : existingNormalized?.title || existingMeta?.title || '';
    if (!trimmedTitle) return res.status(400).json({ error: 'Missing title' });

    const trimmedDescription = typeof description === 'string'
      ? description
      : typeof existingNormalized?.description === 'string' && existingNormalized.description.length > 0
        ? existingNormalized.description
        : typeof existingMeta?.description === 'string'
          ? existingMeta.description
          : '';

    const trimmedUrl = typeof url === 'string' && url.trim().length > 0 ? url.trim() : '';
    const existingSrc = typeof existingNormalized?.src === 'string' && existingNormalized.src.length > 0
      ? existingNormalized.src
      : typeof existingMeta?.src === 'string'
        ? existingMeta.src
        : '';
    const existingUrlFallback = typeof existingMeta?.url === 'string' ? existingMeta.url : '';
    const resolvedSrc = trimmedUrl || existingSrc || existingUrlFallback;
    if (!resolvedSrc) return res.status(400).json({ error: 'Missing source URL' });

    const baseType = typeof rawType === 'string' && rawType.trim().length > 0
      ? rawType.trim()
      : typeof existingNormalized?.type === 'string' && existingNormalized.type.length > 0
        ? existingNormalized.type
        : typeof existingMeta?.type === 'string'
          ? existingMeta.type
          : '';

    const normalizedType = baseType.toLowerCase() === 'image' ? 'image' : 'video';

    const lowerUrl = resolvedSrc.toLowerCase();
    const imageExtPattern = /(\.jpe?g|\.png|\.webp)$/;
    const hasImageExtension = imageExtPattern.test(lowerUrl);
    const effectiveType = normalizedType === 'image' || hasImageExtension ? 'image' : normalizedType;

    const posterInput = typeof rawPoster === 'string' && rawPoster.trim().length > 0 ? rawPoster.trim() : '';
    const thumbnailInput = typeof rawThumbnail === 'string' && rawThumbnail.trim().length > 0 ? rawThumbnail.trim() : '';
    const posterExisting = typeof existingNormalized?.poster === 'string' && existingNormalized.poster.length > 0
      ? existingNormalized.poster
      : typeof existingMeta?.poster === 'string'
        ? existingMeta.poster
        : '';
    const thumbnailExisting = typeof existingNormalized?.thumbnail === 'string' && existingNormalized.thumbnail.length > 0
      ? existingNormalized.thumbnail
      : typeof existingMeta?.thumbnail === 'string'
        ? existingMeta.thumbnail
        : '';

    const resolvedPoster =
      effectiveType === 'image'
        ? posterInput || resolvedSrc
        : posterInput || posterExisting || thumbnailExisting || '';

    const resolvedThumbnail =
      effectiveType === 'image'
        ? thumbnailInput || resolvedPoster || resolvedSrc
        : thumbnailInput || resolvedPoster || thumbnailExisting || posterExisting || '';

    const resolvedDuration = (() => {
      if (durationSeconds !== undefined && durationSeconds !== null && durationSeconds !== '') {
        if (typeof durationSeconds === 'number') return Math.max(0, Math.round(durationSeconds));
        const parsed = Number(durationSeconds);
        if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
      }
      if (existingNormalized && typeof existingNormalized.durationSeconds === 'number') {
        return Math.max(0, Math.round(existingNormalized.durationSeconds));
      }
      if (existingMeta && Object.prototype.hasOwnProperty.call(existingMeta, 'durationSeconds')) {
        const parsed = Number(existingMeta.durationSeconds);
        if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
      }
      return 0;
    })();

    const likesNumber = Number(likes);
    const viewsNumber = Number(views);
    const resolvedLikes = Number.isFinite(likesNumber)
      ? Math.max(0, Math.round(likesNumber))
      : Number.isFinite(Number(existingNormalized?.likes))
        ? Math.max(0, Math.round(Number(existingNormalized.likes)))
        : Number.isFinite(Number(existingMeta?.likes))
          ? Math.max(0, Math.round(Number(existingMeta.likes)))
          : 0;
    const resolvedViews = Number.isFinite(viewsNumber)
      ? Math.max(0, Math.round(viewsNumber))
      : Number.isFinite(Number(existingNormalized?.views))
        ? Math.max(0, Math.round(Number(existingNormalized.views)))
        : Number.isFinite(Number(existingMeta?.views))
          ? Math.max(0, Math.round(Number(existingMeta.views)))
          : 0;
    const resolvedPublishedAt = typeof publishedAt === 'string' && publishedAt.trim().length > 0
      ? publishedAt
      : typeof existingNormalized?.publishedAt === 'string' && existingNormalized.publishedAt.trim().length > 0
        ? existingNormalized.publishedAt
        : typeof existingMeta?.publishedAt === 'string' && existingMeta.publishedAt.trim().length > 0
          ? existingMeta.publishedAt
          : new Date().toISOString();

    const resolvedOrientation = typeof orientation === 'string' && orientation.trim().length > 0
      ? orientation.trim()
      : typeof existingNormalized?.orientation === 'string' && existingNormalized.orientation.trim().length > 0
        ? existingNormalized.orientation
        : typeof existingMeta?.orientation === 'string' && existingMeta.orientation.trim().length > 0
          ? existingMeta.orientation
          : 'landscape';

    const normalizedForSave = {
      slug: resolvedSlug,
      type: effectiveType,
      src: resolvedSrc,
      poster: resolvedPoster || null,
      thumbnail: resolvedThumbnail || null,
      orientation: resolvedOrientation,
      durationSeconds: resolvedDuration,
      publishedAt: resolvedPublishedAt,
      likes: resolvedLikes,
      views: resolvedViews,
      title: trimmedTitle,
      description: trimmedDescription,
      summary: trimmedDescription,
      source: existingNormalized?.source || existingMeta?.source || 'Blob',
      updatedAt: existingNormalized?.updatedAt || null,
      schemaVersion: existingNormalized?.schemaVersion || null,
    };

    const meta = buildLatestMeta(normalizedForSave, {
      cardTitle: trimmedDescription,
      socialTitle: trimmedTitle,
      summary: trimmedDescription,
      runtimeSec: resolvedDuration,
      publishedAt: resolvedPublishedAt,
      updatedAt: existingNormalized ? new Date().toISOString() : undefined,
      previewUrl: resolvedPoster,
      thumbUrl: resolvedThumbnail,
      sourceOrigin: typeof normalizedForSave.source === 'string' ? normalizedForSave.source : 'Blob',
      likes: resolvedLikes,
      views: resolvedViews,
      type: effectiveType,
      assetUrl: resolvedSrc,
      orientation: resolvedOrientation,
    });
    const folder = effectiveType === 'image' ? 'images' : 'videos';

    let keyFromMetaUrl = null;
    if (metaUrl) {
      try {
        const parsed = new URL(metaUrl);
        const idx = parsed.pathname.indexOf('/content/');
        if (idx !== -1) {
          keyFromMetaUrl = parsed.pathname.slice(idx + 1);
        }
      } catch (error) {
        console.error('Failed to derive key from metaUrl', error);
      }
    }

    const key = keyFromMetaUrl || `content/${folder}/${resolvedSlug}.json`;

    await put(key, JSON.stringify(meta, null, 2), {
      token: process.env.BLOB_READ_WRITE_TOKEN,
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true
    });

    const revalidateTargets = new Set();
    revalidateTargets.add('/m');
    revalidateTargets.add('/x');
    if (effectiveType === 'image') {
      revalidateTargets.add(`/x/${resolvedSlug}`);
    } else {
      revalidateTargets.add(`/m/${resolvedSlug}`);
    }

    if (typeof res.revalidate === 'function') {
      await Promise.all(
        Array.from(revalidateTargets).map(async (path) => {
          try {
            await res.revalidate(path);
          } catch (error) {
            console.error('Failed to revalidate path', path, error);
          }
        })
      );
    }

    res.status(200).json({ ok: true, key, revalidated: Array.from(revalidateTargets) });
  } catch (e) {
    console.error('Failed to register meta', e);
    res.status(500).json({ error: e?.message || 'Failed to register meta' });
  }
}

export const config = {
  runtime: 'nodejs'
};
