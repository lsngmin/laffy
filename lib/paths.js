export function getDetailHref(meme) {
  if (!meme || !meme.slug) {
    return '/m';
  }

  const type = typeof meme.type === 'string' ? meme.type.toLowerCase() : '';
  if (type === 'image') {
    return `/x/${meme.slug}`;
  }

  return `/m/${meme.slug}`;
}
