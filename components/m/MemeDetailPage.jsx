import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import { useTranslation } from "next-i18next";
import Link from "next/link";
import clsx from "clsx";

import { LikeButton, ShareButton, LocaleSwitchButton, BookmarkButton } from "@/components/button";
import { BookmarkLink, BackToFeedLink } from "@/components/link";
import { useLikes } from "@/hooks/useLikes";
import { formatCount, formatRelativeTime, getOrientationClass } from "@/lib/formatters";
import { loadFavorites, toggleFavoriteSlug } from "@/utils/storage";
import VideoCard from "@/components/m/video/VideoCard";
import TitleNameHead from "@/components/m/TitleNameHead";
import LogoText from "@/components/LogoText";
import RecommendedMemes from "@/components/m/RecommendedMemes";
import BannerAdsMonetag from "@/components/ads/BannerAdsMonetag";

export default function MemeDetailPage({
  meme,
  allMemes,
  disableVideo = false,
  hideBackToFeed = false,
  backSlot = null,
  showRecommended = true,
  recommendSlot = null,
  onPreviewClick,
  belowVideoSlot = null,
  afterArticleSlot = null,
  onCtaClick,
}) {
  const { t, i18n } = useTranslation("common");
  const { isLiked, setLikedState, ready: likesReady } = useLikes();

  const [isFavorite, setIsFavorite] = useState(false);
  const [serverCounts, setServerCounts] = useState({ views: null, likes: null });

  if (!meme) return null;

  const locale = i18n.language || "en";
  const mediaAspect = getOrientationClass(meme.orientation);
  const publishedDate = meme.publishedAt ? new Date(meme.publishedAt) : null;
  const relativeTime = publishedDate ? formatRelativeTime(publishedDate, locale) : null;
  const liked = isLiked(meme.slug);

  const likesDisplay = formatCount(serverCounts.likes ?? meme.likes, locale);
  const viewsDisplay = formatCount(serverCounts.views ?? meme.views, locale);

  // Safe meta values for social preview (length/whitespace)
  const safeTitle = String(meme?.title || 'Laffy')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 70);
  const safeDesc = String(meme?.description || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 200);

  useEffect(() => {
    setIsFavorite(loadFavorites().includes(meme.slug));

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/metrics/view", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug: meme.slug }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const views = typeof data?.views === 'number' ? data.views : meme.views;
        const likes = typeof data?.likes === 'number' ? data.likes : meme.likes;
        setServerCounts({ views, likes });
        if (typeof data?.liked === 'boolean') {
          setLikedState(meme.slug, data.liked);
        }
      } catch {
        // 무시
      }
    })();

    return () => { cancelled = true; };
  }, [meme.slug, meme.views, meme.likes, setLikedState]);

  const handleToggleFavorite = () => {
    const updated = toggleFavoriteSlug(meme.slug);
    setIsFavorite(updated.includes(meme.slug));
  };

  const handleToggleLike = async () => {
    const prevLiked = liked;
    const nextLiked = !prevLiked;
    const prevLikesCount = typeof serverCounts.likes === 'number' ? serverCounts.likes : meme.likes;

    setLikedState(meme.slug, nextLiked);
    setServerCounts((s) => ({
      ...s,
      likes: Math.max(0, prevLikesCount + (nextLiked ? 1 : -1)),
    }));

    try {
      const res = await fetch("/api/metrics/like", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: meme.slug, liked: nextLiked }),
      });
      if (!res.ok) throw new Error('like_failed');
      const data = await res.json();
      const resolvedLikes = typeof data?.likes === 'number' ? data.likes : prevLikesCount;
      setServerCounts((s) => ({ ...s, likes: resolvedLikes }));
      if (typeof data?.liked === 'boolean') {
        setLikedState(meme.slug, data.liked);
      }
    } catch {
      setLikedState(meme.slug, prevLiked);
      setServerCounts((s) => ({ ...s, likes: prevLikesCount }));
    }
  };

  const handlePreviewClick = useCallback(() => {
    onPreviewClick?.();
  }, [onPreviewClick]);

  const handleCtaClick = useCallback(() => {
    onCtaClick?.();
  }, [onCtaClick]);

  const navItems = useMemo(
    () => [
      { key: "spotlight", label: t("nav.spotlight", "Spotlight"), href: "/m" },
      { key: "trending", label: t("nav.trending", "Trending"), href: "/m?filter=trending" },
      { key: "fresh", label: t("nav.fresh", "Fresh Drops"), href: "/m?filter=fresh" },
      { key: "feelgood", label: t("nav.feelgood", "Feel Good"), href: "/m?filter=feelgood" },
      { key: "loops", label: t("nav.loops", "Silky Loops"), href: "/m?filter=loops" },
      { key: "random", label: t("nav.random", "Shuffle"), href: "/m?filter=random" },
    ],
    [t]
  );

  const rawActiveKey = typeof meme?.category === "string" ? meme.category.toLowerCase() : "";
  const fallbackActiveKey = navItems[0]?.key || "";
  const activeCategoryKey = navItems.some((item) => item.key === rawActiveKey)
    ? rawActiveKey
    : fallbackActiveKey;

  return (
    <>
      {/* Basic title/description */}
      <TitleNameHead title={meme.title} description={meme.description} />
      {/* SEO: canonical, hreflang, JSON-LD (injected by pages via props if present) */}
      {meme.__seo && (
        <Head>
          {meme.__seo.canonicalUrl && (
            <link rel="canonical" href={meme.__seo.canonicalUrl} />
          )}
          {Array.isArray(meme.__seo.hreflangs) &&
            meme.__seo.hreflangs.map((alt) => (
              <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
            ))}
          {meme.__seo.jsonLd && (
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(meme.__seo.jsonLd) }} />
          )}
          {/* Minimal OpenGraph/Twitter for stable image preview on Twitter */}
          {meme.__seo.metaImage && (
            <>
              <meta property="og:image" content={meme.__seo.metaImage} />
              <meta property="og:title" content={safeTitle} />
              {safeDesc && <meta property="og:description" content={safeDesc} />}
              <meta name="twitter:card" content="summary_large_image" />
              <meta name="twitter:image" content={meme.__seo.metaImage} />
              <meta name="twitter:title" content={safeTitle} />
              {safeDesc && <meta name="twitter:description" content={safeDesc} />}
            </>
          )}
        </Head>
      )}

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6">
          {/*<div className="flex items-center justify-between text-xs text-slate-300">*/}
          {/*  <BookmarkLink label={t("favorites.cta")} />*/}
          {/*  <LocaleSwitchButton locale={locale} />*/}
          {/*</div>*/}

          <div className="mt-6 mb-3 text-center">
            <LogoText size={'3xl'} />
          </div>

          {navItems.length > 0 && (
            <nav className="relative mx-auto mb-6 max-w-3xl" aria-label={t("nav.label", "Meme navigation")}>
              <div className="relative rounded-3xl bg-slate-900/60 px-3 py-2 shadow-inner shadow-black/30 ring-1 ring-white/5">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-3xl bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" aria-hidden="true" />
                <span className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-3xl bg-gradient-to-l from-slate-950 via-slate-950/70 to-transparent" aria-hidden="true" />
                <ul className="flex snap-x snap-mandatory items-center gap-2 overflow-x-auto text-sm text-slate-300">
                  {navItems.map((item) => {
                    const active = item.key === activeCategoryKey;
                    return (
                      <li key={item.key} className="snap-start">
                        <Link
                          href={item.href}
                          prefetch={false}
                          className={clsx(
                            "inline-flex items-center whitespace-nowrap rounded-full px-4 py-2 font-semibold transition",
                            active
                              ? "bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 text-slate-950 shadow-[0_10px_32px_rgba(56,189,248,0.25)]"
                              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </nav>
          )}
          <BannerAdsMonetag />

          {hideBackToFeed ? (backSlot ?? null) : (
            <BackToFeedLink href="/m" label={t("backToFeed")} />
          )}

          <article className="mt-6 space-y-7 rounded-3xl bg-slate-900/80 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] ring-1 ring-slate-800/70 sm:p-9">
            <header className="space-y-4">
              <h1 className="text-2xl font-bold leading-snug text-white sm:text-[30px]">{meme.description}</h1>
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
                mediaType={meme.type}
                disablePlay={disableVideo}
                onPreviewClick={handlePreviewClick}
              />
              {disableVideo && (
                <div className="mt-8 flex w-full justify-center">
                  <a
                    href="https://otieu.com/4/9924601"
                    target="_blank"
                    rel="noopener"
                    onClick={handleCtaClick}
                    className="inline-flex items-center gap-3 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-7 py-3 text-base font-semibold text-white shadow-[0_16px_40px_rgba(79,70,229,0.45)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-200 hover:brightness-110 active:scale-95 sm:px-9 sm:py-3.5 sm:text-lg"
                    aria-label="스폰서 링크로 이동"
                  >
                    ▶ 재생이 안되면 여기를 클릭
                  </a>
                </div>
              )}
              {belowVideoSlot}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LikeButton
                    liked={liked}
                    onToggle={handleToggleLike}
                    disabled={!likesReady}
                    t={t}
                    meme={meme}
                    context="detail_main"
                  />
                  <BookmarkButton
                    isFavorite={isFavorite}
                    onToggle={handleToggleFavorite}
                    t={t}
                    meme={meme}
                    context="detail_main"
                  />
                </div>

                <ShareButton t={t} meme={meme} context="detail_main" />

              </div>
            </div>
          </article>

          {afterArticleSlot}

          {showRecommended ? (
            <RecommendedMemes t={t} locale={locale} allMemes={allMemes} meme={meme} />
          ) : (
            recommendSlot ?? null
          )}
        </main>
      </div>
    </>
  );
}
