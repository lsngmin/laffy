export default function EventSummaryCards({ totals, formatNumber }) {
  const totalCount = Number(totals?.count) || 0;
  const uniqueSessions = Number(totals?.uniqueSessions) || 0;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">총 이벤트 수</p>
        <p className="mt-2 text-3xl font-bold text-white">{formatNumber(totalCount)}</p>
        <p className="mt-1 text-xs text-slate-500">선택한 기간 동안 수집된 이벤트 합계</p>
      </div>
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">고유 세션</p>
        <p className="mt-2 text-3xl font-bold text-white">{formatNumber(uniqueSessions)}</p>
        <p className="mt-1 text-xs text-slate-500">동일 기간 내 이벤트를 발생시킨 고유 세션 수</p>
      </div>
      <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4 shadow-lg shadow-emerald-500/20">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">평균 이벤트 수/세션</p>
        <p className="mt-2 text-3xl font-bold text-emerald-100">
          {uniqueSessions > 0 ? (totalCount / uniqueSessions).toFixed(2) : '0.00'}
        </p>
        <p className="mt-1 text-xs text-emerald-200/80">고유 세션 대비 이벤트 발생량</p>
      </div>
    </div>
  );
}
