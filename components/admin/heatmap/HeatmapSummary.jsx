export default function HeatmapSummary({ stats, formatNumber, formatDecimal }) {
  const cards = [
    {
      label: '총 샘플 수',
      value: formatNumber(stats.totalCount || 0),
      description: '히트맵에 누적된 이벤트 샘플의 총량',
    },
    {
      label: '활성 섹션',
      value: formatNumber(stats.sections.length || 0),
      description: '데이터가 수집된 히트맵 섹션 개수',
    },
    {
      label: '셀 평균 강도',
      value: formatDecimal(stats.averagePerCell || 0, 3),
      description: '셀당 평균 샘플 수 (그리드 전체 대비)',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-800/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 shadow-inner shadow-slate-950/50"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
          <p className="mt-1 text-xs text-slate-400">{card.description}</p>
        </div>
      ))}
    </div>
  );
}
