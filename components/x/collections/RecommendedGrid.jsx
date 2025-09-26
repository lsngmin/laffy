import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { HeartIcon, EyeIcon, SparkIcon } from "@/components/icons";
import { formatCount, formatRelativeTime, getOrientationClass } from "@/lib/formatters";
import { getDetailHref } from "@/lib/paths";

function toNumber(candidate) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
        return candidate;
    }
    if (typeof candidate === "string") {
        const parsed = Number(candidate);
        if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
}

function pickMetric(item, keys) {
    for (const key of keys) {
        const value = key.split(".").reduce((acc, segment) => {
            if (acc && typeof acc === "object" && segment in acc) {
                return acc[segment];
            }
            return undefined;
        }, item);
        const numeric = toNumber(value);
        if (numeric !== null) {
            return numeric;
        }
    }
    return 0;
}

export default function RecommendedGrid({ t, locale, items, currentSlug }) {
    const selectItems = useMemo(
        () => (source) => {
            const candidates = Array.isArray(source) ? source : [];
            const filtered = candidates.filter((item) => item && item.slug && item.slug !== currentSlug);
            const randomized = filtered
                .map((item) => ({ value: item, sortKey: Math.random() }))
                .sort((a, b) => a.sortKey - b.sortKey)
                .slice(0, 4)
                .map(({ value }) => value);

            return randomized.map((item) => {
                const aspect = getOrientationClass(item.orientation);
                const relativeTime = item.publishedAt ? formatRelativeTime(new Date(item.publishedAt), locale) : null;
                const likes = pickMetric(item, [
                    "likes",
                    "metrics.likes",
                    "metrics.likeCount",
                    "stats.likes",
                    "stats.likeCount",
                    "engagement.likes",
                ]);
                const views = pickMetric(item, [
                    "views",
                    "metrics.views",
                    "metrics.viewCount",
                    "stats.views",
                    "stats.viewCount",
                    "engagement.views",
                ]);
                const preview = item.thumbnail || item.poster || item.image;
                return {
                    ...item,
                    aspect,
                    relativeTime,
                    preview,
                    likes,
                    views,
                };
            });
        },
        [currentSlug, locale]
    );

    const [curatedItems, setCuratedItems] = useState(() => selectItems(items));

    useEffect(() => {
        setCuratedItems(selectItems(items));
    }, [items, selectItems]);

    if (curatedItems.length === 0) {
        return null;
    }

    return (
        <section className="mt-12 space-y-6 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-900/45 p-6 ring-1 ring-slate-800/70 backdrop-blur-xl shadow-[0_35px_80px_-45px_rgba(15,23,42,0.85)] sm:p-9">
            <header className="space-y-3 text-left">
                <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-indigo-200/80">
                    {t("detail.recommended.eyebrow", "Handpicked Selection")}
                </p>
                <h2 className="text-[26px] font-semibold leading-snug text-white sm:text-[30px]">
                    {t("detail.recommended.title", "연관 동영상")}
                </h2>
            </header>

            <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2">
                {curatedItems.map((item) => (
                    <Link
                        key={`curated-${item.slug}`}
                        href={getDetailHref(item)}
                        className="group flex flex-col overflow-hidden rounded-3xl bg-slate-950/50 ring-1 ring-slate-800/70 transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_-40px_rgba(99,102,241,0.55)] hover:ring-indigo-400/60"
                    >
                        <div className={`relative w-full ${item.aspect} overflow-hidden bg-slate-950/70`}>
                            {item.preview ? (
                                <img
                                    src={item.preview}
                                    alt={item.title || item.description || "recommended"}
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_#6366f1_0%,_#0f172a_70%)] text-xs font-semibold text-slate-100">
                                    {t("detail.recommended.noPreview", "미리보기 이미지 없음")}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-5">
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold leading-tight text-white line-clamp-2">
                                    {item.description || item.title}
                                </h3>
                            </div>
                            <div className="mt-auto flex flex-wrap items-center gap-3 text-[13px] font-medium text-slate-400/95">
                                <span className="inline-flex items-center gap-1 text-rose-200/90">
                                    <HeartIcon className="h-4 w-4" />
                                    {formatCount(item.likes, locale)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <EyeIcon className="h-4 w-4" />
                                    {formatCount(item.views, locale)}
                                </span>
                                {item.relativeTime && (
                                    <span className="inline-flex items-center gap-1 text-indigo-200/90">
                                        <SparkIcon className="h-4 w-4" />
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
