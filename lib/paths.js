export function getDetailHref(meme) {
  if (!meme || !meme.slug) {
    return '/x';
  }

  return `/x/${meme.slug}`;
}
