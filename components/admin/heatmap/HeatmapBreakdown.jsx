function renderEmpty(message) {
  return <p className="py-6 text-sm text-slate-400">{message}</p>;
}

function formatPercent(ratio, formatter) {
  if (!Number.isFinite(ratio)) return '0%';
  if (typeof formatter === 'function') return formatter(ratio);
  return `${(ratio * 100).toFixed(1)}%`;
}

export default function HeatmapBreakdown({ bucket, formatNumber, formatPercent: formatPercentProp }) {
  const sections = Array.isArray(bucket?.sections) ? bucket.sections : [];
  const types = Array.isArray(bucket?.types) ? bucket.types : [];
  const topCells = Array.isArray(bucket?.topCells) ? bucket.topCells : [];

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
        <h3 className="text-lg font-semibold text-white">섹션별 분포</h3>
        <p className="mt-1 text-xs text-slate-400">히트맵 데이터가 집중된 UI 섹션을 확인하세요.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40">
          <table className="min-w-full divide-y divide-slate-800/80 text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-widest text-slate-300">
              <tr>
                <th className="px-4 py-3">섹션</th>
                <th className="px-4 py-3 text-right">샘플 수</th>
                <th className="px-4 py-3 text-right">비율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
              {sections.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4">
                    {renderEmpty('섹션별 데이터가 아직 없어요.')}
                  </td>
                </tr>
              )}
              {sections.map((section) => (
                <tr key={section.section} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-slate-100">{section.section}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(section.count || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(section.ratio || 0, formatPercentProp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
        <h3 className="text-lg font-semibold text-white">상위 셀</h3>
        <p className="mt-1 text-xs text-slate-400">집중도가 높은 좌표를 기준으로 상호작용 패턴을 분석해요.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40">
          <table className="min-w-full divide-y divide-slate-800/80 text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-widest text-slate-300">
              <tr>
                <th className="px-4 py-3">위치</th>
                <th className="px-4 py-3">섹션</th>
                <th className="px-4 py-3">유형</th>
                <th className="px-4 py-3 text-right">샘플 수</th>
                <th className="px-4 py-3 text-right">비율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
              {topCells.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4">
                    {renderEmpty('상위 셀 데이터가 아직 없어요.')}
                  </td>
                </tr>
              )}
              {topCells.map((cell) => (
                <tr key={`${cell.cell}-${cell.section}-${cell.type}`} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 text-sm font-medium text-slate-100">
                    행 {cell.rowLabel}, 열 {cell.columnLabel}
                  </td>
                  <td className="px-4 py-3">{cell.section}</td>
                  <td className="px-4 py-3">{cell.type}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(cell.count || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(cell.ratio || 0, formatPercentProp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
        <h3 className="text-lg font-semibold text-white">이벤트 유형</h3>
        <p className="mt-1 text-xs text-slate-400">포인터 이동, 클릭 등 이벤트 타입별 기여도를 확인합니다.</p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40">
          <table className="min-w-full divide-y divide-slate-800/80 text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-widest text-slate-300">
              <tr>
                <th className="px-4 py-3">유형</th>
                <th className="px-4 py-3 text-right">샘플 수</th>
                <th className="px-4 py-3 text-right">비율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
              {types.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4">
                    {renderEmpty('이벤트 유형 데이터가 아직 없어요.')}
                  </td>
                </tr>
              )}
              {types.map((type) => (
                <tr key={type.type} className="hover:bg-slate-900/60">
                  <td className="px-4 py-3 font-medium text-slate-100">{type.type}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(type.count || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(type.ratio || 0, formatPercentProp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
