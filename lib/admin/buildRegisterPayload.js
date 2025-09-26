export default function buildRegisterPayload(item) {
  if (!item) return null;

  const typeValue = (item.type || '').toLowerCase();
  const isImage = typeValue === 'image';
  const previewCandidates = [item.preview, item.thumbnail, item.poster];
  const basePreview = previewCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

  const srcCandidates = [item.src, item.poster, item.thumbnail, basePreview];
  const assetUrl = srcCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
  if (!assetUrl) return null;

  const posterCandidates = isImage
    ? [item.poster, assetUrl, item.thumbnail, basePreview]
    : [item.poster, item.thumbnail, basePreview];
  const posterUrl = posterCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

  const thumbnailCandidates = isImage
    ? [item.thumbnail, posterUrl, assetUrl, basePreview]
    : [item.thumbnail, posterUrl, basePreview];
  const thumbnailUrl = thumbnailCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

  const likesNumber = Number(item.likes);
  const viewsNumber = Number(item.views);
  const rawDuration = Number(item.durationSeconds);
  const durationSeconds = Number.isFinite(rawDuration) && rawDuration >= 0 ? Math.round(rawDuration) : 0;

  return {
    slug: item.slug,
    title: item.title || item.slug,
    socialTitle: item.title || item.slug,
    cardTitle: item.description || item.title || item.slug,
    description: item.description || '',
    summary: item.summary || item.description || item.title || '',
    url: assetUrl,
    durationSeconds,
    runtimeSec: durationSeconds,
    orientation: item.orientation || 'landscape',
    type: isImage ? 'image' : typeValue || 'video',
    poster: posterUrl || null,
    previewUrl: posterUrl || null,
    thumbnail: thumbnailUrl || null,
    thumbUrl: thumbnailUrl || null,
    likes: Number.isFinite(likesNumber) ? likesNumber : 0,
    views: Number.isFinite(viewsNumber) ? viewsNumber : 0,
    publishedAt: item.publishedAt || '',
  };
}
