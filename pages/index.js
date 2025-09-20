import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AdSlot from '../components/AdSlot';
import { memes } from '../lib/memes';

export default function Home({ memes: memeList }) {
  const { t } = useTranslation('common');

  const feedCards = useMemo(() => {
    return memeList.flatMap((meme, index) => {
      const items = [{ kind: 'meme', key: `meme-${meme.slug}`, meme }];
      const shouldInsertAd = (index + 1) % 2 === 0 && index !== memeList.length - 1;
      if (shouldInsertAd) {
        items.push({ kind: 'ad', key: `ad-${index}` });
      }
      return items;
    });
  }, [memeList]);

  return (
    <>
      <Head>
        <title>{t('title')}</title>
        <meta name="monetag" content="e39f02316147e88555f93187d1919598"/>
        <meta name="description" content="Fresh memes and funny videos curated for your daily laughs."/>
      </Head>
      <div className="min-h-screen bg-slate-900">
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pb-24 pt-8 sm:px-6">
          <header className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-indigo-300">Daily LOLs</p>
            <h1 className="text-3xl font-black sm:text-4xl">{t('title')}</h1>
            <p className="text-sm text-slate-300">{t('subtitle')}</p>
          </header>

          <section className="mt-8 flex-1 space-y-6">
            {feedCards.map((entry) => {
              if (entry.kind === 'ad') {
                return <AdSlot key={entry.key} />;
              }

              const { meme } = entry;
              return (
                <Link
                  key={entry.key}
                  href={`/memes/${meme.slug}`}
                  className="group block"
                >
                  <article className="rounded-3xl bg-slate-800/80 p-2 shadow-xl shadow-slate-900/40 ring-1 ring-slate-700/60 transition hover:-translate-y-1 hover:ring-indigo-400/60">
                    <div className="overflow-hidden rounded-2xl">
                      <img
                        src={meme.thumbnail}
                        alt={meme.title}
                        className="aspect-[9/16] w-full object-cover transition group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    </div>
                    <h2 className="mt-4 px-2 text-lg font-semibold text-white sm:text-xl">
                      {meme.title}
                    </h2>
                  </article>
                </Link>
              );
            })}
          </section>

          <div className="mt-10">
            <button
              type="button"
              className="w-full rounded-full bg-indigo-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
            >
              {t('loadMore')}
            </button>
          </div>
        </main>

        <footer className="pb-10 text-center text-xs text-slate-400">
          {t('footerText')}
        </footer>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      memes,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
