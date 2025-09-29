import { useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import TitleNameHead from '@/components/x/TitleNameHead';
import VideoSocialMeta from '@/components/x/meta/VideoSocialMeta';

export default function KEmbedPlayerPage({ meme, embedSrc, visitUrl }) {
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

  const [overlayActive, setOverlayActive] = useState(Boolean(visitUrl));

  const aspectPadding = useMemo(() => {
    const orientation = (meme?.orientation || '').toLowerCase();
    if (orientation === 'portrait') return '177.78%'; // 9:16
    if (orientation === 'square') return '100%';
    return '56.25%'; // 16:9 default
  }, [meme?.orientation]);

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
      <div className="flex min-h-screen items-center justify-center bg-black px-4 py-8">
        <div className="flex w-full max-w-5xl flex-col items-center gap-6">
          <div className="w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
            <div className="relative w-full" style={{ paddingBottom: aspectPadding }}>
              <video
                src={embedSrc}
                controls
                autoPlay={false}
                playsInline
                poster={meme.poster || meme.thumbnail || ''}
                preload="metadata"
                className="absolute inset-0 h-full w-full object-contain"
              />
              {visitUrl && overlayActive ? (
                <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-black/70 px-4 text-center text-white">
                  <div className="flex w-full max-w-md flex-col items-center gap-6">
                    <p className="text-base font-semibold leading-snug">
                      {t(
                        'redirect.overlayPrompt',
                        'Tap to open the full experience on our site.'
                      )}
                    </p>
                    <div className="flex w-full flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            if (visitUrl) window.top.location.href = visitUrl;
                          } catch {
                            if (visitUrl) window.location.assign(visitUrl);
                          }
                        }}
                        className="w-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-[0_18px_38px_rgba(99,102,241,0.45)] transition duration-150 ease-out hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-300"
                      >
                        {t('redirect.visitSite', 'Visit Site')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOverlayActive(false)}
                        className="w-full rounded-full border border-white/30 px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-white/80 transition duration-150 ease-out hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        {t('redirect.watchHere', 'Watch Here')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          {visitUrl ? (
            <a
              href={visitUrl}
              target="_top"
              rel="noopener noreferrer"
              className="flex w-full max-w-5xl items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-5 text-center text-lg font-semibold uppercase tracking-[0.25em] text-white shadow-[0_20px_45px_rgba(79,70,229,0.45)] transition duration-150 ease-out hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-300"
            >
              {t('redirect.visitSite', 'Visit Site')}
            </a>
          ) : null}
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
      visitUrl: canonicalUrl || absoluteAsset,
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
    revalidate: 60,
  };
}
