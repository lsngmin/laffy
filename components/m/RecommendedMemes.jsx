import Link from "next/link";
import { CompassIcon, HeartIcon, EyeIcon, SparkIcon } from "../icons";
import { formatCount, formatRelativeTime, getOrientationClass } from "@/lib/formatters";
import { getDetailHref } from "@/lib/paths";

export default function RecommendedMemes({t, locale, allMemes, meme }) {
    const recommendedMemes = allMemes
        ?.filter((item) => item.slug !== meme.slug)
        .slice(0, 3)
        .map((item) => ({
            ...item,
            aspect: getOrientationClass(item.orientation),
            relativeTime: item.publishedAt ? formatRelativeTime(new Date(item.publishedAt), locale) : null,
        })) ?? [];

    if (!recommendedMemes || recommendedMemes.length === 0) return null;

    return (
        <section className="mt-10 space-y-4 rounded-3xl bg-slate-900/70 p-5 ring-1 ring-slate-800/80 sm:p-7">
            <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    {t("detail.recommended.title")}
                </h2>
                <p className="text-sm text-slate-300">
                    {t("detail.recommended.subtitle")}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {recommendedMemes.map((item) => (
                    <Link
                        key={`recommended-${item.slug}`}
                        href={getDetailHref(item)}
                        className="group flex flex-col overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/80 transition hover:-translate-y-1 hover:ring-indigo-400/60"
                    >
                        <div
                            className={`relative w-full ${item.aspect} overflow-hidden bg-slate-950/60`}
                        >
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
                                {item.type === "image"
                                    ? t("meta.image")
                                    : item.type === "video"
                                      ? t("meta.video")
                                      : t("meta.thread")}
              </span>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-4">
                            <h3 className="text-base font-semibold leading-snug text-white line-clamp-2">
                                {item.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-slate-300 line-clamp-2">
                                {item.description}
                            </p>
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
    );
}
