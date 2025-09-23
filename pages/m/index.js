import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import MemeCard from '../../components/MemeCard';
import { useLikes } from '../../hooks/useLikes';
import { formatCount, formatDuration, formatRelativeTime, getOrientationClass } from '../../lib/formatters';
import { loadFavorites, toggleFavoriteSlug } from '../../utils/storage';
import { getAllContent } from '../../utils/contentSource';
import { BookmarkIcon } from '../../components/icons';

const TABS = ['trending', 'latest', 'random'];

export default function Home({ memes: memeList }) {
  const { t, i18n } = useTranslation('common');
  const locale = i18n.language || 'en';
  const router = useRouter();
  const { isLiked, toggleLike, ready: likesReady } = useLikes();
  const [activeTab, setActiveTab] = useState(TABS[0]);
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

  const decoratedMemes = useMemo(() => {
    return memeList.map((meme) => {
      const mediaAspect = getOrientationClass(meme.orientation);
      const publishedDate = meme.publishedAt ? new Date(meme.publishedAt) : null;
      const relativeTime = publishedDate ? formatRelativeTime(publishedDate, locale) : null;
      const liked = isLiked(meme.slug);
      const likesValue = meme.likes + (liked ? 1 : 0);
      const typeKey =
        meme.type === 'image'
          ? 'image'
          : meme.type === 'video'
            ? 'video'
            : 'thread';
      return {
        ...meme,
        mediaAspect,
        durationLabel: typeKey === 'video' ? formatDuration(meme.durationSeconds) : null,
        publishedDate,
        relativeTime,
        typeLabel: t(`meta.${typeKey}`),
        likesValue,
        likesDisplay: formatCount(likesValue, locale),
        viewsDisplay: formatCount(meme.views, locale)
      };
    });
  }, [i18n.language, isLiked, locale, memeList, t]);

  const filteredMemes = useMemo(() => {
    const list = [...decoratedMemes];
    switch (activeTab) {
      case 'latest':
        return list
          .slice()
          .sort((a, b) => (b.publishedDate?.getTime() || 0) - (a.publishedDate?.getTime() || 0));
      case 'random':
        return list
          .slice()
          .sort(() => Math.random() - 0.5);
      case 'trending':
      default:
        return list
          .slice()
          .sort((a, b) => (b.likesValue || 0) - (a.likesValue || 0));
    }
  }, [activeTab, decoratedMemes]);

  return (
    <>
      <Head>
        <title>{t('title')}</title>
        <meta
          name="description"
          content="Scroll quick laughs, viral clips, and shareable memes in one comfy mobile feed."
        />
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-4 pb-16 pt-10 sm:px-6">
          <header className="space-y-8">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <Link
                href="/m/favorites"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3.5 py-2 font-semibold text-slate-100 shadow-md shadow-black/40 transition active:scale-95"
                aria-label={t('favorites.cta')}
              >
                <BookmarkIcon className="h-4 w-4" />
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
              <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-4xl font-black tracking-[0.4em] text-transparent sm:text-[44px]">
                LAFFY
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 text-center">
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`relative overflow-hidden rounded-full px-4 pb-2 pt-2 text-sm font-semibold transition-all duration-300 active:scale-95 ${
                      isActive ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    <span className={`relative z-10 ${isActive ? 'bg-gradient-to-r from-indigo-200 via-purple-100 to-pink-100 bg-clip-text text-transparent' : ''}`}>
                      {t(`tabs.${tab}`)}
                    </span>
                    <span
                      className={`pointer-events-none absolute inset-0 rounded-full border border-transparent bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-pink-500/20 transition-opacity duration-300 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <span
                      className={`pointer-events-none absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 transition-transform duration-300 ${
                        isActive ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </header>

          <section className="flex flex-col gap-6">
            {filteredMemes.map((meme) => (
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
        </main>
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  const { items: merged } = await getAllContent();
  return {
    props: {
      memes: merged,
      ...(await serverSideTranslations(locale, ['common']))
    },
    revalidate: 60
  };
}
