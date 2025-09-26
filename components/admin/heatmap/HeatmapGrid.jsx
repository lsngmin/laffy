function blendChannel(start, end, ratio) {
  const value = Math.round(start + (end - start) * ratio);
  return Math.min(255, Math.max(0, value));
}

function colorForIntensity(intensity) {
  const ratio = Math.max(0, Math.min(1, intensity || 0));
  const start = { r: 15, g: 23, b: 42 };
  const mid = { r: 59, g: 130, b: 246 };
  const end = { r: 236, g: 72, b: 153 };

  if (ratio <= 0.5) {
    const local = ratio / 0.5;
    const r = blendChannel(start.r, mid.r, local);
    const g = blendChannel(start.g, mid.g, local);
    const b = blendChannel(start.b, mid.b, local);
    return `rgb(${r}, ${g}, ${b})`;
  }

  const local = (ratio - 0.5) / 0.5;
  const r = blendChannel(mid.r, end.r, local);
  const g = blendChannel(mid.g, end.g, local);
  const b = blendChannel(mid.b, end.b, local);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function HeatmapGrid({ grid, cells, maxCount, formatNumber }) {
  const rows = Number.isFinite(grid?.rows) ? grid.rows : 0;
  const cols = Number.isFinite(grid?.cols) ? grid.cols : 0;
  if (rows <= 0 || cols <= 0) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6 text-center text-sm text-slate-400">
        아직 누적된 히트맵 샘플이 없어요.
      </div>
    );
  }

  const cellMap = new Map();
  if (Array.isArray(cells)) {
    cells.forEach((cell) => {
      const row = Number(cell?.row);
      const column = Number(cell?.column);
      if (!Number.isFinite(row) || !Number.isFinite(column)) return;
      const key = `${row}:${column}`;
      cellMap.set(key, cell);
    });
  }

  const items = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const key = `${row}:${column}`;
      const cell = cellMap.get(key);
      const count = Number(cell?.count) || 0;
      const ratio = maxCount > 0 ? count / maxCount : 0;
      const background = colorForIntensity(ratio);
      const label = count > 0 ? formatNumber(count) : '';
      const section = cell?.section || 'root';
      const type = cell?.type || 'generic';
      const title = `셀 #${cell?.cell ?? row * cols + column}\n섹션: ${section}\n유형: ${type}\n샘플: ${count}`;

      items.push(
        <div
          key={key}
          className={`relative aspect-square w-full rounded-md border border-slate-900/80 shadow-inner shadow-black/30 transition-transform duration-200 ${
            ratio >= 0.85 ? 'ring-2 ring-rose-400' : ratio >= 0.65 ? 'ring-1 ring-sky-400/80' : ''
          }`}
          style={{ backgroundColor: background }}
          title={title}
        >
          {count > 0 && (
            <div className="absolute inset-1 flex flex-col items-center justify-center rounded-md bg-slate-950/30 text-[10px] font-semibold uppercase tracking-wide text-slate-100">
              <span>{label}</span>
              <span className="mt-0.5 text-[9px] text-slate-200/80">{section}</span>
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-4">
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {items}
      </div>
    </div>
  );
}
