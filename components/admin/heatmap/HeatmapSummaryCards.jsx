export default function HeatmapSummaryCards({
  slug,
  totalSamples,
  totalViewers,
  zoneSummary = [],
  eventSummary = [],
  generatedAt,
}) {
  const numberFormatter = new Intl.NumberFormat('ko-KR');
  const percentFormatter = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const zoneTotal = zoneSummary.reduce((sum, zone) => sum + (Number(zone?.count) || 0), 0);
  const topZone = zoneSummary[0] || null;
  const topZoneShare = topZone && zoneTotal > 0 ? (topZone.count / zoneTotal) * 100 : 0;

  const topEvent = eventSummary[0] || null;
  const generatedDate = (() => {
    if (!generatedAt) return '';
    const date = new Date(generatedAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ko-KR', { hour12: false });
  })();

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">총 샘플</p>
        <p className="mt-2 text-2xl font-bold text-white">{numberFormatter.format(totalSamples || 0)}</p>
        <p className="mt-1 text-xs text-slate-500">선택된 슬러그 {slug ? `· ${slug}` : ''}</p>
      </div>
      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">고유 뷰어</p>
        <p className="mt-2 text-2xl font-bold text-white">{numberFormatter.format(totalViewers || 0)}</p>
        <p className="mt-1 text-xs text-slate-500">히트맵 수집 기준 추정</p>
      </div>
      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">상위 존</p>
        {topZone ? (
          <>
            <p className="mt-2 text-xl font-semibold text-white">{topZone.zone}</p>
            <p className="mt-1 text-sm text-slate-300">{percentFormatter.format(topZoneShare)}% · {numberFormatter.format(topZone.count)}회</p>
            <p className="mt-1 text-xs text-slate-500">유형 {topZone.type || 'custom'} | 총 {numberFormatter.format(zoneTotal)}회</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-400">존 데이터가 아직 충분하지 않아요.</p>
        )}
      </div>
      <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">최다 이벤트</p>
        {topEvent ? (
          <>
            <p className="mt-2 text-xl font-semibold text-white">{topEvent.type}</p>
            <p className="mt-1 text-sm text-slate-300">{numberFormatter.format(topEvent.count)}회</p>
            <p className="mt-1 text-xs text-slate-500">데이터 기준 {generatedDate || '—'}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-400">이벤트 기록이 아직 없어요.</p>
        )}
      </div>
    </div>
  );
}
