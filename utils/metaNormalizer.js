const LATEST_SCHEMA_VERSION = '2024-05';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function pickFirstString(...candidates) {
  for (const candidate of candidates) {
    if (isNonEmptyString(candidate)) {
      return candidate.trim();
    }
  }
  return '';
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toPositiveInt(value, fallback = 0) {
  const num = toFiniteNumber(value);
  if (num === null) return Math.max(0, Math.round(fallback));
  return Math.max(0, Math.round(num));
}

function toOptionalPositiveInt(value) {
  const num = toFiniteNumber(value);
  if (num === null) return null;
  return Math.max(0, Math.round(num));
}

function normalizeType(value) {
  if (!isNonEmptyString(value)) return 'video';
  const lower = value.trim().toLowerCase();
  if (lower === 'image') return 'image';
  if (lower === 'video') return 'video';
  return lower || 'video';
}

function normalizeMeta(meta) {
  if (!meta || typeof meta !== 'object') {
    return null;
  }

  const schemaVersion = isNonEmptyString(meta.schemaVersion) ? meta.schemaVersion.trim() : null;
  if (schemaVersion) {
    return normalizeV2(meta, schemaVersion);
  }
  return normalizeV1(meta);
}

function normalizeV1(meta) {
  const slug = pickFirstString(meta.slug);
  if (!slug) return null;

  const type = normalizeType(meta.type);
  const src = pickFirstString(meta.src, meta.url, meta.assetUrl);
  if (!src) return null;

  const poster = pickFirstString(meta.poster, meta.thumbnail);
  const thumbnail = pickFirstString(meta.thumbnail, poster, src);
  const orientation = pickFirstString(meta.orientation, 'landscape');
  const durationSeconds = toPositiveInt(meta.durationSeconds, 0);
  const publishedAt = pickFirstString(meta.publishedAt);
  const likes = toPositiveInt(meta.likes, 0);
  const views = toPositiveInt(meta.views, 0);
  const source = pickFirstString(meta.source, 'Blob');

  return {
    slug,
    type,
    src,
    poster: poster || null,
    thumbnail: thumbnail || null,
    orientation: orientation || 'landscape',
    durationSeconds,
    source,
    publishedAt: publishedAt || new Date().toISOString(),
    likes,
    views,
    schemaVersion: null,
    updatedAt: null,
    title: pickFirstString(meta.title, slug),
    description: pickFirstString(meta.description, ''),
    summary: pickFirstString(meta.summary, meta.description, ''),
  };
}

function normalizeV2(meta, schemaVersion) {
  const display = meta.display && typeof meta.display === 'object' ? meta.display : {};
  const media = meta.media && typeof meta.media === 'object' ? meta.media : {};
  const timestamps = meta.timestamps && typeof meta.timestamps === 'object' ? meta.timestamps : {};
  const metrics = meta.metrics && typeof meta.metrics === 'object' ? meta.metrics : {};

  const slug = pickFirstString(meta.slug);
  if (!slug) return null;

  const type = normalizeType(meta.type);
  const assetUrl = pickFirstString(media.assetUrl, meta.src, meta.url, meta.asset);
  if (!assetUrl) return null;

  const previewUrl = pickFirstString(media.previewUrl, media.poster, meta.poster);
  const thumbUrl = pickFirstString(media.thumbUrl, media.thumbnail, meta.thumbnail, previewUrl, assetUrl);

  const orientation = pickFirstString(media.orientation, meta.orientation, 'landscape');
  const runtime = toPositiveInt(display.runtimeSec, toPositiveInt(meta.durationSeconds, 0));
  const publishedAt = pickFirstString(timestamps.publishedAt, meta.publishedAt);
  const updatedAt = pickFirstString(timestamps.updatedAt, meta.updatedAt);
  const likes = metrics.likes !== undefined ? toPositiveInt(metrics.likes, 0) : toPositiveInt(meta.likes, 0);
  const views = metrics.views !== undefined ? toPositiveInt(metrics.views, 0) : toPositiveInt(meta.views, 0);
  const sourceOrigin = pickFirstString(
    typeof meta.source === 'object' && meta.source ? meta.source.origin : '',
    typeof meta.source === 'string' ? meta.source : '',
    'Blob'
  );

  const socialTitle = pickFirstString(display.socialTitle, meta.title, slug);
  const cardTitle = pickFirstString(display.cardTitle, meta.description, socialTitle);
  const summary = pickFirstString(display.summary, cardTitle);

  return {
    slug,
    type,
    src: assetUrl,
    poster: previewUrl || null,
    thumbnail: thumbUrl || null,
    orientation: orientation || 'landscape',
    durationSeconds: runtime,
    source: sourceOrigin,
    publishedAt: publishedAt || new Date().toISOString(),
    likes,
    views,
    schemaVersion,
    updatedAt: updatedAt || null,
    title: socialTitle || cardTitle || slug,
    description: cardTitle || summary || '',
    summary,
  };
}

function buildLatestMeta(normalizedInput, overrides = {}) {
  const normalized = normalizeMeta(normalizedInput) || normalizedInput;
  if (!normalized || typeof normalized !== 'object') {
    throw new Error('Cannot build schema: invalid normalized meta');
  }

  const slug = pickFirstString(overrides.slug, normalized.slug);
  if (!slug) {
    throw new Error('Cannot build schema: missing slug');
  }

  const type = normalizeType(overrides.type || normalized.type);
  const assetUrl = pickFirstString(overrides.assetUrl, normalized.src);
  if (!assetUrl) {
    throw new Error('Cannot build schema: missing assetUrl');
  }

  const orientation = pickFirstString(overrides.orientation, normalized.orientation, 'landscape');
  const runtime = toPositiveInt(overrides.runtimeSec, normalized.durationSeconds || 0);
  const publishedAt = pickFirstString(overrides.publishedAt, normalized.publishedAt, new Date().toISOString());
  const updatedAt = pickFirstString(overrides.updatedAt, normalized.updatedAt || '');
  const cardTitle = pickFirstString(overrides.cardTitle, normalized.description, normalized.title, slug);
  const socialTitle = pickFirstString(overrides.socialTitle, normalized.title, cardTitle, slug);
  const summary = pickFirstString(overrides.summary, normalized.summary, cardTitle);
  const previewUrl = pickFirstString(overrides.previewUrl, normalized.poster, type === 'image' ? assetUrl : '');
  const thumbUrl = pickFirstString(overrides.thumbUrl, normalized.thumbnail, previewUrl, assetUrl);
  const likes = overrides.likes !== undefined ? overrides.likes : normalized.likes;
  const views = overrides.views !== undefined ? overrides.views : normalized.views;
  const sourceOrigin = pickFirstString(
    overrides.sourceOrigin,
    typeof normalized.source === 'string' ? normalized.source : '',
    'Blob'
  );

  const schemaVersion = pickFirstString(overrides.schemaVersion, normalized.schemaVersion, LATEST_SCHEMA_VERSION);

  const result = {
    schemaVersion,
    slug,
    type,
    display: {
      cardTitle: cardTitle || slug,
      socialTitle: socialTitle || cardTitle || slug,
      summary: summary || cardTitle || '',
      runtimeSec: runtime,
    },
    media: {
      assetUrl,
      orientation: orientation || 'landscape',
    },
    timestamps: {
      publishedAt,
    },
    source: {
      origin: sourceOrigin || 'Blob',
    },
  };

  if (updatedAt) {
    result.timestamps.updatedAt = updatedAt;
  }

  if (previewUrl && previewUrl !== assetUrl) {
    result.media.previewUrl = previewUrl;
  }

  const effectiveThumb = thumbUrl && thumbUrl !== (result.media.previewUrl || assetUrl)
    ? thumbUrl
    : null;
  if (effectiveThumb) {
    result.media.thumbUrl = effectiveThumb;
  }

  const likesNumber = toOptionalPositiveInt(likes);
  const viewsNumber = toOptionalPositiveInt(views);
  const metrics = {};
  if (likesNumber !== null) metrics.likes = likesNumber;
  if (viewsNumber !== null) metrics.views = viewsNumber;
  if (Object.keys(metrics).length > 0) {
    result.metrics = metrics;
  }

  return result;
}

module.exports = {
  LATEST_SCHEMA_VERSION,
  normalizeMeta,
  buildLatestMeta,
};
