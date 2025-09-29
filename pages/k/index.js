import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import { getAllContent } from '@/utils/contentSource';
import TitleNameHead from '@/components/x/TitleNameHead';
import VideoPreviewCard from '@/components/k/VideoPreviewCard';

export default function KineticPreviewGallery({ items }) {
  const { t } = useTranslation('common');

  const previewItems = useMemo(() => items.map((item) => ({ ...item })), [items]);

  const heading = t('kGallery.title', 'Kinetic Preview');
  const subtitle = t(
    'kGallery.subtitle',
    'Quickly skim externally hosted clips shared for the K channel.'
  );
  const emptyCopy = t('kGallery.empty', 'No preview videos are available yet.');
  const ctaLabel = t('kGallery.cta', 'Open preview');

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
                  ctaLabel={ctaLabel}
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
