export default function HeatmapBucketTable({ buckets = [] }) {
  const numberFormatter = new Intl.NumberFormat('ko-KR');
  if (!Array.isArray(buckets) || !buckets.length) {
    return (
      <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/70 p-4">
        <p className="text-sm text-slate-300">뷰포트 버킷별 데이터가 아직 준비되지 않았어요.</p>
        <p className="mt-1 text-xs text-slate-500">디바이스·해상도별 히트맵이 쌓이면 자동으로 표시돼요.</p>
      </div>
    );
  }

  const totalSamples = buckets.reduce((sum, bucket) => sum + (Number(bucket?.samples) || 0), 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-900/80 shadow-lg shadow-black/20">
      <table className="min-w-full divide-y divide-indigo-500/30">
        <thead className="bg-indigo-500/10 text-xs uppercase tracking-[0.2em] text-indigo-100/80">
          <tr>
            <th scope="col" className="px-4 py-3 text-left">버킷</th>
            <th scope="col" className="px-4 py-3 text-right">샘플</th>
            <th scope="col" className="px-4 py-3 text-right">고유 뷰어</th>
            <th scope="col" className="px-4 py-3 text-left">상위 존</th>
            <th scope="col" className="px-4 py-3 text-right">점유율</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-indigo-500/20 text-sm text-slate-100">
          {buckets.map((bucket) => {
            const topZone = bucket.zones?.[0];
            const sampleShare = totalSamples > 0 ? (Number(bucket.samples) || 0) / totalSamples : 0;
            return (
              <tr key={bucket.bucket} className="hover:bg-indigo-500/5">
                <td className="px-4 py-3 font-medium">{bucket.bucket}</td>
                <td className="px-4 py-3 text-right">{numberFormatter.format(bucket.samples || 0)}</td>
                <td className="px-4 py-3 text-right">{numberFormatter.format(bucket.viewers || 0)}</td>
                <td className="px-4 py-3 text-sm text-indigo-200/80">
                  {topZone ? `${topZone.zone} · ${numberFormatter.format(topZone.count)}회` : '—'}
                </td>
                <td className="px-4 py-3 text-right">{(sampleShare * 100).toFixed(1)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
