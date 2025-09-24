import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import MemeDetailPage from '@/components/m/MemeDetailPage';

export default function MemeDetail(props) {
  return <MemeDetailPage {...props} />;
}

export async function getStaticPaths({ locales }) {
  const { items } = await getAllContent();
  const paths = items
    .filter((item) => (item.type || '').toLowerCase() !== 'image')
    .flatMap((meme) =>
      locales.map((locale) => ({ params: { slug: meme.slug }, locale }))
    );
  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
  const { meme, items } = await getContentBySlug(params.slug);
  if (!meme) return { notFound: true };

  if ((meme.type || '').toLowerCase() === 'image') {
    return {
      redirect: {
        destination: `/x/${params.slug}`,
        permanent: false,
      },
    };
  }

  // Build absolute origin
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  const origin = siteUrl || '';
  const toAbs = (u) => {
    if (!u) return '';
    try { return u.startsWith('http') ? u : (origin ? origin + u : u); } catch { return u; }
  };
  const canonicalUrl = origin ? `${origin}/m/${params.slug}` : '';
  const thumb = toAbs(meme.poster || meme.thumbnail || '');
  const src = toAbs(meme.src || '');
  const uploadDate = meme.publishedAt || new Date().toISOString();
  const duration = `PT${Number(meme.durationSeconds || 0)}S`;

  // hreflang alternates (ko/en)
  const locales = ['ko', 'en'];
  const hreflangs = locales.map((lng) => ({ hrefLang: lng, href: `${origin}/m/${params.slug}?locale=${lng}` }));
  hreflangs.push({ hrefLang: 'x-default', href: `${origin}/m/${params.slug}` });

  // JSON-LD VideoObject
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: meme.title,
    description: meme.description,
    thumbnailUrl: thumb ? [thumb] : [],
    uploadDate,
    contentUrl: src || undefined,
    duration,
  };

  return {
    props: {
      meme: { ...meme, __seo: { canonicalUrl, hreflangs, jsonLd, metaImage: thumb } },
      allMemes: items,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
