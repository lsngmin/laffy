function RatioCell({ count, total }) {
  const ratio = total > 0 ? (count / total) * 100 : 0;
  return (
    <span className="text-xs text-slate-400">
      {ratio.toFixed(ratio >= 10 ? 1 : 2)}%
    </span>
  );
}

function BreakdownTable({ title, rows, total, getLabel }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800/70 bg-slate-950/70 p-4">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-400">{rows.length ? '상위 8개 항목을 표시합니다.' : '데이터가 아직 없습니다.'}</p>
      </div>
      <table className="w-full text-left text-sm text-slate-200">
        <tbody>
          {rows.slice(0, 8).map((row) => (
            <tr key={getLabel(row)} className="border-t border-slate-800/60 first:border-t-0">
              <td className="py-2 pr-2 font-medium text-white/90">{getLabel(row)}</td>
              <td className="py-2 pr-2 text-right text-slate-200">
                {row.count.toLocaleString('ko-KR')}
              </td>
              <td className="py-2 text-right">
                <RatioCell count={row.count} total={total} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellTable({ cells, total }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800/70 bg-slate-950/70 p-4">
      <div>
        <h3 className="text-base font-semibold text-white">상위 셀</h3>
        <p className="text-xs text-slate-400">
          히트맵 상에서 가장 이벤트가 많이 발생한 6개 셀입니다.
        </p>
      </div>
      <table className="w-full text-left text-sm text-slate-200">
        <thead>
          <tr className="text-xs uppercase tracking-[0.2em] text-slate-400">
            <th className="py-2 pr-2">셀</th>
            <th className="py-2 pr-2 text-right">카운트</th>
            <th className="py-2 text-right">비중</th>
          </tr>
        </thead>
        <tbody>
          {cells.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-4 text-center text-sm text-slate-400">
                데이터가 아직 없습니다.
              </td>
            </tr>
          ) : (
            cells.map((cell) => {
              const label = `${cell.row + 1}행 ${cell.col + 1}열`;
              return (
                <tr key={`${cell.row}-${cell.col}`} className="border-t border-slate-800/60 first:border-t-0">
                  <td className="py-2 pr-2 text-white/90">{label}</td>
                  <td className="py-2 pr-2 text-right text-slate-200">
                    {cell.count.toLocaleString('ko-KR')}
                  </td>
                  <td className="py-2 text-right">
                    <RatioCell count={cell.count} total={total} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function HeatmapBreakdown({ stats }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <BreakdownTable
        title="섹션별 분포"
        rows={stats.sections}
        total={stats.totalCount}
        getLabel={(row) => row.section}
      />
      <BreakdownTable
        title="이벤트 타입"
        rows={stats.types}
        total={stats.totalCount}
        getLabel={(row) => row.type}
      />
      <CellTable cells={stats.topCells} total={stats.totalCount} />
    </div>
  );
}
