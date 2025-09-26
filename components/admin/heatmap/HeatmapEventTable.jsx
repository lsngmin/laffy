export default function HeatmapEventTable({ events = [] }) {
  const numberFormatter = new Intl.NumberFormat('ko-KR');
  const total = events.reduce((sum, event) => sum + (Number(event?.count) || 0), 0);

  if (!events.length || total <= 0) {
    return (
      <div className="rounded-2xl border border-sky-500/20 bg-slate-900/70 p-4">
        <p className="text-sm text-slate-300">이벤트 통계가 아직 기록되지 않았어요.</p>
        <p className="mt-1 text-xs text-slate-500">CTA, 비디오 인터랙션 등 주요 이벤트를 기다리고 있어요.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-sky-500/20 bg-slate-900/80 shadow-lg shadow-black/20">
      <table className="min-w-full divide-y divide-sky-500/30">
        <thead className="bg-sky-500/10 text-xs uppercase tracking-[0.2em] text-sky-100/80">
          <tr>
            <th scope="col" className="px-4 py-3 text-left">이벤트</th>
            <th scope="col" className="px-4 py-3 text-right">누적</th>
            <th scope="col" className="px-4 py-3 text-right">비중</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sky-500/20 text-sm text-slate-100">
          {events.map((event) => {
            const share = total > 0 ? (Number(event.count) || 0) / total : 0;
            return (
              <tr key={event.type} className="hover:bg-sky-500/5">
                <td className="px-4 py-3 font-medium">{event.type}</td>
                <td className="px-4 py-3 text-right">{numberFormatter.format(event.count || 0)}</td>
                <td className="px-4 py-3 text-right">{(share * 100).toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="px-4 py-3 text-xs uppercase tracking-[0.25em] text-sky-200/80">합계</td>
            <td className="px-4 py-3 text-right text-sm font-semibold text-white">{numberFormatter.format(total)}</td>
            <td className="px-4 py-3 text-right text-sm font-semibold text-white">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
