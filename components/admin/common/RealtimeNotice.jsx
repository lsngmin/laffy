export default function RealtimeNotice({
  title = 'Redis 실시간 지표',
  description = '최근 3~5분 내에 집계된 데이터예요. 더 오래된 지표는 별도 저장소에서 불러옵니다.',
}) {
  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100 shadow-lg shadow-emerald-500/10">
      <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">{title}</p>
      <p className="mt-2 leading-relaxed text-emerald-50/90">{description}</p>
    </div>
  );
}
