function formatTitle({ row, col, count, section, type }) {
  const sectionLabel = section ? section : '섹션 미지정';
  const typeLabel = type ? type : 'generic';
  return `${row + 1}행 ${col + 1}열 | ${sectionLabel} · ${typeLabel} | ${count.toLocaleString('ko-KR')}회`;
}

export default function HeatmapGridView({ grid, maxCount, loading, error, cellSummaries }) {
  const templateColumns = `repeat(${grid.cols}, minmax(0, 1fr))`;
  const templateRows = `repeat(${grid.rows}, minmax(0, 1fr))`;
  const summaryMap = new Map();
  (cellSummaries || []).forEach((summary) => {
    const key = `${summary.row}-${summary.col}`;
    summaryMap.set(key, summary);
  });

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/30">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">히트맵 시각화</h3>
          <p className="text-xs text-slate-400">
            셀은 12×{grid.rows} 그리드로 표시되며, 진한 영역일수록 이벤트가 집중된 지점을 의미합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex h-3 w-3 rounded-full bg-slate-700" aria-hidden />
          <span>낮은 강도</span>
          <span className="flex h-3 w-12 rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-red-600" aria-hidden />
          <span>높은 강도</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>
      ) : (
        <div
          className="grid gap-[3px] rounded-lg border border-slate-800/60 bg-slate-950/70 p-3"
          style={{ gridTemplateColumns: templateColumns, gridTemplateRows: templateRows }}
        >
          {grid.counts.map((rowCounts, rowIndex) =>
            rowCounts.map((cellCount, colIndex) => {
              const intensity = maxCount > 0 ? cellCount / maxCount : 0;
              const alpha = intensity > 0 ? Math.min(0.85, 0.18 + intensity * 0.72) : 0.08;
              const background = intensity
                ? `linear-gradient(135deg, rgba(249,115,22,${alpha}) 0%, rgba(239,68,68,${alpha}) 100%)`
                : 'rgba(15,23,42,0.75)';
              const textVisible = intensity > 0.45;
              const summary = summaryMap.get(`${rowIndex}-${colIndex}`);
              const title = formatTitle({
                row: rowIndex,
                col: colIndex,
                count: cellCount,
                section: summary?.topSection?.id || '',
                type: summary?.topType?.id || '',
              });
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="flex items-center justify-center rounded-md border border-slate-900/40 text-[0.65rem] font-medium text-slate-200 transition hover:scale-[1.02] hover:border-indigo-400/60"
                  style={{ background }}
                  title={title}
                >
                  {loading ? (
                    <span className="animate-pulse text-slate-500">…</span>
                  ) : textVisible ? (
                    <span>{cellCount.toLocaleString('ko-KR')}</span>
                  ) : summary?.topSection ? (
                    <span className="max-w-full truncate px-1 text-center text-[0.55rem] text-slate-200/70">
                      {summary.topSection.id}
                    </span>
                  ) : (
                    <span className="text-slate-400/40">{cellCount > 0 ? '•' : ''}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
