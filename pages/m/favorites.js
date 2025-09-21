import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import MemeCard from '../../components/MemeCard';
import { useLikes } from '../../hooks/useLikes';
import { formatCount, formatRelativeTime, getOrientationClass } from '../../lib/formatters';
import { loadFavorites, toggleFavoriteSlug } from '../../utils/storage';
import { memes } from '../../lib/memes';
import { BookmarkIcon } from '../../components/icons';

export default function Favorites({ memes: memeList }) {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language || 'en';
  const router = useRouter();
  const { isLiked, toggleLike, ready: likesReady } = useLikes();
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const handleToggleLike = useCallback(
    (slug) => {
      if (!likesReady) return;
      toggleLike(slug);
    },
    [likesReady, toggleLike]
  );

  const handleToggleFavorite = useCallback((slug) => {
    const next = toggleFavoriteSlug(slug);
    setFavorites(next);
  }, []);

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  const handleLocaleSwitch = useCallback(() => {
    const nextLocale = locale === 'ko' ? 'en' : 'ko';
    router.push(router.pathname, router.asPath, { locale: nextLocale });
  }, [locale, router]);

  const memeMap = useMemo(() => {
    const map = new Map();
    memeList.forEach((meme) => {
      map.set(meme.slug, meme);
    });
    return map;
  }, [memeList]);

  const decoratedFavorites = useMemo(() => {
    return favorites
      .map((slug) => memeMap.get(slug))
      .filter(Boolean)
      .map((meme) => {
        const mediaAspect = getOrientationClass(meme.orientation);
        const publishedDate = meme.publishedAt ? new Date(meme.publishedAt) : null;
        const relativeTime = publishedDate ? formatRelativeTime(publishedDate, locale) : null;
        const liked = isLiked(meme.slug);
        const likesValue = meme.likes + (liked ? 1 : 0);
        return {
          ...meme,
          mediaAspect,
          relativeTime,
          likesDisplay: formatCount(likesValue, locale),
          viewsDisplay: formatCount(meme.views, locale)
        };
      });
  }, [favorites, i18n.language, isLiked, locale, memeMap, t]);

  return (
    <>
      <Head>
        <title>{`${t('favorites.title')} | ${t('title')}`}</title>
        <meta name="description" content={t('favorites.metaDescription')} />
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-4 pb-16 pt-10 sm:px-6">
          <header className="space-y-8">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <Link
                href="/m"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3.5 py-2 font-semibold text-slate-100 shadow-md shadow-black/40 transition active:scale-95"
                aria-label={t('favorites.backToFeed')}
              >
                ←
                <span>{t('favorites.backToFeed')}</span>
              </Link>
              <button
                type="button"
                onClick={handleLocaleSwitch}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3.5 py-2 font-semibold text-slate-100 shadow-md shadow-black/40 transition active:scale-95"
                aria-label="Change language"
              >
                <span className="text-[11px] uppercase tracking-[0.3em]">{locale === 'ko' ? 'KO' : 'EN'}</span>
                <span className="text-[11px] text-slate-500">⇄</span>
              </button>
            </div>

            <div className="text-center">
              <span className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-pink-300 to-indigo-300 bg-clip-text text-3xl font-black tracking-[0.3em] text-transparent sm:text-[42px]">
                <BookmarkIcon className="h-5 w-5" />
                LAFFY
              </span>
            </div>
          </header>

          {decoratedFavorites.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-300">
              <p className="text-base font-semibold">{t('favorites.emptyTitle')}</p>
              <p className="text-sm text-slate-400">{t('favorites.emptySubtitle')}</p>
              <Link
                href="/m"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/70 via-purple-500/60 to-pink-500/60 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition active:scale-95"
              >
                {t('favorites.exploreCta')}
              </Link>
            </div>
          ) : (
            <section className="flex flex-col gap-6">
              {decoratedFavorites.map((meme) => (
                <MemeCard
                  key={meme.slug}
                  meme={meme}
                  href={`/m/${meme.slug}`}
                  isLiked={isLiked(meme.slug)}
                  likesDisplay={meme.likesDisplay}
                  viewsDisplay={meme.viewsDisplay}
                  isFavorite={favoritesSet.has(meme.slug)}
                  onToggleLike={handleToggleLike}
                  onToggleFavorite={handleToggleFavorite}
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
  return {
    props: {
      memes,
      ...(await serverSideTranslations(locale, ['common']))
    },
    revalidate: 60
  };
}
