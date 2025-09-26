function buildGrid(columns, rows, cells) {
  const totalCells = Math.max(columns * rows, 0);
  const map = new Map();
  cells.forEach((cell) => {
    if (!cell || typeof cell.cell !== 'number') return;
    map.set(cell.cell, {
      total: Number(cell.total) || 0,
      pointermove: Number(cell.pointermove) || 0,
      pointerdown: Number(cell.pointerdown) || 0,
      scroll: Number(cell.scroll) || 0,
    });
  });

  const grid = Array.from({ length: totalCells }, (_, index) => {
    const found = map.get(index);
    return {
      index,
      total: found ? found.total : 0,
      pointermove: found ? found.pointermove : 0,
      pointerdown: found ? found.pointerdown : 0,
      scroll: found ? found.scroll : 0,
    };
  });
  return grid;
}

function getIntensityColor(intensity) {
  if (!Number.isFinite(intensity) || intensity <= 0) {
    return 'rgba(15, 118, 110, 0.08)';
  }
  const clamped = Math.min(Math.max(intensity, 0), 1);
  const alpha = 0.18 + clamped * 0.72;
  const lightness = 80 - clamped * 35;
  return `hsla(167, 75%, ${lightness}%, ${alpha})`;
}

export default function HeatmapGrid({ columns = 12, rows = 0, cells = [], maxTotal = 0, totals }) {
  const totalCount = Number(totals?.total) || 0;
  const grid = rows > 0 ? buildGrid(columns, rows, cells) : [];

  if (!grid.length || maxTotal <= 0 || totalCount <= 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-6 shadow-inner shadow-black/30">
        <p className="text-sm text-slate-300">좌표 기반 히트맵 데이터가 아직 충분하지 않아요.</p>
        <p className="mt-1 text-xs text-slate-500">샘플이 누적되면 관심 구역 분포를 시각화해 드릴게요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-6 shadow-inner shadow-black/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-emerald-300">히트맵 샘플 분포</h3>
          <p className="text-xs text-emerald-200/70">총 {totalCount.toLocaleString('ko-KR')}회 샘플 중 상대적인 강도를 표시합니다.</p>
        </div>
        <div className="text-right text-xs text-emerald-200/70">
          <p>최대 샘플 {maxTotal.toLocaleString('ko-KR')}회</p>
          <p>그리드 {columns} × {rows}</p>
        </div>
      </div>
      <div
        className="mt-4 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {grid.map((cell) => {
          const intensity = maxTotal > 0 ? cell.total / maxTotal : 0;
          const background = getIntensityColor(intensity);
          const title = `셀 ${cell.index}\n총합 ${cell.total}\n포인터 이동 ${cell.pointermove}\n포인터 클릭 ${cell.pointerdown}\n스크롤 ${cell.scroll}`;
          return (
            <div
              key={cell.index}
              title={title}
              className="flex h-10 items-center justify-center rounded-md border border-emerald-500/40 text-xs font-medium text-emerald-100/90"
              style={{ backgroundColor: background }}
            >
              {cell.total ? cell.total.toLocaleString('ko-KR') : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
