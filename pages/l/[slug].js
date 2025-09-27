import { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import TitleNameHead from '@/components/x/TitleNameHead';
import ImageSocialMeta from '@/components/x/meta/ImageSocialMeta';
import { SPONSOR_SMART_LINK_URL } from '@/components/x/ads/constants';

export default function SmartLinkRedirectPage({ meme, redirectUrl }) {
  const { t } = useTranslation('common');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!redirectUrl) return undefined;

    const timer = window.setTimeout(() => {
      try {
        window.location.replace(redirectUrl);
      } catch {}
    }, 0);

    return () => window.clearTimeout(timer);
  }, [redirectUrl]);

  if (!meme) return null;

  const safeTitle = String(meme?.title || 'Laffy')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 70);
  const safeDesc = String(meme?.description || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 200);

  const heading = t('redirect.heading', 'Redirecting…');
  const description = t('redirect.description', 'Please wait while we open the smart link.');
  const fallbackCta = t('redirect.cta', 'Tap here if nothing happens.');

  return (
    <>
      <TitleNameHead title={meme.description} />
      {meme.__seo && <ImageSocialMeta seo={meme.__seo} title={safeTitle} description={safeDesc} />}
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center text-slate-200">
          <div className="space-y-3">
            <span className="inline-flex items-center justify-center rounded-full bg-slate-900/60 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              LAFFY · L
            </span>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">{heading}</h1>
            <p className="text-sm text-slate-400">{description}</p>
          </div>
          <a
            href={redirectUrl}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(99,102,241,0.35)] transition hover:brightness-110"
          >
            {fallbackCta}
          </a>
        </main>
      </div>
    </>
  );
}

export async function getStaticPaths({ locales }) {
  const { items } = await getAllContent();
  const paths = items
    .filter((item) => (item.type || '').toLowerCase() === 'image')
    .filter((item) => ((item.channel || 'x').toLowerCase() === 'l'))
    .map((meme) =>
      locales.map((locale) => ({ params: { slug: meme.slug }, locale }))
    )
    .flat();
  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
  const { meme } = await getContentBySlug(params.slug);
  if (!meme) return { notFound: true };
  if ((meme.type || '').toLowerCase() !== 'image') {
    return { notFound: true };
  }
  if (((meme.channel || 'x').toLowerCase()) !== 'l') {
    return { notFound: true };
  }

  const normalizedMeme = { ...meme };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  const origin = siteUrl || '';
  const toAbs = (u) => { if (!u) return ''; try { return u.startsWith('http') ? u : (origin ? origin + u : u); } catch { return u; } };
  const canonicalUrl = origin ? `${origin}/l/${params.slug}` : '';
  const thumb = toAbs(meme.poster || meme.thumbnail || '');
  const uploadDate = meme.publishedAt || new Date().toISOString();
  const localesForHref = ['ko', 'en'];
  const hreflangs = localesForHref.map((lng) => ({ hrefLang: lng, href: `${origin}/l/${params.slug}?locale=${lng}` }));
  hreflangs.push({ hrefLang: 'x-default', href: `${origin}/l/${params.slug}` });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: normalizedMeme.title,
    contentUrl: thumb || undefined,
    uploadDate,
  };
  normalizedMeme.__seo = { canonicalUrl, hreflangs, jsonLd, metaImage: thumb };

  return {
    props: {
      meme: normalizedMeme,
      redirectUrl: SPONSOR_SMART_LINK_URL,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
