import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "next-i18next";

import { LikeButton, ShareButton, BookmarkButton } from "@/components/x/button";
import { useLikes } from "@/hooks/useLikes";
import useHeatmapTracker from "@/hooks/useHeatmapTracker";
import { formatCount, formatRelativeTime, getOrientationClass } from "@/lib/formatters";
import { loadFavorites } from "@/utils/storage";
import VideoCard from "@/components/x/video/VideoCard";
import TitleNameHead from "@/components/x/TitleNameHead";
import LogoText from "@/components/LogoText";
import CategoryNavigation from "./CategoryNavigation";
import dynamic from "next/dynamic";
import { SPONSOR_SMART_LINK_URL } from "@/components/x/ads/constants";
import ImageSocialMeta from "@/components/x/meta/ImageSocialMeta";
import ElevatedNoticePanel from "./ElevatedNoticePanel";
import RecommendedGrid from "@/components/x/collections/RecommendedGrid";

const RelishInvokeAd = dynamic(() => import("@/components/x/ads/RelishInvokeAd"), { ssr: false });

export default function ContentDetailPage({
  meme,
  disableVideo = false,
  onPreviewEngaged,
  onCtaClick,
  allMemes,
}) {
  const { t, i18n } = useTranslation("common");
  const { isLiked, setLikedState, ready: likesReady } = useLikes();
  const heatmapSlug = typeof meme?.slug === "string" ? meme.slug : "";
  const { trackZoneEvent } = useHeatmapTracker({ slug: heatmapSlug, enabled: Boolean(heatmapSlug) });
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

  const handleCtaClick = useCallback(() => {
    trackZoneEvent("cta_primary", "click");
    onCtaClick?.();
  }, [onCtaClick, trackZoneEvent]);

  const openSmartLink = useCallback(() => {
    trackZoneEvent("category_nav", "sponsor_redirect");
    try { window.location.href = SPONSOR_SMART_LINK_URL; } catch {}
  }, [trackZoneEvent]);

  const handlePreviewEngaged = useCallback(() => {
    trackZoneEvent("video_overlay", "engagement");
    onPreviewEngaged?.();
  }, [onPreviewEngaged, trackZoneEvent]);

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
      <TitleNameHead title={meme.description} />
      {/* SEO: canonical, hreflang, JSON-LD (injected by pages via props if present) */}
      {meme.__seo && (
        <ImageSocialMeta seo={meme.__seo} title={safeTitle} description={safeDesc} />
      )}

      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <main
          className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10 sm:px-6"
          data-heatmap-zone="detail_main"
        >
          <div className="mt-6 mb-6 text-center">
            <LogoText size={"4xl"}/>
          </div>

          <CategoryNavigation
            items={navItems}
            activeKey={activeCategoryKey}
            onItemClick={openSmartLink}
            ariaLabel={t("nav.label", "navigation")}
          />

          <article
            className="mt-6 space-y-7 rounded-3xl bg-slate-900/80 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] ring-1 ring-slate-800/70 sm:p-9"
            data-heatmap-zone="detail_article"
          >
            <header className="space-y-4">
              <h1 className="text-2xl font-bold leading-snug text-white sm:text-[30px]">{meme.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-slate-300/90">
                {relativeTime && <span>{`${t("meta.postedLabel")}: ${relativeTime}`}</span>}
                {viewsDisplay && <span>{`${t("meta.viewsLabel")}: ${viewsDisplay}`}</span>}
                {likesDisplay && <span>{`${t("meta.likesLabel")}: ${likesDisplay}`}</span>}
              </div>
            </header>

            <div data-heatmap-zone="video_section">
              <VideoCard
                poster={meme.poster}
                title={meme.description}
                aspect={mediaAspect}
                slug={meme.slug}
                disablePlay={disableVideo}
                onEngagement={handlePreviewEngaged}
                durationSeconds={meme.durationSeconds}
              />
              <div className="mt-8 flex w-full justify-center">
                <a
                  href={SPONSOR_SMART_LINK_URL}
                  target="_blank"
                  rel="noopener"
                  onClick={handleCtaClick}
                  data-heatmap-zone="cta_primary"
                  className="inline-flex items-center gap-3 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 px-7 py-3 text-base font-semibold text-white shadow-[0_16px_40px_rgba(79,70,229,0.45)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-200 hover:brightness-110 active:scale-95 sm:px-9 sm:py-3.5 sm:text-lg"
                  aria-label="스폰서 링크로 이동"
                >
                  ▶ 재생이 안되면 여기를 클릭
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-4" data-heatmap-zone="social_bar">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LikeButton
                    liked={liked}
                    likesReady={likesReady}
                    t={t}
                    meme={meme}
                    context="detail_main"
                    serverCounts={serverCounts}
                    setServerCounts={setServerCounts}
                    setLikedState={setLikedState}
                  />
                  <BookmarkButton
                    isFavorite={isFavorite}
                    setIsFavorite={setIsFavorite}
                    t={t}
                    meme={meme}
                    context="detail_main"
                  />
                </div>

                <ShareButton t={t} meme={meme} context="detail_main" />

              </div>
            </div>
          </article>

          <div className="mt-8 flex justify-center" data-heatmap-zone="sponsor_secondary">
            <RelishInvokeAd />
          </div>
          <div data-heatmap-zone="notice_panel">
            <ElevatedNoticePanel />
          </div>

          <div data-heatmap-zone="recommended_grid">
            <RecommendedGrid
              t={t}
              locale={locale}
              items={allMemes}
              currentSlug={meme.slug}
            />
          </div>
        </main>
      </div>
    </>
  );
}
