export function normalizeMeta(meta) {
  if (!meta || typeof meta !== 'object') {
    return {
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
      likes: 0,
      views: 0,
    };
  }

  const rawSlug = typeof meta.slug === 'string' ? meta.slug.trim() : '';
  const rawType = typeof meta.type === 'string' ? meta.type.trim().toLowerCase() : '';
  const rawTitle = typeof meta.title === 'string' ? meta.title.trim() : '';
  const rawSummary = typeof meta.summary === 'string' ? meta.summary.trim() : '';
  const rawDescription = typeof meta.description === 'string' ? meta.description.trim() : '';
  const orientation = meta.orientation === 'portrait' ? 'portrait' : 'landscape';

  const parseDuration = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return Math.round(numeric);
  };

  const durationSeconds = parseDuration(
    meta.durationSeconds ?? meta.duration ?? meta.length ?? meta.seconds
  );

  const normalizeTimestamp = (stamp) => {
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
  };

  const timestamps = Array.isArray(meta.timestamps)
    ? meta.timestamps
        .map((stamp) => normalizeTimestamp(stamp))
        .filter(Boolean)
    : [];

  const preview =
    (typeof meta.preview === 'string' && meta.preview.trim()) ||
    (typeof meta.thumbnail === 'string' && meta.thumbnail.trim()) ||
    (typeof meta.poster === 'string' && meta.poster.trim()) ||
    '';
  const poster = typeof meta.poster === 'string' ? meta.poster.trim() : '';
  const thumbnail =
    (typeof meta.thumbnail === 'string' && meta.thumbnail.trim()) || poster || '';
  const src =
    (typeof meta.src === 'string' && meta.src.trim()) ||
    (typeof meta.url === 'string' && meta.url.trim()) ||
    '';

  const publishedAt = typeof meta.publishedAt === 'string' ? meta.publishedAt : '';
  const likesNumeric = Number(meta.likes);
  const viewsNumeric = Number(meta.views);

  return {
    slug: rawSlug,
    type: rawType,
    title: rawTitle,
    summary: rawSummary,
    description: rawDescription,
    orientation,
    durationSeconds,
    timestamps,
    preview,
    poster,
    thumbnail,
    src,
    publishedAt,
    likes: Number.isFinite(likesNumeric) && likesNumeric >= 0 ? likesNumeric : 0,
    views: Number.isFinite(viewsNumeric) && viewsNumeric >= 0 ? viewsNumeric : 0,
  };
}

export default normalizeMeta;
