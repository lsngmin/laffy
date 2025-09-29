import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import TitleNameHead from '@/components/x/TitleNameHead';
import VideoSocialMeta from '@/components/x/meta/VideoSocialMeta';

export default function KEmbedPlayerPage({ meme, embedSrc }) {
  const { t } = useTranslation('common');

  if (!meme || !embedSrc) return null;

  const fallbackDesc = t(
    'kDetail.redirectDescription',
    'Getting your video ready. We will take you to the external player in a moment.'
  );

  const safeTitle = useMemo(() => {
    const raw = typeof meme?.title === 'string' ? meme.title : '';
    const trimmed = raw.trim();
    return (trimmed || 'Kinetic Preview').slice(0, 70);
  }, [meme?.title]);

  const safeDesc = useMemo(() => {
    const raw = typeof meme?.description === 'string' ? meme.description : '';
    const trimmed = raw.replace(/[\r\n\t]+/g, ' ').trim();
    const base = trimmed || fallbackDesc;
    return base.replace(/\s+/g, ' ').slice(0, 200);
  }, [fallbackDesc, meme?.description]);

  return (
    <>
      <TitleNameHead title={safeTitle} description={safeDesc} />
      {meme.__seo && (
        <VideoSocialMeta
          seo={meme.__seo}
          title={safeTitle}
          description={safeDesc}
          player={meme.__seo?.player}
        />
      )}
      <div className="flex min-h-screen items-center justify-center bg-black p-4">
        <div className="w-full max-w-5xl">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl">
            <video
              src={embedSrc}
              controls
              playsInline
              poster={meme.poster || meme.thumbnail || ''}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>
    </>
  );
}

export async function getStaticPaths({ locales }) {
  const { items } = await getAllContent();
  const paths = items
    .filter((item) => (item.type || '').toLowerCase() === 'video')
    .filter((item) => ((item.channel || 'x').toLowerCase() === 'k'))
    .flatMap((meme) => locales.map((locale) => ({ params: { slug: meme.slug }, locale })));
  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
  const { meme } = await getContentBySlug(params.slug);
  if (!meme) return { notFound: true };
  if ((meme.type || '').toLowerCase() !== 'video') {
    return { notFound: true };
  }
  if (((meme.channel || 'x').toLowerCase()) !== 'k') {
    return { notFound: true };
  }

  const assetUrl = typeof meme.src === 'string' ? meme.src : '';
  if (!assetUrl) {
    return { notFound: true };
  }

  const normalizedMeme = { ...meme };

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const origin = siteUrl || '';
  const toAbs = (u) => {
    if (!u) return '';
    try {
      return u.startsWith('http') ? u : origin ? origin + u : u;
    } catch {
      return u;
    }
  };

  const canonicalUrl = origin ? `${origin}/k/${params.slug}` : '';
  const embedUrl = origin ? `${origin}/k/embed/${params.slug}` : '';
  const thumb = toAbs(meme.poster || meme.thumbnail || '');
  const absoluteAsset = toAbs(assetUrl);
  const uploadDate = meme.publishedAt || new Date().toISOString();
  const hreflangs = ['ko', 'en'].map((lng) => ({ hrefLang: lng, href: `${origin}/k/${params.slug}?locale=${lng}` }));
  hreflangs.push({ hrefLang: 'x-default', href: `${origin}/k/${params.slug}` });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: normalizedMeme.title,
    description: normalizedMeme.description,
    thumbnailUrl: thumb || undefined,
    contentUrl: absoluteAsset || undefined,
    uploadDate,
  };

  const playerDimensions = (() => {
    const orientation = (normalizedMeme.orientation || '').toLowerCase();
    if (orientation === 'portrait') return { width: 720, height: 1280 };
    if (orientation === 'square') return { width: 1080, height: 1080 };
    return { width: 1280, height: 720 };
  })();

  normalizedMeme.__seo = {
    canonicalUrl,
    hreflangs,
    jsonLd,
    metaImage: thumb,
    player: {
      playerUrl: embedUrl || undefined,
      streamUrl: absoluteAsset || undefined,
      streamContentType: meme.mimeType || 'video/mp4',
      thumbnailUrl: thumb || undefined,
      width: playerDimensions.width,
      height: playerDimensions.height,
    },
  };

  return {
    props: {
      meme: normalizedMeme,
      embedSrc: absoluteAsset,
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
    revalidate: 60,
  };
}
