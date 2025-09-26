import { getAllContent } from '@/utils/contentSource';

function xml(items) {
  const urls = items
    .map((it) => {
      const loc = it.loc || `/x/${it.slug}`;
      const lastmod = it.publishedAt || new Date().toISOString();
      return `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export async function getServerSideProps({ res, req }) {
  const { items } = await getAllContent();
  // Prefix with origin to ensure absolute URLs
  const origin = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  const fallbackOrigin = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host || 'localhost:3000'}`;
  const baseUrl = origin || fallbackOrigin;

  const withOrigin = items.map((it) => ({ ...it, loc: `${baseUrl}/x/${it.slug}` }));
  const body = xml(withOrigin);
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.write(body);
  res.end();
  return { props: {} };
}

export default function SiteMap() {
  return null;
}

