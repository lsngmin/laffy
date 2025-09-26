import Link from "next/link";
import clsx from "clsx";

import { CompassIcon, HeartIcon, EyeIcon, SparkIcon } from "@/components/icons";
import { formatCount, formatRelativeTime, getOrientationClass } from "@/lib/formatters";
import { getDetailHref } from "@/lib/paths";

function buildShowcaseItems(allItems, currentItem, locale) {
    if (!Array.isArray(allItems)) return [];

    return allItems
        .filter((item) => item.slug !== currentItem?.slug)
        .slice(0, 4)
        .map((item) => ({
            ...item,
            aspect: getOrientationClass(item.orientation),
            relativeTime: item.publishedAt ? formatRelativeTime(new Date(item.publishedAt), locale) : null,
        }));
}

export default function SuggestedShowcase({
    t,
    locale,
    allItems,
    currentItem,
    className = "",
}) {
    const showcaseItems = buildShowcaseItems(allItems, currentItem, locale);

    if (showcaseItems.length === 0) return null;

    return (
        <section
            className={clsx(
                "space-y-6 rounded-3xl bg-[radial-gradient(circle_at_bottom,_rgba(14,165,233,0.08),_rgba(15,23,42,0.9))]",
                "p-6 ring-1 ring-slate-800/70 shadow-[0_26px_80px_-45px_rgba(14,165,233,0.45)] sm:p-8",
                className
            )}
        >
            <div className="space-y-3 text-white">
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/90">
                    {t("detail.recommended.badge", "Curated")}
                </div>
                <h2 className="text-2xl font-semibold leading-tight sm:text-[28px]">
                    {t("detail.recommended.title")}
                </h2>
                <p className="text-sm text-slate-300/90">
                    {t("detail.recommended.subtitle")}
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                {showcaseItems.map((item) => (
                    <Link
                        key={`suggested-${item.slug}`}
                        href={getDetailHref(item)}
                        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/5 bg-slate-950/70 ring-1 ring-slate-800/60 transition duration-300 hover:-translate-y-1 hover:border-sky-300/50 hover:ring-sky-300/40"
                    >
                        <div className={clsx("relative w-full overflow-hidden", item.aspect)}>
                            {item.thumbnail ? (
                                <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04] group-hover:brightness-110"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_#0ea5e9_0%,_#0f172a_70%)] text-xs font-semibold text-slate-100">
                                    프리뷰 이미지를 불러오지 못했어요
                                </div>
                            )}
                            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100">
                                <CompassIcon className="h-3.5 w-3.5" />
                                {item.type === "image"
                                    ? t("meta.image")
                                    : item.type === "video"
                                        ? t("meta.video")
                                        : t("meta.thread")}
                            </span>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-5">
                            <h3 className="text-lg font-semibold leading-snug text-white line-clamp-2">
                                {item.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-slate-300/90 line-clamp-2">
                                {item.description}
                            </p>
                            <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-slate-300/80">
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
    );
}
