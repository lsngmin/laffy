import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import { getAllContent } from '@/utils/contentSource';
import { getOrientationClass } from '@/lib/formatters';
import TitleNameHead from "@/components/x/TitleNameHead";

export default function ImageGallery({ items }) {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language || 'en';

  const galleryItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        aspect: getOrientationClass(item.orientation),
      })),
    [items]
  );

  return (
    <>
      <TitleNameHead/>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6">
          <header className="mb-10 flex flex-col items-center gap-4 text-center text-slate-200">
            <span className="rounded-full bg-slate-900/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              LAFFY
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{t('gallery.title', 'Hot Video')}</h1>
              <p className="text-sm text-slate-400">
                {t('gallery.subtitle', 'Every day, hot videos are uploaded.')}
              </p>
            </div>
          </header>

          {galleryItems.length === 0 ? (
            <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 text-slate-300">
              {t('gallery.empty', 'Not Available Video.')}
            </div>
          ) : (
            <section className="grid gap-5 sm:grid-cols-2">
              {galleryItems.map((item) => (
                <Link
                  key={item.slug}
                  href={`/x/${item.slug}`}
                  className="group relative overflow-hidden rounded-2xl bg-slate-900/70 ring-1 ring-slate-800/60 transition hover:-translate-y-1 hover:ring-indigo-400/50"
                >
                  <div className={`relative w-full ${item.aspect} overflow-hidden bg-slate-950/60`}>
                    {item.poster || item.thumbnail ? (
                      <img
                        src={item.poster || item.thumbnail}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_#6366f1_0%,_#0f172a_70%)] text-xs font-semibold text-slate-100">
                        {t('gallery.noPreview', 'Ready?')}
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100">
                      {locale === 'ko' ? 'VIEWS : 679,513' : 'VIEWS : 679,513'}
                    </span>
                  </div>
                  <div className="space-y-2 p-4">
                    <h2 className="text-base font-semibold leading-snug text-white line-clamp-2">{item.title}</h2>
                    {item.description && (
                      <p className="text-sm text-slate-300 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </Link>
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
  const galleryItems = items.filter((item) => (item.type || '').toLowerCase() === 'image');
  return {
    props: {
      items: galleryItems,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
