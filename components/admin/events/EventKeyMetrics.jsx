const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function formatKstDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const iso = kst.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
}

export default function EventKeyMetrics({ items, formatNumber }) {
  const rows = Array.isArray(items)
    ? items.slice(0, 5).map((item) => ({
        slug: item.slug || '-',
        count: Number(item.count) || 0,
        uniqueSessions: Number(item.uniqueSessions) || 0,
        lastTimestamp: item.lastTimestamp || item.lastDate || null,
      }))
    : [];

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">상위 경로</h3>
        <span className="text-[11px] text-slate-500">l_visit 기준</span>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">표시할 방문 경로가 아직 없어요.</p>
        ) : (
          rows.map((row) => {
            const avg = row.uniqueSessions > 0 ? row.count / row.uniqueSessions : 0;
            return (
              <div
                key={row.slug}
                className="grid gap-2 rounded-xl border border-slate-800/40 bg-slate-950/60 p-3 text-xs text-slate-300 sm:grid-cols-4"
              >
                <div className="sm:col-span-2">
                  <p className="font-semibold text-white">{row.slug}</p>
                  <p className="mt-1 text-[11px] text-slate-400">최근 방문: {formatKstDateTime(row.lastTimestamp)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">총 방문</p>
                  <p className="text-base font-semibold text-white">{formatNumber(row.count)}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">평균/세션</p>
                  <p className="text-base font-semibold text-white">{avg.toFixed(2)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
