import { useEffect, useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import TitleNameHead from '@/components/x/TitleNameHead';
import { vaTrack } from '@/lib/va';

const fallbackRedirect = (slug) => {
  const safeSlug = typeof slug === 'string' ? slug.trim() : '';
  if (!safeSlug) return '';
  return `https://gofile.io/d/${safeSlug}`;
};

export default function GofileRedirectPage({ meme, redirectUrl }) {
  const { t } = useTranslation('common');

  const slug = meme?.slug || '';
  const title = meme?.title || slug;

  useEffect(() => {
    if (typeof window === 'undefined' || !redirectUrl) return undefined;

    let preconnectEl;
    try {
      const originUrl = new URL(redirectUrl);
      preconnectEl = document.createElement('link');
      preconnectEl.rel = 'preconnect';
      preconnectEl.href = `${originUrl.protocol}//${originUrl.host}`;
      preconnectEl.crossOrigin = 'anonymous';
      document.head.appendChild(preconnectEl);
    } catch {}

    const payload = { slug, title, target: redirectUrl };

    try {
      vaTrack('g_redirect_load', payload);
    } catch {}

    try {
      vaTrack('g_redirect_navigation', payload);
      window.location.replace(redirectUrl);
    } catch {}

    return () => {
      if (preconnectEl?.parentNode) {
        preconnectEl.parentNode.removeChild(preconnectEl);
      }
    };
  }, [redirectUrl, slug, title]);

  const safeTitle = useMemo(() => {
    const raw = typeof meme?.title === 'string' ? meme.title : '';
    const trimmed = raw.trim();
    return (trimmed || slug || 'Gofile Redirect').slice(0, 70);
  }, [meme?.title, slug]);

  const description = useMemo(() => {
    const raw = typeof meme?.description === 'string' ? meme.description : '';
    const trimmed = raw.replace(/[\r\n\t]+/g, ' ').trim();
    return trimmed || t('redirect.description', 'Please wait while we open the smart link.');
  }, [meme?.description, t]);

  if (!redirectUrl) return null;

  const heading = t('redirect.heading', 'Redirecting…');
  const subtitle = t(
    'redirect.subtitle',
    'If you only see an ad landing page in Korean, please open it in an external browser.'
  );
  const externalCta = t('redirect.externalCta', 'Open in external browser');
  const externalConfirm = t(
    'redirect.externalConfirm',
    'Open this link in your external browser?'
  );

  return (
    <>
      <TitleNameHead title={safeTitle} description={description} />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center text-slate-200">
          <div className="space-y-3">
            <span className="inline-flex items-center justify-center rounded-full bg-slate-900/60 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
              LAFFY · GOFILE
            </span>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">{heading}</h1>
            <p className="text-sm text-slate-400">{description}</p>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window === 'undefined') return;
              try {
                const shouldOpen = window.confirm(externalConfirm);
                if (!shouldOpen) return;
                window.open(redirectUrl, '_blank', 'noopener,noreferrer');
              } catch {}
            }}
            className="inline-flex w-full max-w-sm items-center justify-center rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {externalCta}
          </button>
        </main>
      </div>
    </>
  );
}

export async function getStaticPaths({ locales }) {
  const { items } = await getAllContent();
  const paths = items
    .filter((item) => ((item.channel || '').toLowerCase() === 'g'))
    .flatMap((entry) => locales.map((locale) => ({ params: { slug: entry.slug }, locale })));
  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
  const slugParam = params?.slug || '';
  const { meme } = await getContentBySlug(slugParam);

  if (!meme || ((meme.channel || '').toLowerCase() !== 'g')) {
    const fallbackUrl = fallbackRedirect(slugParam);
    if (!fallbackUrl) {
      return { notFound: true };
    }
    return {
      props: {
        meme: { slug: slugParam, title: slugParam, description: '' },
        redirectUrl: fallbackUrl,
        ...(await serverSideTranslations(locale ?? 'en', ['common'])),
      },
      revalidate: 60,
    };
  }

  const redirectCandidate =
    (typeof meme.smartLinkUrl === 'string' && meme.smartLinkUrl.trim())
      || (typeof meme.src === 'string' && meme.src.trim())
      || fallbackRedirect(slugParam);

  if (!redirectCandidate) {
    return { notFound: true };
  }

  return {
    props: {
      meme,
      redirectUrl: redirectCandidate,
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
    revalidate: 60,
  };
}
