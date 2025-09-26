import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import { useTranslation } from "next-i18next";

import { LikeButton, ShareButton, LocaleSwitchButton, BookmarkButton } from "@/components/button";
import { BookmarkLink, BackToFeedLink } from "@/components/link";
import { useLikes } from "@/hooks/useLikes";
import { formatCount, formatRelativeTime, getOrientationClass } from "@/lib/formatters";
import { loadFavorites, toggleFavoriteSlug } from "@/utils/storage";
import VideoCard from "@/components/x/video/VideoCard";
import TitleNameHead from "@/components/m/TitleNameHead";
import LogoText from "@/components/LogoText";
import RecommendedMemes from "@/components/m/RecommendedMemes";
import dynamic from "next/dynamic";
import CategoryNavigation from "./CategoryNavigation";

const BannerRect = dynamic(() => import("@/components/ads/RelishAtOptionsFrame"), { ssr: false });

export default function ContentDetailPage({
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
  const SMART_LINK_URL = "https://otieu.com/4/9924601";

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
  const safeTitle = String(meme?.title || "Laffy")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 70);
  const safeDesc = String(meme?.description || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
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
        const views = typeof data?.views === "number" ? data.views : meme.views;
        const likes = typeof data?.likes === "number" ? data.likes : meme.likes;
        setServerCounts({ views, likes });
        if (typeof data?.liked === "boolean") {
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
    const prevLikesCount = typeof serverCounts.likes === "number" ? serverCounts.likes : meme.likes;

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
      if (!res.ok) throw new Error("like_failed");
      const data = await res.json();
      const resolvedLikes = typeof data?.likes === "number" ? data.likes : prevLikesCount;
      setServerCounts((s) => ({ ...s, likes: resolvedLikes }));
      if (typeof data?.liked === "boolean") {
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

  const openSmartLink = useCallback(() => {
    try { window.location.href = SMART_LINK_URL; } catch {}
  }, []);

  const navItems = useMemo(
    () => [
      { key: "spotlight", label: t("nav.spotlight", "한국야동"), href: "/x" },
      { key: "trending", label: t("nav.trending", "트위터야동"), href: "/x?filter=trending" },
      { key: "fresh", label: t("nav.fresh", "BJ야동"), href: "/x?filter=fresh" },
      { key: "feelgood", label: t("nav.feelgood", "일본야동"), href: "/x?filter=feelgood" },
      { key: "loops", label: t("nav.loops", "중국야동"), href: "/x?filter=loops" },
      { key: "random", label: t("nav.random", "인기순"), href: "/x?filter=random" },
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

          <div className="mt-6 mb-6 text-center">
            <LogoText size={"5xl"} className="tracking-[0.4em]" />
          </div>

          <CategoryNavigation
            items={navItems}
            activeKey={activeCategoryKey}
            onItemClick={openSmartLink}
            ariaLabel={t("nav.label", "Meme navigation")}
          />

          <div className="mt-6 flex justify-center">
            <BannerRect width={300} height={250} />
          </div>

          {hideBackToFeed ? (backSlot ?? null) : (
            <BackToFeedLink href="/x" label={t("backToFeed")} />
          )}

          <article className="mt-6 space-y-7 rounded-3xl bg-slate-900/80 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] ring-1 ring-slate-800/70 sm:p-9">
            <header className="space-y-4">
              <h1 className="text-2xl font-bold leading-snug text-white sm:text-[30px]">{meme.description}</h1>
              <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-slate-300/90">
                {relativeTime && <span>{`${t("meta.postedLabel")}: ${relativeTime}`}</span>}
                {viewsDisplay && <span>{`${t("meta.viewsLabel")}: ${viewsDisplay}`}</span>}
                {likesDisplay && <span>{`${t("meta.likesLabel")}: ${likesDisplay}`}</span>}
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
                durationSeconds={meme.durationSeconds}
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
