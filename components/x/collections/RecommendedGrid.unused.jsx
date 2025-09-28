import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { formatRelativeTime, getOrientationClass } from "@/lib/formatters";
import { getDetailHref } from "@/lib/paths";

// NOTE: This component is currently archived and not used in production.
//       We are keeping it around for potential reuse in the future.

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
                const preview = item.thumbnail || item.poster || item.image;
                return {
                    ...item,
                    aspect,
                    relativeTime,
                    preview,
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

            <div className="flex flex-col gap-5">
                {curatedItems.map((item) => (
                    <Link
                        key={`curated-${item.slug}`}
                        href={getDetailHref(item)}
                        className="group flex flex-col gap-5 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-5 transition duration-300 hover:-translate-y-1 hover:border-indigo-400/60 hover:shadow-[0_25px_60px_-40px_rgba(99,102,241,0.55)] sm:flex-row sm:items-center sm:p-6"
                    >
                        <div className={`relative w-full overflow-hidden rounded-2xl bg-slate-950/70 sm:w-64 ${item.aspect}`}>
                            {item.preview ? (
                                <img
                                    src={item.preview}
                                    alt={item.title || item.description || "recommended"}
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_#6366f1_0%,_#0f172a_70%)] text-xs font-semibold text-slate-100">
                                    {t("detail.recommended.noPreview", "미리보기 이미지 없음")}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-1 flex-col justify-center gap-3">
                            <h3 className="text-lg font-semibold leading-tight text-white line-clamp-2">
                                {item.description || item.title}
                            </h3>
                            {item.relativeTime && (
                                <p className="text-sm font-medium text-slate-300">
                                    {t("detail.recommended.relativeTime", "업로드: {{time}}", { time: item.relativeTime })}
                                </p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
