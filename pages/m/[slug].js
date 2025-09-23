import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useLikes } from '../../hooks/useLikes';
import { formatCount, formatRelativeTime, getOrientationClass } from '../../lib/formatters';
import { BookmarkIcon, CompassIcon, EyeIcon, HeartIcon, ShareIcon, SparkIcon } from '../../components/icons';
import { loadFavorites, toggleFavoriteSlug } from '../../utils/storage';
import { getAllContent, getContentBySlug } from '../../utils/contentSource';
import clsx from 'clsx';
import VideoCard from "../../components/m/video/VideoCard";

function TwitterEmbed({ url }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!url) return;
    const onLoad = () => window.twttr?.widgets?.load(containerRef.current);

    let script = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', onLoad);
      document.body.appendChild(script);
    } else if (script.getAttribute('data-loaded') === 'true') {
      onLoad();
    } else {
      script.addEventListener('load', onLoad);
    }
    script.setAttribute('data-loaded', 'true');

    return () => script.removeEventListener('load', onLoad);
  }, [url]);

  return (
      <div ref={containerRef} className="twitter-embed w-full">
        <blockquote className="twitter-tweet" data-theme="dark">
          <a href={url}>Twitter meme</a>
        </blockquote>
      </div>
  );
}

export default function MemeDetail({ meme, allMemes }) {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
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

  const recommendedMemes = allMemes
      ?.filter((item) => item.slug !== meme.slug)
      .slice(0, 3)
      .map((item) => ({
        ...item,
        aspect: getOrientationClass(item.orientation),
        relativeTime: item.publishedAt ? formatRelativeTime(new Date(item.publishedAt), locale) : null,
      })) ?? [];

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

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const payload = { title: meme.title, url: window.location.href };

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    const text = encodeURIComponent(meme.title);
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${text}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleLocaleSwitch = () => {
    const nextLocale = locale === 'ko' ? 'en' : 'ko';
    router.push(router.pathname, router.asPath, { locale: nextLocale });
  };

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
        <Head>
          <title>{`${meme.title} | Laffy`}</title>
          <meta name="description" content={meme.description} />
        </Head>
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
            {/* 상단 액션 */}
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

            {/* 로고 */}
            <div className="mt-6 text-center">
            <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-2xl font-black tracking-[0.35em] text-transparent">
              LAFFY
            </span>
            </div>

            <Link
                href="/m"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/40 via-purple-500/30 to-pink-500/40 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/50 transition hover:brightness-110 active:scale-95"
            >
              <span aria-hidden="true">←</span>
              {t('backToFeed')}
            </Link>

            {/* 본문 */}
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

              {/* 미디어 */}
              <div>
                {meme.type === 'video' ? (
                    <VideoCard
                        poster={meme.poster}
                        src={meme.src}
                        title={meme.title}
                        aspect={mediaAspect}
                        disablePlay={true}   // ← true면 썸네일+재생아이콘만
                    />
                ) : (
                    <TwitterEmbed url={meme.url} />
                )}
              </div>


              {/* 액션 버튼 */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleToggleLike}
                        className={clsx(
                            'inline-flex items-center justify-center rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-black/40 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                            liked && 'ring-1 ring-pink-400/60'
                        )}
                        disabled={!likesReady}
                        aria-pressed={liked}
                        aria-label={liked ? t('actions.liked') : t('actions.like')}
                    >
                      <HeartIcon filled={liked} className="h-4 w-4" />
                    </button>

                    <button
                        type="button"
                        onClick={handleToggleFavorite}
                        className={clsx(
                            'inline-flex items-center justify-center rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-black/40 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                            isFavorite && 'ring-1 ring-amber-300/70'
                        )}
                        aria-pressed={isFavorite}
                        aria-label={isFavorite ? t('favorites.saved') : t('favorites.save')}
                    >
                      <BookmarkIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-black/40 transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                      aria-label={t('actions.share')}
                  >
                    <ShareIcon className="h-4 w-4" />
                  </button>
                </div>

                {meme.type === 'twitter' && (
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      <a
                          href={meme.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-white/20"
                      >
                        {t('watchOnTwitter')}
                        <ShareIcon className="h-3.5 w-3.5" />
                      </a>
                    </div>
                )}
              </div>
            </article>

            {/* 추천 */}
            {recommendedMemes.length > 0 && (
                <section className="mt-10 space-y-4 rounded-3xl bg-slate-900/70 p-5 ring-1 ring-slate-800/80 sm:p-7">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white sm:text-2xl">
                      {t('detail.recommended.title')}
                    </h2>
                    <p className="text-sm text-slate-300">{t('detail.recommended.subtitle')}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {recommendedMemes.map((item) => (
                        <Link
                            key={`recommended-${item.slug}`}
                            href={`/m/${item.slug}`}
                            className="group flex flex-col overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/80 transition hover:-translate-y-1 hover:ring-indigo-400/60"
                        >
                          <div className={`relative w-full ${item.aspect} overflow-hidden bg-slate-950/60`}>
                            {item.thumbnail ? (
                                <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_#6366f1_0%,_#0f172a_70%)] text-xs font-semibold text-slate-100">
                                  미리보기 이미지 없음
                                </div>
                            )}
                            <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100">
                        <CompassIcon className="h-3.5 w-3.5" />
                              {item.type === 'video' ? t('meta.video') : t('meta.thread')}
                      </span>
                          </div>
                          <div className="flex flex-1 flex-col gap-3 p-4">
                            <h3 className="text-base font-semibold leading-snug text-white line-clamp-2">
                              {item.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-slate-300 line-clamp-2">{item.description}</p>
                            <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1 text-rose-200">
                          <HeartIcon className="h-3.5 w-3.5" />
                          {formatCount(item.likes, locale)}
                        </span>
                              <span className="inline-flex items-center gap-1">
                          <EyeIcon className="h-3.5 w-3.5" />
                                {formatCount(item.views, locale)}
                        </span>
                              {item.relativeTime && (
                                  <span className="inline-flex items-center gap-1">
                            <SparkIcon className="h-3.5 w-3.5" />
                                    {item.relativeTime}
                          </span>
                              )}
                            </div>
                          </div>
                        </Link>
                    ))}
                  </div>
                </section>
            )}
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
