import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import { getAllContent } from '@/utils/contentSource';
import TitleNameHead from '@/components/x/TitleNameHead';
import VideoPreviewCard from '@/components/k/VideoPreviewCard';
import { vaTrack } from '@/lib/va';

export default function KineticPreviewGallery({ items }) {
  const { t } = useTranslation('common');
  const [redirectingId, setRedirectingId] = useState('');
  const redirectCleanupRef = useRef(null);

  const previewItems = useMemo(() => items.map((item) => ({ ...item })), [items]);

  const heading = t('kGallery.title', 'Kinetic Preview');
  const subtitle = t(
    'kGallery.subtitle',
    'Quickly skim externally hosted clips shared for the K channel.'
  );
  const emptyCopy = t('kGallery.empty', 'No preview videos are available yet.');
  const ctaLabel = t('kGallery.cta', 'Open preview');
  const redirectingLabel = t('kGallery.redirecting', 'Opening…');

  const handleRedirect = useCallback((item) => {
    if (!item) return;
    const target = typeof item.src === 'string' ? item.src.trim() : '';
    if (!target) return;
    if (typeof window === 'undefined') return;

    if (redirectCleanupRef.current) {
      redirectCleanupRef.current();
      redirectCleanupRef.current = null;
    }

    setRedirectingId(item.slug || target);

    let preconnectEl;
    try {
      const originUrl = new URL(target);
      preconnectEl = document.createElement('link');
      preconnectEl.rel = 'preconnect';
      preconnectEl.href = `${originUrl.protocol}//${originUrl.host}`;
      preconnectEl.crossOrigin = 'anonymous';
      document.head.appendChild(preconnectEl);
    } catch {}

    try {
      vaTrack('l_redirect_cta_click', {
        slug: item.slug || '',
        title: item.title || '',
        target,
      });
    } catch {}

    try {
      vaTrack('l_redirect_initiated', {
        slug: item.slug || '',
        title: item.title || '',
        target,
      });
    } catch {}

    const timer = window.setTimeout(() => {
      try {
        window.location.replace(target);
      } catch {}
    }, 1000);

    const cleanup = () => {
      window.removeEventListener('pagehide', cleanup);
      window.removeEventListener('beforeunload', cleanup);
      window.clearTimeout(timer);
      if (preconnectEl?.parentNode) {
        preconnectEl.parentNode.removeChild(preconnectEl);
      }
      redirectCleanupRef.current = null;
      setRedirectingId('');
    };

    redirectCleanupRef.current = cleanup;

    window.addEventListener('pagehide', cleanup, { once: true });
    window.addEventListener('beforeunload', cleanup, { once: true });
  }, []);

  return (
    <>
      <TitleNameHead title={t('kGallery.metaTitle', heading)} />
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6">
          <header className="mb-10 flex flex-col items-center gap-4 text-center text-slate-200">
            <span className="rounded-full bg-slate-900/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              LAFFY · K
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{heading}</h1>
              <p className="text-sm text-slate-400">{subtitle}</p>
            </div>
          </header>

          {previewItems.length === 0 ? (
            <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 text-slate-300">
              {emptyCopy}
            </div>
          ) : (
            <section className="grid gap-5 sm:grid-cols-2">
              {previewItems.map((item) => (
                <VideoPreviewCard
                  key={item.slug || item.src}
                  item={item}
                  onRedirect={handleRedirect}
                  redirecting={(item.slug || item.src) === redirectingId}
                  ctaLabel={ctaLabel}
                  redirectingLabel={redirectingLabel}
                />
              ))}
            </section>
          )}
        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  const { items } = await getAllContent();
  const previewItems = items
    .filter((item) => (item.type || '').toLowerCase() === 'video')
    .filter((item) => ((item.channel || 'x').toLowerCase() === 'k'))
    .map((item) => ({ ...item }));

  return {
    props: {
      items: previewItems,
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
    revalidate: 60,
  };
}
