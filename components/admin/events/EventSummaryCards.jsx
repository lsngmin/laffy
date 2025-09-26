import { formatRelativeTime } from '../../../lib/formatters';

function formatNumber(value) {
  try {
    return new Intl.NumberFormat('ko-KR').format(Number(value) || 0);
  } catch (error) {
    return String(value || 0);
  }
}

export default function EventSummaryCards({ totals, topEvent, range, generatedAt }) {
  const totalEvents = Number(totals?.totalEvents) || 0;
  const totalUnique = Number(totals?.totalUnique) || 0;
  const lastGenerated = generatedAt ? formatRelativeTime(generatedAt, 'ko') : null;
  const topTitle = topEvent?.lastTitle || '';
  const topName = topEvent?.name || '';
  const topCount = Number(topEvent?.totalCount) || 0;
  const topSlug = topEvent?.slug || '';
  const topUpdated = topEvent?.lastSeenAt ? formatRelativeTime(topEvent.lastSeenAt, 'ko') : null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-inner shadow-black/30">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">이벤트 총합</div>
        <div className="mt-2 text-3xl font-bold text-slate-50">{formatNumber(totalEvents)}</div>
        <p className="mt-3 text-sm text-slate-400">
          {range?.start || '?'} ~ {range?.end || '?'} 동안 수집된 커스텀 이벤트 총합입니다.
        </p>
        {lastGenerated && (
          <p className="mt-4 text-xs text-slate-500">최근 갱신 {lastGenerated}</p>
        )}
      </div>
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-inner shadow-black/30">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">고유 세션</div>
        <div className="mt-2 text-3xl font-bold text-slate-50">{formatNumber(totalUnique)}</div>
        <p className="mt-3 text-sm text-slate-400">
          동일한 viewerId를 기준으로 근사치로 계산된 참여 세션 수입니다.
        </p>
      </div>
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 shadow-lg shadow-emerald-500/20">
        <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">상위 이벤트</div>
        <div className="mt-2 text-lg font-bold text-emerald-100">{topName || '데이터 없음'}</div>
        <div className="mt-1 text-sm text-emerald-200">{topSlug ? `슬러그 ${topSlug}` : '글로벌 이벤트'}</div>
        <div className="mt-3 text-2xl font-semibold text-emerald-100">{formatNumber(topCount)}</div>
        {topTitle && <div className="mt-2 text-xs text-emerald-200/80">최근 제목: {topTitle}</div>}
        {topUpdated && <div className="mt-2 text-[11px] text-emerald-300/70">최근 발생 {topUpdated}</div>}
      </div>
    </div>
  );
}
