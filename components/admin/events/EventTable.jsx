function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  if (typeof Intl !== 'undefined') {
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(date);
    } catch (error) {
      // ignore formatter errors and fall back to manual formatting
    }
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export default function EventTable({ rows, loading, error, formatNumber }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800/60 text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">이벤트명</th>
              <th scope="col" className="px-4 py-3 text-left">슬러그</th>
              <th scope="col" className="px-4 py-3 text-right">총 발생 수</th>
              <th scope="col" className="px-4 py-3 text-right">고유 세션</th>
              <th scope="col" className="px-4 py-3 text-right">평균/세션</th>
              <th scope="col" className="px-4 py-3 text-right">마지막 발생</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 bg-slate-950/20 text-slate-200">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                  이벤트 데이터를 불러오는 중이에요…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-rose-300">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && !safeRows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                  조건에 맞는 이벤트가 없어요. 기간이나 필터를 조정해 보세요.
                </td>
              </tr>
            )}
            {!loading && !error &&
              safeRows.map((row) => {
                const count = Number(row?.count) || 0;
                const unique = Number(row?.uniqueSessions) || 0;
                const avg = unique > 0 ? count / unique : 0;
                return (
                  <tr key={`${row.eventName || 'unknown'}::${row.slug || 'all'}`} className="hover:bg-slate-900/50">
                    <td className="px-4 py-3 font-semibold text-white">{row.eventName}</td>
                    <td className="px-4 py-3 text-slate-400">{row.slug || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-100">{formatNumber(count)}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{formatNumber(unique)}</td>
                    <td className="px-4 py-3 text-right text-slate-200">{avg.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{formatDateTime(row.lastTimestamp || row.lastDate)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
