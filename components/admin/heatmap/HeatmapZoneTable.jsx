export default function HeatmapZoneTable({ zones = [] }) {
  const numberFormatter = new Intl.NumberFormat('ko-KR');
  const percentFormatter = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const total = zones.reduce((sum, zone) => sum + (Number(zone?.count) || 0), 0);

  if (!zones.length || total <= 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-4">
        <p className="text-sm text-slate-300">존 단위 데이터가 아직 수집되지 않았어요.</p>
        <p className="mt-1 text-xs text-slate-500">주요 CTA 노출 영역부터 히트맵 샘플을 모아주세요.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900/80 shadow-lg shadow-black/20">
      <table className="min-w-full divide-y divide-emerald-500/30">
        <thead className="bg-emerald-500/10 text-xs uppercase tracking-[0.2em] text-emerald-100/80">
          <tr>
            <th scope="col" className="px-4 py-3 text-left">존</th>
            <th scope="col" className="px-4 py-3 text-left">유형</th>
            <th scope="col" className="px-4 py-3 text-right">누적</th>
            <th scope="col" className="px-4 py-3 text-right">비중</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-500/20 text-sm text-slate-100">
          {zones.map((zone) => {
            const share = total > 0 ? (Number(zone.count) || 0) / total : 0;
            return (
              <tr key={`${zone.zone}::${zone.type}`} className="hover:bg-emerald-500/5">
                <td className="px-4 py-3 font-medium">{zone.zone}</td>
                <td className="px-4 py-3 text-emerald-200/80">{zone.type || 'custom'}</td>
                <td className="px-4 py-3 text-right">{numberFormatter.format(zone.count || 0)}</td>
                <td className="px-4 py-3 text-right">{percentFormatter.format(share * 100)}%</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="px-4 py-3 text-xs uppercase tracking-[0.25em] text-emerald-200/80" colSpan={2}>합계</td>
            <td className="px-4 py-3 text-right text-sm font-semibold text-white">{numberFormatter.format(total)}</td>
            <td className="px-4 py-3 text-right text-sm font-semibold text-white">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
