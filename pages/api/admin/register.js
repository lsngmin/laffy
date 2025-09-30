import { assertAdmin } from './_auth';
import { put, list } from '@vercel/blob';
import { randomBytes } from 'crypto';
import normalizeMeta, { normalizeTimestamp } from '../../../lib/admin/normalizeMeta';

const VALID_ORIENTATIONS = new Set(['landscape', 'portrait', 'square']);
const SLUG_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function parseString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pickFirstString(values) {
  for (const value of values) {
    const parsed = parseString(value);
    if (parsed) return parsed;
  }
  return '';
}

function parseMetric(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}

function parseDuration(value) {
  if (value === undefined || value === null || value === '') return 0;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}

function sanitizeOrientation(value) {
  const normalized = parseString(value).toLowerCase();
  return VALID_ORIENTATIONS.has(normalized) ? normalized : 'landscape';
}

function parseChannel(value) {
  const normalized = parseString(value).toLowerCase();
  if (normalized === 'l' || normalized === 'k' || normalized === 'g') return normalized;
  return 'x';
}

function generateRandomSlug(length = 6) {
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

async function isSlugTaken(folder, slug) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  try {
    const { blobs } = await list({
      prefix: `content/${folder}/${slug}.json`,
      token,
      limit: 1,
    });
    return Array.isArray(blobs) && blobs.length > 0;
  } catch (error) {
    console.error('Failed to verify slug availability', error);
    return false;
  }
}

async function generateUniqueSlug(folder, attempt = 0) {
  if (attempt >= 20) {
    throw new Error('Unable to allocate unique slug');
  }
  const candidate = generateRandomSlug();
  if (await isSlugTaken(folder, candidate)) {
    return generateUniqueSlug(folder, attempt + 1);
  }
  return candidate;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!assertAdmin(req, res)) return;

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const metaUrl = pickFirstString([body.metaUrl]);

    const existingMeta = await (async () => {
      if (!metaUrl) return null;
      try {
        const resMeta = await fetch(metaUrl, { cache: 'no-store' });
        if (!resMeta.ok) return null;
        return await resMeta.json();
      } catch (error) {
        console.error('Failed to fetch existing meta', error);
        return null;
      }
    })();

    const normalizedExisting = existingMeta ? normalizeMeta(existingMeta) : null;
    const existingDisplay = isObject(existingMeta?.display) ? existingMeta.display : {};
    const existingMedia = isObject(existingMeta?.media) ? existingMeta.media : {};
    const existingMetrics = isObject(existingMeta?.metrics) ? existingMeta.metrics : {};
    const existingTimestamps = isObject(existingMeta?.timestamps) ? existingMeta.timestamps : {};

    let slug = pickFirstString([body.slug, normalizedExisting?.slug, existingMeta?.slug]);

    const displayPayload = isObject(body.display) ? body.display : {};
    const mediaPayload = isObject(body.media) ? body.media : {};
    const metricsPayload = isObject(body.metrics) ? body.metrics : {};
    const rawTimestampsField = body.timestamps;
    const timestampsPayload = isObject(rawTimestampsField) ? rawTimestampsField : {};

    const baseType = pickFirstString([
      body.type,
      normalizedExisting?.type,
      existingMeta?.type,
    ]);
    const normalizedType = baseType.toLowerCase() === 'image' ? 'image' : 'video';

    const assetUrl = pickFirstString([
      mediaPayload.assetUrl,
      body.assetUrl,
      body.url,
      existingMedia.assetUrl,
      existingMeta?.src,
      existingMeta?.url,
      normalizedExisting?.src,
    ]);
    if (!assetUrl) return res.status(400).json({ error: 'Missing source URL' });

    const effectiveType = (() => {
      if (normalizedType === 'image') return 'image';
      const lower = assetUrl.toLowerCase();
      return /(\.jpe?g|\.png|\.webp|\.gif)$/.test(lower) ? 'image' : normalizedType;
    })();

    const channel = parseChannel(
      body.channel ?? normalizedExisting?.channel ?? existingMeta?.channel
    );

    const socialTitle = pickFirstString([
      displayPayload.socialTitle,
      body.socialTitle,
      body.title,
      existingDisplay.socialTitle,
      normalizedExisting?.title,
      normalizedExisting?.description,
      slug,
    ]);

    const cardTitle = pickFirstString([
      displayPayload.cardTitle,
      body.cardTitle,
      body.description,
      existingDisplay.cardTitle,
      normalizedExisting?.description,
      socialTitle,
    ]);

    const summary = pickFirstString([
      displayPayload.summary,
      body.summary,
      existingDisplay.summary,
      normalizedExisting?.summary,
      cardTitle,
    ]);

    const runtimeValue =
      displayPayload.runtimeSec ??
      displayPayload.runtimeSeconds ??
      body.runtimeSec ??
      body.durationSeconds ??
      existingDisplay.runtimeSec ??
      existingMeta?.durationSeconds ??
      normalizedExisting?.durationSeconds;
    const durationSeconds = parseDuration(runtimeValue);

    const previewCandidate = pickFirstString([
      mediaPayload.previewUrl,
      body.previewUrl,
      body.poster,
      existingMedia.previewUrl,
      existingMeta?.poster,
      normalizedExisting?.poster,
      normalizedExisting?.preview,
    ]);

    const thumbCandidate = pickFirstString([
      mediaPayload.thumbUrl,
      body.thumbUrl,
      body.thumbnail,
      existingMedia.thumbUrl,
      existingMeta?.thumbnail,
      normalizedExisting?.thumbnail,
      previewCandidate,
    ]);

    const orientation = sanitizeOrientation(
      mediaPayload.orientation ||
        body.orientation ||
        existingMedia.orientation ||
        existingMeta?.orientation ||
        normalizedExisting?.orientation
    );

    const publishedAt = pickFirstString([
      timestampsPayload.publishedAt,
      body.publishedAt,
      existingTimestamps.publishedAt,
      existingMeta?.publishedAt,
      normalizedExisting?.publishedAt,
    ]) || new Date().toISOString();

    let updatedAt = pickFirstString([
      timestampsPayload.updatedAt,
      body.updatedAt,
      existingTimestamps.updatedAt,
      existingMeta?.updatedAt,
      normalizedExisting?.updatedAt,
    ]);
    if (!updatedAt && metaUrl) {
      updatedAt = new Date().toISOString();
    }

    const likes = parseMetric(
      metricsPayload.likes ??
        body.likes ??
        existingMetrics.likes ??
        existingMeta?.likes ??
        normalizedExisting?.likes
    );

    const views = parseMetric(
      metricsPayload.views ??
        body.views ??
        existingMetrics.views ??
        existingMeta?.views ??
        normalizedExisting?.views
    );

    const timelineSource = (() => {
      if (Array.isArray(body.timeline)) return body.timeline;
      if (Array.isArray(rawTimestampsField)) return rawTimestampsField;
      if (Array.isArray(body.chapters)) return body.chapters;
      return null;
    })();

    const timeline = timelineSource
      ? timelineSource.map((stamp) => normalizeTimestamp(stamp)).filter(Boolean)
      : Array.isArray(normalizedExisting?.timestamps)
        ? normalizedExisting.timestamps.map((stamp) => ({ ...stamp }))
        : [];

    const previewValue = previewCandidate || (effectiveType === 'image' ? assetUrl : '');
    const thumbValue =
      thumbCandidate ||
      (effectiveType === 'image'
        ? previewValue || assetUrl
        : previewCandidate || normalizedExisting?.thumbnail || existingMedia.thumbUrl || '');

    const source = (() => {
      const incoming = body.source;
      if (typeof incoming === 'string') {
        const origin = incoming.trim();
        if (origin) return { origin };
      }
      if (isObject(incoming)) {
        return { ...incoming };
      }
      if (typeof existingMeta?.source === 'string') {
        const origin = existingMeta.source.trim();
        if (origin) return { origin };
      }
      if (isObject(existingMeta?.source)) {
        return { ...existingMeta.source };
      }
      return { origin: 'Blob' };
    })();

    const folder = effectiveType === 'image' ? 'images' : 'videos';

    if (!slug) {
      slug = await generateUniqueSlug(folder);
    }

    const meta = {
      schemaVersion: '2024-05',
      slug,
      type: effectiveType,
      channel,
      display: {
        socialTitle: socialTitle || cardTitle || slug,
        cardTitle: cardTitle || socialTitle || slug,
        summary: summary || cardTitle || socialTitle || '',
        runtimeSec: durationSeconds,
      },
      media: {
        assetUrl,
        orientation,
      },
      timestamps: {
        publishedAt,
      },
      metrics: {
        likes,
        views,
      },
      source,
    };

    if (previewValue) {
      meta.media.previewUrl = previewValue;
    }
    if (thumbValue) {
      meta.media.thumbUrl = thumbValue;
    }
    if (updatedAt) {
      meta.timestamps.updatedAt = updatedAt;
    }
    if (timeline.length) {
      meta.timeline = timeline;
    }

    if (isObject(body.links)) {
      meta.links = { ...body.links };
    }

    if (isObject(body.share)) {
      meta.share = { ...body.share };
    }

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

    const key = keyFromMetaUrl || `content/${folder}/${slug}.json`;

    await put(key, JSON.stringify(meta, null, 2), {
      token: process.env.BLOB_READ_WRITE_TOKEN,
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    const revalidateTargets = new Set();
    if (channel === 'l') {
      revalidateTargets.add('/l');
      revalidateTargets.add(`/l/${slug}`);
    } else if (channel === 'k') {
      revalidateTargets.add('/k');
      revalidateTargets.add(`/k/${slug}`);
    } else if (channel === 'g') {
      revalidateTargets.add('/gofile.io');
      revalidateTargets.add(`/gofile.io/${slug}`);
    } else if (effectiveType === 'image') {
      revalidateTargets.add('/x');
      revalidateTargets.add(`/x/${slug}`);
    } else {
      revalidateTargets.add('/m');
      revalidateTargets.add(`/m/${slug}`);
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
  } catch (error) {
    console.error('Failed to register meta', error);
    res.status(500).json({ error: error?.message || 'Failed to register meta' });
  }
}

export const config = {
  runtime: 'nodejs',
};
