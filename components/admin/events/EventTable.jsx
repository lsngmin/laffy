import { formatRelativeTime } from '../../../lib/formatters';

function formatNumber(value) {
  try {
    return new Intl.NumberFormat('ko-KR').format(Number(value) || 0);
  } catch (error) {
    return String(value || 0);
  }
}

function renderMeta(metaSummary) {
  if (!metaSummary) return '—';
  const source = metaSummary.utm_sources?.[0];
  const medium = metaSummary.utm_mediums?.[0];
  const campaign = metaSummary.utm_campaigns?.[0];
  if (!source && !medium && !campaign) return '—';
  return [source || '소스 미지정', medium || '미디어 미지정', campaign || '캠페인 미지정'].join(' · ');
}

export default function EventTable({ events, loading }) {
  const items = Array.isArray(events) ? events : [];

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/70">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800/70 text-sm">
          <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">이벤트명</th>
              <th className="px-4 py-3 font-semibold">슬러그</th>
              <th className="px-4 py-3 text-right font-semibold">발생 수</th>
              <th className="px-4 py-3 text-right font-semibold">고유 세션</th>
              <th className="px-4 py-3 font-semibold">대표 UTM</th>
              <th className="px-4 py-3 font-semibold">최근 발생</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {items.map((event) => {
              const lastSeen = event.lastSeenAt ? formatRelativeTime(event.lastSeenAt, 'ko') : '—';
              return (
                <tr key={event.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-100">
                    <div>{event.name}</div>
                    {event.lastTitle && <div className="text-xs text-slate-400">{event.lastTitle}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-200">{event.slug || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatNumber(event.totalCount)}</td>
                  <td className="px-4 py-3 text-right text-slate-100">{formatNumber(event.uniqueCount || 0)}</td>
                  <td className="px-4 py-3 text-slate-200">{renderMeta(event.metaSummary)}</td>
                  <td className="px-4 py-3 text-slate-200">{lastSeen}</td>
                </tr>
              );
            })}
            {!items.length && !loading && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                  선택한 조건에 해당하는 이벤트가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && (
        <div className="border-t border-slate-800/70 bg-slate-900/70 px-4 py-3 text-right text-xs text-slate-400">
          불러오는 중…
        </div>
      )}
    </div>
  );
}
