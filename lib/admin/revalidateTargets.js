export default function buildRevalidateTargets(channel, type, slug) {
  const normalizedChannel = typeof channel === 'string' ? channel.trim().toLowerCase() : '';
  const normalizedType = typeof type === 'string' ? type.trim().toLowerCase() : '';
  const safeChannel = ['x', 'l', 'k', 'g'].includes(normalizedChannel) ? normalizedChannel : 'x';
  const safeType = normalizedType === 'image' ? 'image' : 'video';

  const targets = new Set();

  if (safeChannel === 'l') {
    targets.add('/l');
    if (slug) targets.add(`/l/${slug}`);
  } else if (safeChannel === 'k') {
    targets.add('/k');
    if (slug) targets.add(`/k/${slug}`);
  } else if (safeChannel === 'g') {
    targets.add('/gofile.io/d');
    if (slug) targets.add(`/gofile.io/d/${slug}`);
  } else if (safeType === 'image') {
    targets.add('/x');
    if (slug) targets.add(`/x/${slug}`);
  } else {
    targets.add('/m');
    if (slug) targets.add(`/m/${slug}`);
  }

  return Array.from(targets);
}
