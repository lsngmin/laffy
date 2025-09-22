export async function listBlobContent() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  try {
    const { loadBlob } = await import('./dynamicBlob');
    const { list } = await loadBlob();
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

function normalize(meta) {
  return {
    slug: meta.slug,
    type: meta.type || 'video',
    src: meta.src || meta.url,
    poster: meta.poster || null,
    title: meta.title || '',
    description: meta.description || '',
    thumbnail: meta.thumbnail || meta.poster || '',
    orientation: meta.orientation || 'landscape',
    durationSeconds: Number(meta.durationSeconds) || 0,
    source: meta.source || 'Blob',
    publishedAt: meta.publishedAt || new Date().toISOString(),
    likes: Number(meta.likes) || 0,
    views: Number(meta.views) || 0
  };
}

