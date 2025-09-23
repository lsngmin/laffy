import { list } from '@vercel/blob';

export async function listBlobContent() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  try {
    const { blobs } = await list({ prefix: 'content/' });
    const metas = blobs.filter((b) => b.pathname.endsWith('.json'));
    const items = await Promise.all(
      metas.map(async (b) => {
        try {
          const res = await fetch(b.url);
          if (!res.ok) return null;
          const m = await res.json();
          return normalize(m);
        } catch {
          return null;
        }
      })
    );
    return items.filter(Boolean);
  } catch (e) {
    return [];
  }
}

export async function getAllContent() {
  const blobContent = await listBlobContent();
  return { items: sortByPublishedAt(blobContent), source: 'blob' };
}

export async function getContentBySlug(slug) {
  const { items, source } = await getAllContent();
  const meme = items.find((item) => item.slug === slug) || null;
  return { meme, items, source };
}

function normalize(meta) {
  const normalizedPoster = meta.poster || meta.thumbnail || null;
  const normalizedThumbnail = meta.thumbnail || normalizedPoster || '';

  return {
    slug: meta.slug,
    type: meta.type || 'video',
    src: meta.src || meta.url,
    poster: normalizedPoster,
    title: meta.title || '',
    description: meta.description || '',
    thumbnail: normalizedThumbnail,
    orientation: meta.orientation || 'landscape',
    durationSeconds: Number(meta.durationSeconds) || 0,
    source: meta.source || 'Blob',
    publishedAt: meta.publishedAt || new Date().toISOString(),
    likes: Number(meta.likes) || 0,
    views: Number(meta.views) || 0
  };
}

function sortByPublishedAt(items) {
  return items
    .slice()
    .sort((a, b) => (new Date(b.publishedAt).getTime() || 0) - (new Date(a.publishedAt).getTime() || 0));
}
