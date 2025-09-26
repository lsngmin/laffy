import clsx from "clsx";

export default function DetailNoticePanel({ className = "" }) {
    return (
        <section
            className={clsx(
                "overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_rgba(15,23,42,0.9))]",
                "p-8 ring-1 ring-slate-800/60 shadow-[0_24px_70px_-40px_rgba(79,70,229,0.75)]",
                "backdrop-blur",
                className
            )}
        >
            <div className="flex flex-col gap-6 text-slate-100">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-300/90">
                            Premium Insight
                        </p>
                        <h2 className="text-2xl font-semibold leading-tight text-white sm:text-[28px]">
                            안내 문구가 들어갈 공간입니다
                        </h2>
                    </div>
                    <div className="rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200">
                        커스터마이징 가능
                    </div>
                </div>

                <p className="text-sm leading-relaxed text-slate-300/90">
                    여기에 고급스러운 안내 문장을 자유롭게 적어주세요. 브랜드만의 톤 앤 매너를 담아 강조할 메시지를 전달하면 더욱 돋보입니다.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                        <p className="text-sm font-semibold text-white">첫 번째 하이라이트</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300/80">
                            원하는 핵심 정보를 강조할 수 있는 카드입니다. 문구는 자유롭게 수정하실 수 있어요.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
                        <p className="text-sm font-semibold text-white">두 번째 하이라이트</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300/80">
                            이용 안내, 프로모션, 또는 특별한 혜택 등 무엇이든 우아하게 표현하세요.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
