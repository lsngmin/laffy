import Link from "next/link";

import { CompassIcon, HeartIcon, EyeIcon, SparkIcon } from "@/components/icons";
import { formatCount, formatRelativeTime, getOrientationClass } from "@/lib/formatters";
import { getDetailHref } from "@/lib/paths";

export default function CuratedHighlights({ t, locale, items, currentSlug }) {
    const candidates = Array.isArray(items) ? items : [];

    const curatedItems = candidates
        .filter((item) => item && item.slug && item.slug !== currentSlug)
        .slice(0, 4)
        .map((item) => ({
            ...item,
            aspect: getOrientationClass(item.orientation),
            relativeTime: item.publishedAt ? formatRelativeTime(new Date(item.publishedAt), locale) : null,
        }));

    if (curatedItems.length === 0) {
        return null;
    }

    return (
        <section className="mt-12 space-y-6 rounded-3xl bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-slate-900/40 p-6 ring-1 ring-slate-800/70 backdrop-blur-xl shadow-[0_35px_80px_-45px_rgba(15,23,42,0.85)] sm:p-9">
            <header className="space-y-3 text-left">
                <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-indigo-200/80">
                    {t("detail.recommended.eyebrow", "Handpicked For You")}
                </p>
                <div className="space-y-2">
                    <h2 className="text-[26px] font-semibold leading-snug text-white sm:text-[30px]">
                        {t("detail.recommended.title")}
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-300/90 sm:text-base">
                        {t("detail.recommended.subtitle")}
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2">
                {curatedItems.map((item) => (
                    <Link
                        key={`curated-${item.slug}`}
                        href={getDetailHref(item)}
                        className="group flex flex-col overflow-hidden rounded-3xl bg-slate-950/50 ring-1 ring-slate-800/70 transition duration-300 hover:-translate-y-1 hover:shadow-[0_25px_60px_-40px_rgba(99,102,241,0.55)] hover:ring-indigo-400/60"
                    >
                        <div className={`relative w-full ${item.aspect} overflow-hidden bg-slate-950/70`}>
                            {item.thumbnail ? (
                                <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_#6366f1_0%,_#0f172a_70%)] text-xs font-semibold text-slate-100">
                                    {t("detail.recommended.noPreview", "미리보기 이미지 없음")}
                                </div>
                            )}
                            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-100 shadow-lg backdrop-blur">
                                <CompassIcon className="h-3.5 w-3.5" />
                                {item.type === "image"
                                    ? t("meta.image")
                                    : item.type === "video"
                                      ? t("meta.video")
                                      : t("meta.thread")}
                            </span>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-5">
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold leading-tight text-white line-clamp-2">
                                    {item.title}
                                </h3>
                                <p className="text-sm leading-relaxed text-slate-300/90 line-clamp-2">
                                    {item.description}
                                </p>
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
