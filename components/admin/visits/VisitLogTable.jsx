import { useMemo } from 'react';

function formatDateTime(value) {
  if (!value) return '-';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (error) {
    return '-';
  }
}

function formatUtm(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const pairs = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    .map((key) => {
      const value = payload[key];
      if (typeof value !== 'string' || !value.trim()) return null;
      return `${key.replace('utm_', '')}: ${value.trim()}`;
    })
    .filter(Boolean);
  return pairs.join(' • ');
}

function restPayload(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const { title, referrer, slug, __context, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ...rest } = payload;
  const cleaned = { ...rest };
  if (__context && typeof __context === 'object') {
    cleaned.__context = __context;
  }
  return cleaned;
}

export default function VisitLogTable({ items }) {
  const rows = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
        방문 로그가 아직 없어요.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm text-slate-200">
        <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3">수집 시각</th>
            <th scope="col" className="px-4 py-3">Slug</th>
            <th scope="col" className="px-4 py-3">세션 ID</th>
            <th scope="col" className="px-4 py-3">제목</th>
            <th scope="col" className="px-4 py-3">Referrer</th>
            <th scope="col" className="px-4 py-3">UTM</th>
            <th scope="col" className="px-4 py-3">기타</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.map((row) => {
            const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
            const context = payload.__context && typeof payload.__context === 'object' ? payload.__context : null;
            const misc = restPayload(payload);
            const miscEntries = Object.entries(misc)
              .filter(([key, value]) => typeof value !== 'undefined' && value !== null && `${value}`.trim() !== '')
              .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);

            if (context) {
              miscEntries.unshift(`context: ${JSON.stringify(context)}`);
            }

            return (
              <tr key={row.id || `${row.ts}:${row.slug}:${row.sessionId || ''}`} className="hover:bg-slate-900/40">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-300">{formatDateTime(row.ts)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-emerald-200">{row.slug || '-'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{row.sessionId || '-'}</td>
                <td className="px-4 py-3 text-xs">{typeof payload.title === 'string' && payload.title.trim() ? payload.title.trim() : '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-400 break-all">{typeof payload.referrer === 'string' && payload.referrer.trim() ? payload.referrer.trim() : '-'}</td>
                <td className="px-4 py-3 text-xs text-amber-200">{formatUtm(payload) || '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-400 break-words whitespace-pre-wrap">{miscEntries.length ? miscEntries.join('\n') : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
