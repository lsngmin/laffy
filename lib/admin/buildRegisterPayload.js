import { normalizeTimestamp } from './normalizeMeta';

const VALID_ORIENTATIONS = new Set(['landscape', 'portrait', 'square']);
const VALID_CHANNELS = new Set(['x', 'l', 'k', 'g']);

function pickFirstString(values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return '';
}

function parseMetric(value) {
  if (value === null || value === undefined) return 0;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}

function parseDuration(value) {
  if (value === null || value === undefined || value === '') return 0;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}

function sanitizeOrientation(value) {
  if (typeof value !== 'string') return 'landscape';
  const normalized = value.trim().toLowerCase();
  return VALID_ORIENTATIONS.has(normalized) ? normalized : 'landscape';
}

function sanitizeChannel(value) {
  if (typeof value !== 'string') return 'x';
  const normalized = value.trim().toLowerCase();
  return VALID_CHANNELS.has(normalized) ? normalized : 'x';
}

export default function buildRegisterPayload(item) {
  if (!item) return null;

  const slug = pickFirstString([item.slug]);
  if (!slug) return null;

  const normalizedType = pickFirstString([item.type]).toLowerCase();
  const type = normalizedType === 'image' ? 'image' : 'video';
  const isImage = type === 'image';
  const channel = sanitizeChannel(item.channel);

  const basePreview = pickFirstString([item.preview, item.thumbnail, item.poster]);
  const assetUrl = pickFirstString([
    item.src,
    item.poster,
    item.thumbnail,
    basePreview,
  ]);
  if (!assetUrl) return null;

  const posterUrl = pickFirstString(
    isImage
      ? [item.poster, assetUrl, item.thumbnail, basePreview]
      : [item.poster, item.thumbnail, basePreview]
  );

  const thumbnailUrl = pickFirstString(
    isImage
      ? [item.thumbnail, posterUrl, assetUrl, basePreview]
      : [item.thumbnail, posterUrl, basePreview]
  );

  const durationSeconds = parseDuration(item.durationSeconds);
  const likes = parseMetric(item.likes);
  const views = parseMetric(item.views);

  const timeline = Array.isArray(item.timestamps)
    ? item.timestamps.map((stamp) => normalizeTimestamp(stamp)).filter(Boolean)
    : [];

  const payload = {
    schemaVersion: '2024-05',
    slug,
    type,
    channel,
    display: {
      socialTitle: pickFirstString([item.title, slug]),
      cardTitle: pickFirstString([item.description, item.title, slug]),
      summary: pickFirstString([item.summary, item.description, item.title, '']),
      runtimeSec: durationSeconds,
    },
    media: {
      assetUrl,
      orientation: sanitizeOrientation(item.orientation || 'landscape'),
    },
    timestamps: {
      publishedAt: pickFirstString([item.publishedAt, new Date().toISOString()]),
    },
    metrics: {
      likes,
      views,
    },
  };

  if (isImage) {
    const imagePreview = posterUrl || assetUrl;
    payload.media.previewUrl = imagePreview;
    payload.media.thumbUrl = thumbnailUrl || imagePreview;
  } else {
    if (posterUrl) payload.media.previewUrl = posterUrl;
    if (thumbnailUrl) payload.media.thumbUrl = thumbnailUrl;
  }

  if (item.updatedAt) {
    const updated = pickFirstString([item.updatedAt]);
    if (updated) {
      payload.timestamps.updatedAt = updated;
    }
  }

  if (timeline.length) {
    payload.timeline = timeline;
  }

  if (item.source) {
    if (typeof item.source === 'string') {
      const origin = item.source.trim();
      if (origin) payload.source = { origin };
    } else if (item.source && typeof item.source === 'object') {
      payload.source = { ...item.source };
    }
  }

  return payload;
}
