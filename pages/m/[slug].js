import { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import { LikeButton, ShareButton, LocaleSwitchButton, BookmarkButton } from "@/components/button";
import { BookmarkLink, BackToFeedLink } from "@/components/link";

import { useLikes } from '@/hooks/useLikes';
import { formatCount, formatRelativeTime, getOrientationClass } from '@/lib/formatters';
import { loadFavorites, toggleFavoriteSlug } from '@/utils/storage';
import { getAllContent, getContentBySlug } from '@/utils/contentSource';
import VideoCard from "../../components/m/video/VideoCard";

import TitleNameHead from "../../components/m/TitleNameHead";
import LogoText from "../../components/LogoText";
import RecommendedMemes from "@/components/m/RecommendedMemes";

export default function MemeDetail({ meme, allMemes }) {
  const { t, i18n } = useTranslation('common');
  const { isLiked, toggleLike, ready: likesReady } = useLikes();

  const [isFavorite, setIsFavorite] = useState(false);
  const [serverCounts, setServerCounts] = useState({ views: null, likes: null });

  if (!meme) return null;

  const locale = i18n.language || 'en';
  const mediaAspect = getOrientationClass(meme.orientation);
  const publishedDate = meme.publishedAt ? new Date(meme.publishedAt) : null;
  const relativeTime = publishedDate ? formatRelativeTime(publishedDate, locale) : null;
  const liked = isLiked(meme.slug);

  const likesDisplay = formatCount((serverCounts.likes ?? meme.likes) + (liked ? 1 : 0), locale);
  const viewsDisplay = formatCount(serverCounts.views ?? meme.views, locale);

  useEffect(() => {
    setIsFavorite(loadFavorites().includes(meme.slug));

    (async () => {
      try {
        await fetch('/api/metrics/view', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug: meme.slug }),
        });
        const res = await fetch(`/api/metrics/get?slug=${encodeURIComponent(meme.slug)}`);
        if (res.ok) {
          const data = await res.json();
          setServerCounts({ views: data.views, likes: data.likes });
        }
      } catch {
        // 무시
      }
    })();
  }, [meme.slug]);

  const handleToggleFavorite = () => {
    const updated = toggleFavoriteSlug(meme.slug);
    setIsFavorite(updated.includes(meme.slug));
  };

  const handleToggleLike = async () => {
    try {
      toggleLike(meme.slug);
      const delta = liked ? -1 : 1;
      const res = await fetch('/api/metrics/like', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: meme.slug, delta }),
      });
      if (res.ok) {
        const data = await res.json();
        setServerCounts((s) => ({ ...s, likes: data.likes }));
      }
    } catch {
      // 무시
    }
  };

  return (
      <>
        <TitleNameHead title={meme.title} description={meme.description} />

        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <BookmarkLink label={t("favorites.cta")} />
              <LocaleSwitchButton locale={locale} />
            </div>

            <div className="mt-6 text-center">
              <LogoText />
            </div>

            <BackToFeedLink href="/m" label={t("backToFeed")} />

            <article className="mt-6 space-y-7 rounded-3xl bg-slate-900/80 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] ring-1 ring-slate-800/70 sm:p-9">
              <header className="space-y-4">
                <h1 className="text-2xl font-bold leading-snug text-white sm:text-[30px]">{meme.title}</h1>
                <p className="text-sm leading-relaxed text-slate-200/90 sm:text-base">{meme.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-slate-300/90">
                  {relativeTime && <span>{`${t('meta.postedLabel')}: ${relativeTime}`}</span>}
                  {viewsDisplay && <span>{`${t('meta.viewsLabel')}: ${viewsDisplay}`}</span>}
                  {likesDisplay && <span>{`${t('meta.likesLabel')}: ${likesDisplay}`}</span>}
                </div>
              </header>

              <div>
                    <VideoCard
                        poster={meme.poster}
                        src={meme.src}
                        title={meme.title}
                        aspect={mediaAspect}
                        disablePlay={true}   // ← true면 썸네일+재생아이콘만
                    />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LikeButton
                        liked={liked}
                        onToggle={handleToggleLike}
                        disabled={!likesReady}
                        t={t}
                    />
                    <BookmarkButton
                        isFavorite={isFavorite}
                        onToggle={handleToggleFavorite}
                        t={t}
                    />
                  </div>

                  <ShareButton t={t} />

                </div>
              </div>
            </article>

            <RecommendedMemes t={t} locale={locale} allMemes={allMemes} meme={meme} />
          </main>
        </div>
      </>
  );
}

export async function getStaticPaths({ locales }) {
  const { items } = await getAllContent();
  const paths = items.flatMap((meme) =>
      locales.map((locale) => ({ params: { slug: meme.slug }, locale }))
  );
  return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
  const { meme, items } = await getContentBySlug(params.slug);
  if (!meme) return { notFound: true };
  return {
    props: {
      meme,
      allMemes: items,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
