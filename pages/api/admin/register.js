import { assertAdmin } from './_auth';
import { put } from '@vercel/blob';
import normalizeMeta, { normalizeTimestamp } from '../../../lib/admin/normalizeMeta';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;
  try {
    const {
      slug,
      title,
      socialTitle,
      cardTitle,
      description,
      summary,
      url,
      durationSeconds,
      runtimeSec,
      orientation,
      type: rawType,
      poster: rawPoster,
      previewUrl,
      thumbnail: rawThumbnail,
      thumbUrl,
      likes,
      views,
      metrics,
      publishedAt,
      updatedAt,
      metaUrl,
      timestamps: rawTimestamps,
      timeline: rawTimeline,
      chapters: rawChapters,
      source: rawSource,
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

    const normalizedExisting = existingMeta ? normalizeMeta(existingMeta) : null;

    const resolvedSlug = (slug || normalizedExisting?.slug || existingMeta?.slug || '').trim();
    if (!resolvedSlug) return res.status(400).json({ error: 'Missing slug' });

    const inputSocialTitle =
      typeof socialTitle === 'string' && socialTitle.trim().length > 0
        ? socialTitle.trim()
        : typeof title === 'string' && title.trim().length > 0
          ? title.trim()
          : '';

    const trimmedTitle = inputSocialTitle || normalizedExisting?.title || '';
    if (!trimmedTitle) return res.status(400).json({ error: 'Missing title' });

    const inputCardTitle =
      typeof cardTitle === 'string' && cardTitle.trim().length > 0
        ? cardTitle.trim()
        : typeof description === 'string'
          ? description.trim()
          : '';

    const trimmedDescription =
      inputCardTitle || normalizedExisting?.description || normalizedExisting?.summary || '';

    const trimmedUrl = typeof url === 'string' && url.trim().length > 0 ? url.trim() : '';
    const existingSrc = (() => {
      if (typeof existingMeta?.src === 'string') return existingMeta.src;
      if (existingMeta?.media && typeof existingMeta.media === 'object') {
        const mediaSrc = existingMeta.media.assetUrl || existingMeta.media.src;
        if (typeof mediaSrc === 'string') return mediaSrc;
      }
      return normalizedExisting?.src || '';
    })();
    const existingUrlFallback = typeof existingMeta?.url === 'string' ? existingMeta.url : '';
    const resolvedSrc = trimmedUrl || existingSrc || existingUrlFallback;
    if (!resolvedSrc) return res.status(400).json({ error: 'Missing source URL' });

    const baseType = typeof rawType === 'string' && rawType.trim().length > 0
      ? rawType.trim()
      : typeof normalizedExisting?.type === 'string' && normalizedExisting.type.trim().length > 0
        ? normalizedExisting.type
        : typeof existingMeta?.type === 'string'
          ? existingMeta.type
          : '';

    const normalizedType = baseType.toLowerCase() === 'image' ? 'image' : 'video';

    const lowerUrl = resolvedSrc.toLowerCase();
    const imageExtPattern = /(\.jpe?g|\.png|\.webp)$/;
    const hasImageExtension = imageExtPattern.test(lowerUrl);
    const effectiveType = normalizedType === 'image' || hasImageExtension ? 'image' : normalizedType;

    const posterInput = (() => {
      if (typeof previewUrl === 'string' && previewUrl.trim().length > 0) {
        return previewUrl.trim();
      }
      if (typeof rawPoster === 'string' && rawPoster.trim().length > 0) {
        return rawPoster.trim();
      }
      return '';
    })();
    const thumbnailInput = (() => {
      if (typeof thumbUrl === 'string' && thumbUrl.trim().length > 0) {
        return thumbUrl.trim();
      }
      if (typeof rawThumbnail === 'string' && rawThumbnail.trim().length > 0) {
        return rawThumbnail.trim();
      }
      return '';
    })();

    const existingPreview = (() => {
      if (existingMeta?.media && typeof existingMeta.media === 'object') {
        const value = existingMeta.media.previewUrl || existingMeta.media.poster;
        if (typeof value === 'string' && value.trim().length > 0) return value;
      }
      if (typeof existingMeta?.poster === 'string') return existingMeta.poster;
      return normalizedExisting?.poster || normalizedExisting?.preview || '';
    })();

    const existingThumb = (() => {
      if (existingMeta?.media && typeof existingMeta.media === 'object') {
        const value = existingMeta.media.thumbUrl || existingMeta.media.thumbnail;
        if (typeof value === 'string' && value.trim().length > 0) return value;
      }
      if (typeof existingMeta?.thumbnail === 'string') return existingMeta.thumbnail;
      return normalizedExisting?.thumbnail || '';
    })();

    const resolvedPoster = (() => {
      if (posterInput) return posterInput;
      if (effectiveType === 'image') return resolvedSrc;
      return existingPreview || existingThumb || '';
    })();

    const resolvedThumbnail = (() => {
      if (thumbnailInput) return thumbnailInput;
      if (effectiveType === 'image') return resolvedPoster || resolvedSrc;
      return existingThumb || existingPreview || resolvedPoster || '';
    })();

    const resolvedDuration = (() => {
      const explicit = runtimeSec ?? durationSeconds;
      if (explicit !== undefined && explicit !== null && explicit !== '') {
        if (typeof explicit === 'number') return explicit;
        const parsed = Number(explicit);
        if (Number.isFinite(parsed)) return parsed;
        return explicit;
      }
      if (normalizedExisting && Number.isFinite(Number(normalizedExisting.durationSeconds))) {
        return normalizedExisting.durationSeconds;
      }
      if (existingMeta && Object.prototype.hasOwnProperty.call(existingMeta, 'durationSeconds')) {
        return existingMeta.durationSeconds;
      }
      return 0;
    })();

    const likesNumber = Number(likes);
    const viewsNumber = Number(views);
    const resolvedLikes = (() => {
      if (Number.isFinite(likesNumber)) {
        return Math.max(0, Math.round(likesNumber));
      }
      const metricLikes = metrics && Number.isFinite(Number(metrics.likes)) ? Number(metrics.likes) : null;
      if (metricLikes !== null) return Math.max(0, Math.round(metricLikes));
      if (normalizedExisting && Number.isFinite(Number(normalizedExisting.likes))) {
        return Math.max(0, Math.round(Number(normalizedExisting.likes)));
      }
      if (Number.isFinite(Number(existingMeta?.likes))) {
        return Math.max(0, Math.round(Number(existingMeta.likes)));
      }
      return 0;
    })();

    const resolvedViews = (() => {
      if (Number.isFinite(viewsNumber)) {
        return Math.max(0, Math.round(viewsNumber));
      }
      const metricViews = metrics && Number.isFinite(Number(metrics.views)) ? Number(metrics.views) : null;
      if (metricViews !== null) return Math.max(0, Math.round(metricViews));
      if (normalizedExisting && Number.isFinite(Number(normalizedExisting.views))) {
        return Math.max(0, Math.round(Number(normalizedExisting.views)));
      }
      if (Number.isFinite(Number(existingMeta?.views))) {
        return Math.max(0, Math.round(Number(existingMeta.views)));
      }
      return 0;
    })();

    const resolvedPublishedAt = (() => {
      if (typeof publishedAt === 'string' && publishedAt.trim().length > 0) {
        return publishedAt;
      }
      if (normalizedExisting?.publishedAt) return normalizedExisting.publishedAt;
      if (typeof existingMeta?.publishedAt === 'string' && existingMeta.publishedAt.trim().length > 0) {
        return existingMeta.publishedAt;
      }
      return new Date().toISOString();
    })();

    const resolvedUpdatedAt = (() => {
      if (typeof updatedAt === 'string' && updatedAt.trim().length > 0) {
        return updatedAt.trim();
      }
      if (metaUrl) {
        return new Date().toISOString();
      }
      if (normalizedExisting?.updatedAt) return normalizedExisting.updatedAt;
      if (typeof existingMeta?.updatedAt === 'string') return existingMeta.updatedAt;
      return '';
    })();

    const resolvedOrientation = (() => {
      if (typeof orientation === 'string' && orientation.trim().length > 0) {
        return orientation.trim();
      }
      if (normalizedExisting?.orientation) return normalizedExisting.orientation;
      if (typeof existingMeta?.orientation === 'string' && existingMeta.orientation.trim().length > 0) {
        return existingMeta.orientation;
      }
      return 'landscape';
    })();

    const resolvedSummary =
      typeof summary === 'string' && summary.trim().length > 0
        ? summary.trim()
        : normalizedExisting?.summary || trimmedDescription || trimmedTitle;

    const deriveSource = () => {
      if (rawSource && typeof rawSource === 'object' && !Array.isArray(rawSource)) {
        return { ...rawSource };
      }
      if (typeof rawSource === 'string' && rawSource.trim().length > 0) {
        return { origin: rawSource.trim() };
      }
      if (existingMeta?.source && typeof existingMeta.source === 'object' && !Array.isArray(existingMeta.source)) {
        return { ...existingMeta.source };
      }
      if (typeof existingMeta?.source === 'string' && existingMeta.source.trim().length > 0) {
        return { origin: existingMeta.source.trim() };
      }
      return { origin: 'Blob' };
    };

    const meta = {
      schemaVersion: '2024-05',
      slug: resolvedSlug,
      type: effectiveType,
      display: {
        cardTitle: trimmedDescription || trimmedTitle,
        socialTitle: trimmedTitle,
        summary: resolvedSummary,
        runtimeSec: Number.isFinite(Number(resolvedDuration))
          ? Math.max(0, Math.round(Number(resolvedDuration)))
          : 0,
      },
      media: {
        assetUrl: resolvedSrc,
        orientation: ['landscape', 'portrait', 'square'].includes(resolvedOrientation.toLowerCase())
          ? resolvedOrientation.toLowerCase()
          : 'landscape',
      },
      timestamps: {
        publishedAt: resolvedPublishedAt,
      },
      metrics: {
        likes: resolvedLikes,
        views: resolvedViews,
      },
      source: deriveSource(),
    };

    const previewValue = resolvedPoster || (effectiveType === 'image' ? resolvedSrc : '');
    const thumbValue =
      resolvedThumbnail ||
      (effectiveType === 'image'
        ? previewValue || resolvedSrc
        : resolvedPoster || normalizedExisting?.thumbnail || '');

    if (previewValue) {
      meta.media.previewUrl = previewValue;
    }
    if (thumbValue) {
      meta.media.thumbUrl = thumbValue;
    }

    if (resolvedUpdatedAt) {
      meta.timestamps.updatedAt = resolvedUpdatedAt;
    }

    const resolvedTimelineInput = Array.isArray(rawTimestamps)
      ? rawTimestamps
      : Array.isArray(rawTimeline)
        ? rawTimeline
        : Array.isArray(rawChapters)
          ? rawChapters
          : null;

    const normalizedTimestamps = resolvedTimelineInput
      ? resolvedTimelineInput.map((stamp) => normalizeTimestamp(stamp)).filter(Boolean)
      : normalizedExisting?.timestamps || [];

    if (normalizedTimestamps?.length) {
      meta.timeline = normalizedTimestamps;
    }

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

    const revalidateTargets = new Set(['/x']);
    revalidateTargets.add(`/x/${resolvedSlug}`);

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
