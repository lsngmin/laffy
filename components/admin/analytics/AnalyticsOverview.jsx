export default function AnalyticsOverview({
  itemCount,
  totals,
  averageLikeRate,
  formatNumber,
  formatPercent,
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">콘텐츠</p>
        <p className="mt-2 text-2xl font-bold text-white">{formatNumber(itemCount)}</p>
        <p className="mt-1 text-xs text-slate-500">등록된 메타 파일 수</p>
      </div>
      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">총 조회수</p>
        <p className="mt-2 text-2xl font-bold text-white">{formatNumber(totals.views)}</p>
        <p className="mt-1 text-xs text-slate-500">metrics 기준 누적</p>
      </div>
      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">평균 좋아요율</p>
        <p className="mt-2 text-2xl font-bold text-white">{formatPercent(averageLikeRate)}</p>
        <p className="mt-1 text-xs text-slate-500">조회가 있는 콘텐츠 평균</p>
      </div>
    </div>
  );
}
