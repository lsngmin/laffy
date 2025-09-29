const LAST_VISIT_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function formatLastVisit(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '기록 없음';
  try {
    return LAST_VISIT_FORMATTER.format(new Date(timestamp));
  } catch {
    return '기록 없음';
  }
}

export default function EventSummaryCards({ totals, formatNumber }) {
  const totalCount = Number(totals?.count) || 0;
  const uniqueSessions = Number(totals?.uniqueSessions ?? totals?.visitors) || 0;
  const lastTimestamp = Number(totals?.lastTimestamp) || 0;
  const granularity = typeof totals?.granularity === 'string' ? totals.granularity : 'day';

  const granularityLabel =
    {
      '10m': '10분 간격으로 집계된 방문 수',
      day: '일별로 집계된 방문 수',
      week: '주별로 집계된 방문 수',
      month: '월별로 집계된 방문 수',
    }[granularity] || '집계된 방문 수';

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">총 방문수</p>
        <p className="mt-2 text-3xl font-bold text-white">{formatNumber(totalCount)}</p>
        <p className="mt-1 text-xs text-slate-500">{granularityLabel}</p>
      </div>
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-inner shadow-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">순 방문자수</p>
        <p className="mt-2 text-3xl font-bold text-white">{formatNumber(uniqueSessions)}</p>
        <p className="mt-1 text-xs text-slate-500">고유 세션 기준</p>
      </div>
      <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-500/10 via-sky-500/5 to-transparent p-4 shadow-lg shadow-indigo-500/20">
        <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">최근 방문 시간</p>
        <p className="mt-2 text-lg font-semibold text-indigo-100">{formatLastVisit(lastTimestamp)}</p>
        <p className="mt-1 text-xs text-indigo-200/70">한국 시간 기준</p>
      </div>
    </div>
  );
}
