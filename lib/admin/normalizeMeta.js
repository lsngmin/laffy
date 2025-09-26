const VALID_ORIENTATIONS = new Set(['landscape', 'portrait', 'square']);

const DEFAULT_META = {
  schemaVersion: '',
  slug: '',
  type: '',
  title: '',
  summary: '',
  description: '',
  orientation: 'landscape',
  durationSeconds: 0,
  timestamps: [],
  preview: '',
  poster: '',
  thumbnail: '',
  src: '',
  publishedAt: '',
  updatedAt: '',
  likes: 0,
  views: 0,
};

function parseString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseOrientation(value) {
  const normalized = parseString(value).toLowerCase();
  return VALID_ORIENTATIONS.has(normalized) ? normalized : 'landscape';
}

function parseDuration(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}

function parseMetric(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}

function extractTimeline(meta) {
  if (!meta || typeof meta !== 'object') return [];
  const candidates = [meta.timeline, meta.chapters, meta.markers];
  if (Array.isArray(meta.timestamps)) {
    candidates.push(meta.timestamps);
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export function normalizeTimestamp(stamp) {
  if (!stamp || typeof stamp !== 'object') return null;
  const numericSeconds = Number(
    stamp.seconds ?? stamp.time ?? stamp.at ?? stamp.offset ?? stamp.position
  );
  if (!Number.isFinite(numericSeconds) || numericSeconds < 0) {
    return null;
  }

  const label =
    typeof stamp.label === 'string'
      ? stamp.label.trim()
      : typeof stamp.title === 'string'
        ? stamp.title.trim()
        : '';
  const descriptionValue =
    typeof stamp.description === 'string' ? stamp.description.trim() : '';
  const slugValue = typeof stamp.slug === 'string' ? stamp.slug.trim() : '';
  const urlValue = typeof stamp.url === 'string' ? stamp.url.trim() : '';

  const normalizedStamp = {
    seconds: numericSeconds,
  };

  if (label) normalizedStamp.label = label;
  if (descriptionValue) normalizedStamp.description = descriptionValue;
  if (slugValue) normalizedStamp.slug = slugValue;
  if (urlValue) normalizedStamp.url = urlValue;

  return normalizedStamp;
}

export default function normalizeMeta(meta) {
  if (!meta || typeof meta !== 'object') {
    return { ...DEFAULT_META };
  }

  const schemaVersion = parseString(meta.schemaVersion);
  const normalized = { ...DEFAULT_META, schemaVersion };

  const timeline = extractTimeline(meta)
    .map((stamp) => normalizeTimestamp(stamp))
    .filter(Boolean);

  const likes = parseMetric(meta.likes);
  const views = parseMetric(meta.views);
  const publishedAtFallback = parseString(meta.publishedAt);
  const updatedAtFallback = parseString(meta.updatedAt);

  if (schemaVersion === '2024-05') {
    const slug = parseString(meta.slug);
    const typeValue = parseString(meta.type).toLowerCase();
    const type = typeValue === 'image' ? 'image' : 'video';

    const display = meta && typeof meta.display === 'object' && meta.display ? meta.display : {};
    const cardTitle = parseString(display.cardTitle);
    const socialTitle = parseString(display.socialTitle);
    const summary = parseString(display.summary);
    const runtimeSec = display.runtimeSec ?? display.runtimeSeconds ?? display.durationSec;

    const media = meta && typeof meta.media === 'object' && meta.media ? meta.media : {};
    const assetUrl = parseString(media.assetUrl) || parseString(meta.src) || parseString(meta.url);
    const previewUrl = parseString(media.previewUrl);
    const thumbUrl = parseString(media.thumbUrl);
    const orientation = parseOrientation(media.orientation ?? meta.orientation);

    const timestampBlock =
      meta && typeof meta.timestamps === 'object' && !Array.isArray(meta.timestamps)
        ? meta.timestamps
        : {};
    const publishedAt = parseString(timestampBlock.publishedAt) || publishedAtFallback;
    const updatedAt = parseString(timestampBlock.updatedAt) || updatedAtFallback;

    const metrics = meta && typeof meta.metrics === 'object' && meta.metrics ? meta.metrics : {};
    const likesMetric = parseMetric(metrics.likes ?? likes);
    const viewsMetric = parseMetric(metrics.views ?? views);

    const preview = previewUrl || thumbUrl || assetUrl;
    const poster = previewUrl || assetUrl;
    const thumbnail = thumbUrl || previewUrl || assetUrl;

    normalized.slug = slug;
    normalized.type = type;
    normalized.title = socialTitle || cardTitle || summary || slug;
    normalized.summary = summary || cardTitle || socialTitle || '';
    normalized.description = cardTitle || socialTitle || summary || '';
    normalized.orientation = orientation;
    normalized.durationSeconds = parseDuration(runtimeSec ?? meta.durationSeconds);
    normalized.preview = preview;
    normalized.poster = poster;
    normalized.thumbnail = thumbnail;
    normalized.src = assetUrl;
    normalized.publishedAt = publishedAt;
    normalized.updatedAt = updatedAt;
    normalized.likes = likesMetric;
    normalized.views = viewsMetric;
  } else {
    const slug = parseString(meta.slug);
    const type = parseString(meta.type).toLowerCase();
    const title = parseString(meta.title);
    const summary = parseString(meta.summary);
    const description = parseString(meta.description);
    const orientation = parseOrientation(meta.orientation);
    const durationSeconds = parseDuration(
      meta.durationSeconds ?? meta.duration ?? meta.length ?? meta.seconds
    );

    const preview =
      parseString(meta.preview) ||
      parseString(meta.thumbnail) ||
      parseString(meta.poster);
    const poster = parseString(meta.poster);
    const thumbnail = parseString(meta.thumbnail) || poster;
    const src = parseString(meta.src) || parseString(meta.url);

    normalized.slug = slug;
    normalized.type = type;
    normalized.title = title || description || summary || slug;
    normalized.summary = summary || description || title || '';
    normalized.description = description || title || summary || '';
    normalized.orientation = orientation;
    normalized.durationSeconds = durationSeconds;
    normalized.preview = preview;
    normalized.poster = poster;
    normalized.thumbnail = thumbnail;
    normalized.src = src;
    normalized.publishedAt = publishedAtFallback;
    normalized.updatedAt = updatedAtFallback;
    normalized.likes = likes;
    normalized.views = views;
  }

  normalized.timestamps = timeline;

  if (!normalized.type) {
    normalized.type = 'video';
  }
  if (!normalized.orientation) {
    normalized.orientation = 'landscape';
  }
  if (!normalized.src) {
    normalized.src = '';
  }

  return normalized;
}
