import { SparkIcon } from "@/components/icons";

const DownloadIcon = ({ className = "h-4 w-4" }) => (
    <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M12 3v12" />
        <path d="m7 11 5 5 5-5" />
        <path d="M5 18h14" />
    </svg>
);

export default function ElevatedNoticePanel({
    eyebrow = "Premium Insight",
    headline = "부드러운 감상을 위한 안내",
    description = "트위터 웹뷰에서는 영상이 간헐적으로 끊기거나 음성이 지연될 수 있어요. 외부 브라우저로 열면 선명한 화질과 안정적인 재생을 확인할 수 있습니다.",
    highlights = [
        {
            icon: SparkIcon,
            title: "1080p Ultra Stream",
            body: "외부 브라우저에서 즉시 1080p 화질을 활용해 끊김 없는 감상을 즐겨보세요.",
        },
        {
            icon: DownloadIcon,
            title: "Crystal Download",
            body: "최고 화질 그대로 저장할 수 있는 전용 다운로드 옵션도 함께 준비되어 있습니다.",
        },
    ],
    footnote = "트위터 인앱 재생이 답답할 때는 상단 버튼으로 이동해 안정적인 스트리밍과 다운로드 환경을 이용해 주세요.",
}) {
    const safeHighlights = Array.isArray(highlights) ? highlights.filter(Boolean) : [];

    return (
        <section className="mt-10 rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/75 to-slate-900/40 p-6 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.85)] ring-1 ring-slate-800/70 backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-6 text-left">
                <span className="inline-flex w-fit items-center rounded-full bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200/90">
                    {eyebrow}
                </span>
                <div className="space-y-3">
                    <h2 className="text-2xl font-semibold leading-tight text-white sm:text-[28px]">
                        {headline}
                    </h2>
                    <p className="text-[15px] leading-relaxed text-slate-200/90 sm:text-base">
                        {description}
                    </p>
                </div>
                {safeHighlights.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {safeHighlights.slice(0, 2).map((item, index) => {
                            const Icon = item.icon || SparkIcon;
                            return (
                                <div
                                    key={`premium-highlight-${index}`}
                                    className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition duration-300 hover:border-indigo-300/60 hover:bg-white/[0.06]"
                                >
                                    <span className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-wide text-indigo-200/90">
                                        <Icon className="h-5 w-5" />
                                        {item.title}
                                    </span>
                                    <p className="text-sm leading-relaxed text-slate-200/85">
                                        {item.body}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
                <p className="text-xs font-medium text-slate-400/90">
                    {footnote}
                </p>
            </div>
        </section>
    );
}
