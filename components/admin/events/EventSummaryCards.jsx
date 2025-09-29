const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function formatKstDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const iso = kst.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
}

export default function EventSummaryCards({ totals, formatNumber }) {
  const visitCount = Number(totals?.visitCount ?? totals?.count) || 0;
  const uniqueSessions = Number(totals?.uniqueSessions) || 0;
  const lastVisit = formatKstDateTime(totals?.lastVisitAt || totals?.lastTimestamp);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 shadow-inner shadow-black/30">
        <p className="text-xs uppercase tracking-[0.3em] text-violet-200">총 방문수</p>
        <p className="mt-2 text-3xl font-bold text-white">{formatNumber(visitCount)}</p>
        <p className="mt-1 text-xs text-violet-100/70">l_visit 이벤트 누적 합계</p>
      </div>
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-inner shadow-black/30">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">순 방문자수</p>
        <p className="mt-2 text-3xl font-bold text-white">{formatNumber(uniqueSessions)}</p>
        <p className="mt-1 text-xs text-emerald-100/70">세션 ID 기준 고유 방문</p>
      </div>
      <div className="rounded-2xl border border-slate-800/60 bg-slate-950/50 p-4 shadow-inner shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">최근 방문 시간</p>
        <p className="mt-2 text-xl font-semibold text-white">{lastVisit}</p>
        <p className="mt-1 text-xs text-slate-400">KST 기준</p>
      </div>
    </div>
  );
}
