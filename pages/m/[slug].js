import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AdSlot from '../../components/AdSlot';
import { useLikes } from '../../hooks/useLikes';
import { memes, getMemeBySlug } from '../../lib/memes';
import { formatCount, formatRelativeTime, getOrientationClass } from '../../lib/formatters';
import { loadFavorites, toggleFavoriteSlug } from '../../utils/storage';
import { BookmarkIcon, CompassIcon, EyeIcon, HeartIcon, ShareIcon, SparkIcon } from '../../components/icons';

function TwitterEmbed({ url }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!url) return;
    const onLoad = () => {
      window.twttr?.widgets?.load(containerRef.current);
    };

    let script = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', onLoad);
      document.body.appendChild(script);
    } else if (script?.getAttribute('data-loaded') === 'true') {
      onLoad();
    } else {
      script.addEventListener('load', onLoad);
    }

    script?.setAttribute('data-loaded', 'true');

    return () => {
      script?.removeEventListener('load', onLoad);
    };
  }, [url]);

  return (
    <div ref={containerRef} className="twitter-embed w-full">
      <blockquote className="twitter-tweet" data-theme="dark">
        <a href={url}>Twitter meme</a>
      </blockquote>
    </div>
  );
}

export default function MemeDetail({ meme }) {
  const { t, i18n } = useTranslation('common');
  const { isLiked, toggleLike, ready: likesReady } = useLikes();
  const [isFavorite, setIsFavorite] = useState(false);

  if (!meme) {
    return null;
  }

  const locale = i18n.language || 'en';
  const typeLabel = t(`meta.${meme.type === 'video' ? 'video' : 'thread'}`);
  const mediaAspect = getOrientationClass(meme.orientation);
  const publishedDate = meme.publishedAt ? new Date(meme.publishedAt) : null;
  const relativeTime = publishedDate ? formatRelativeTime(publishedDate, locale) : null;
  const liked = isLiked(meme.slug);
  const likesDisplay = formatCount(meme.likes + (liked ? 1 : 0), locale);
  const viewsDisplay = formatCount(meme.views, locale);

  const recommendedMemes = useMemo(() => {
    return memes
      .filter((item) => item.slug !== meme.slug)
      .slice(0, 3)
      .map((item) => {
        const aspect = getOrientationClass(item.orientation);
        const relativeTime = item.publishedAt ? formatRelativeTime(new Date(item.publishedAt), locale) : null;
        return { ...item, aspect, relativeTime };
      });
  }, [locale, meme.slug]);

  useEffect(() => {
    setIsFavorite(loadFavorites().includes(meme.slug));
  }, [meme.slug]);

  const handleToggleFavorite = useCallback(() => {
    const updated = toggleFavoriteSlug(meme.slug);
    setIsFavorite(updated.includes(meme.slug));
  }, [meme.slug]);

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const payload = { title: meme.title, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
        console.warn('Share dismissed', error);
      }
    }
    const text = encodeURIComponent(meme.title);
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${text}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }, [meme.title]);

  return (
    <>
      <Head>
        <title>{`${meme.title} | Laffy`}</title>
        <meta name="description" content={meme.description} />
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
          <div className="mb-4 text-center">
            <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-2xl font-black tracking-[0.35em] text-transparent">
              LAFFY
            </span>
          </div>
          <Link
            href="/m"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500/40 via-purple-500/30 to-pink-500/40 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/50 transition hover:brightness-110 active:scale-95"
          >
            <span aria-hidden="true">←</span>
            {t('backToFeed')}
          </Link>

          <article className="mt-6 space-y-7 rounded-3xl bg-slate-900/80 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] ring-1 ring-slate-800/70 sm:p-9">
            <header className="space-y-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-indigo-200">
                {t('detail.heroTagline')}
              </span>
              <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">{meme.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-rose-200">
                <HeartIcon filled className="h-4 w-4" />
                <span>{likesDisplay}</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-200/90 sm:text-base">{meme.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-slate-300/90">
                {relativeTime && (
                  <span className="inline-flex items-center gap-1">
                    <SparkIcon className="h-3.5 w-3.5" />
                    {relativeTime}
                  </span>
                )}
                {relativeTime && (viewsDisplay || likesDisplay) && <span className="text-slate-500">•</span>}
                {viewsDisplay && (
                  <span className="inline-flex items-center gap-1 text-slate-200/85">
                    <EyeIcon className="h-4 w-4" />
                    {viewsDisplay}
                  </span>
                )}
                {viewsDisplay && likesDisplay && <span className="text-slate-500">•</span>}
                {likesDisplay && (
                  <span className="inline-flex items-center gap-1 text-rose-200">
                    <HeartIcon className="h-3.5 w-3.5" />
                    {likesDisplay}
                  </span>
                )}
              </div>
            </header>

            <div className={`overflow-hidden rounded-3xl ring-1 ring-slate-800/70 shadow-[0_25px_60px_-35px_rgba(30,41,59,0.8)] ${mediaAspect}`}>
              {meme.type === 'video' ? (
                <video
                  className="h-full w-full object-cover"
                  controls
                  preload="metadata"
                  playsInline
                  poster={meme.poster}
                >
                  <source src={meme.src} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-950/60 p-4">
                  <TwitterEmbed url={meme.url} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleLike(meme.slug)}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg shadow-black/40 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
                      liked ? 'bg-pink-500 text-white hover:bg-pink-400' : 'bg-slate-900/80 text-slate-100 hover:bg-slate-800'
                    }`}
                    disabled={!likesReady}
                    aria-pressed={liked}
                    aria-label={liked ? t('actions.liked') : t('actions.like')}
                  >
                    <HeartIcon filled={liked} className="h-4 w-4" />
                    <span>{liked ? t('actions.liked') : t('actions.like')}</span>
                  </button>

                  <button
                    type="button"
                  onClick={handleToggleFavorite}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg shadow-black/40 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${
                    isFavorite ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-900/80 text-slate-100 hover:bg-slate-800'
                  }`}
                  aria-pressed={isFavorite}
                >
                    <BookmarkIcon className="h-4 w-4" />
                    <span>{isFavorite ? t('favorites.saved') : t('favorites.save')}</span>
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

              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                {meme.type === 'twitter' && (
                  <a
                    href={meme.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-indigo-200 transition hover:bg-white/20"
                  >
                    {t('watchOnTwitter')}
                    <ShareIcon className="h-3.5 w-3.5" />
                  </a>
                )}
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 shadow-lg shadow-black/40">
                  <SparkIcon className="h-3.5 w-3.5" />
                  {typeLabel}
                </div>
              </div>
            </div>
          </article>

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
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
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

          <div className="mt-10">
            <AdSlot />
          </div>
        </main>
      </div>
    </>
  );
}

export async function getStaticPaths({ locales }) {
  const paths = memes.flatMap((meme) =>
    locales.map((locale) => ({
      params: { slug: meme.slug },
      locale,
    }))
  );

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params, locale }) {
  const meme = getMemeBySlug(params.slug);

  if (!meme) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      meme,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 60,
  };
}
