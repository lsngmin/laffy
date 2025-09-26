export default function ElevatedNoticePanel({
    eyebrow = "Premium Experience",
    headline = "세련된 시청을 위한 맞춤 안내",
    description = "이 패널에 원하는 메시지를 자유롭게 채워 넣어 주세요. 라피 팀이 마련한 고급 연출과 함께 방문자에게 필요한 정보와 기대감을 전달할 수 있습니다.",
    footnote = "필요에 따라 강조하고 싶은 디테일이나 추가 주석을 이 영역에 덧붙일 수 있습니다.",
}) {
    return (
        <section className="mt-10 rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/75 to-slate-900/40 p-6 shadow-[0_30px_70px_-40px_rgba(15,23,42,0.85)] ring-1 ring-slate-800/70 backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-4 text-left">
                <span className="inline-flex w-fit items-center rounded-full bg-white/5 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
                    {eyebrow}
                </span>
                <div className="space-y-3">
                    <h2 className="text-2xl font-semibold leading-tight text-white sm:text-[28px]">
                        {headline}
                    </h2>
                    <p className="text-[15px] leading-relaxed text-slate-300/95 sm:text-base">
                        {description}
                    </p>
                </div>
                <p className="text-xs font-medium text-slate-400/90">
                    {footnote}
                </p>
            </div>
        </section>
    );
}
