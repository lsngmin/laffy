export default function AdsterraSummaryCards({ totals, formatNumber, formatDecimal }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">총 노출수</p>
        <p className="mt-2 text-2xl font-bold text-white">{formatNumber(totals.impressions)}</p>
        <p className="mt-1 text-xs text-slate-500">선택한 기간 · 필터 기준 합계</p>
      </div>
      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">총 클릭수</p>
        <p className="mt-2 text-2xl font-bold text-white">{formatNumber(totals.clicks)}</p>
        <p className="mt-1 text-xs text-slate-500">필터 기준 평균 CTR {formatDecimal(totals.ctr, 2)}%</p>
      </div>
      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">총 수익 (USD)</p>
        <p className="mt-2 text-2xl font-bold text-white">{formatDecimal(totals.revenue, 3)}</p>
        <p className="mt-1 text-xs text-slate-500">필터 기준 평균 CPM {formatDecimal(totals.cpm, 3)}</p>
      </div>
    </div>
  );
}
