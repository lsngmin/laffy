import { useMemo } from 'react';
import ModalPortal from '../modals/ModalPortal';

function formatTimestamp(value) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (error) {
    return value;
  }
}

export default function AnalyticsHistoryPanel({
  open,
  onClose,
  logs,
  loading,
  error,
  onRetry,
  focusSlugs,
}) {
  const targetLabel = useMemo(() => {
    if (!Array.isArray(focusSlugs) || !focusSlugs.length) return '전체 메트릭 이력';
    if (focusSlugs.length === 1) return `Slug: ${focusSlugs[0]}`;
    if (focusSlugs.length <= 3) return focusSlugs.join(', ');
    return `${focusSlugs.slice(0, 3).join(', ')} 외 ${focusSlugs.length - 3}개`;
  }, [focusSlugs]);

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/60 backdrop-blur-sm">
        <div className="h-full w-full max-w-md border-l border-slate-800/70 bg-slate-900/95 shadow-[0_32px_80px_rgba(15,23,42,0.6)]">
          <div className="flex items-center justify-between border-b border-slate-800/70 px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">변경 이력</h3>
              <p className="text-xs text-slate-400">{targetLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              닫기
            </button>
          </div>
          <div className="flex h-[calc(100%-64px)] flex-col overflow-hidden">
            {loading && (
              <div className="flex flex-1 items-center justify-center text-sm text-slate-300">
                변경 이력을 불러오는 중입니다…
              </div>
            )}
            {!loading && error && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-rose-200">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-full border border-rose-400/60 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
                >
                  다시 시도
                </button>
              </div>
            )}
            {!loading && !error && (
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {Array.isArray(logs) && logs.length ? (
                  <ul className="space-y-4">
                    {logs.map((log) => {
                      const viewsChanged = log.before?.views !== log.after?.views;
                      const likesChanged = log.before?.likes !== log.after?.likes;
                      return (
                        <li
                          key={log.id}
                          className="rounded-2xl border border-slate-800/70 bg-slate-900/80 px-4 py-3 text-sm text-slate-200 shadow-inner shadow-black/30"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{log.slug}</p>
                              <p className="mt-1 text-[12px] text-slate-400">{formatTimestamp(log.changedAt)}</p>
                            </div>
                            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                              {log.changedBy || 'unknown'}
                            </span>
                          </div>
                          <div className="mt-3 space-y-2 text-[13px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">조회수</span>
                              <span className={`font-semibold ${viewsChanged ? 'text-emerald-300' : 'text-slate-200'}`}>
                                {log.before?.views ?? 0} → {log.after?.views ?? 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">좋아요</span>
                              <span className={`font-semibold ${likesChanged ? 'text-cyan-300' : 'text-slate-200'}`}>
                                {log.before?.likes ?? 0} → {log.after?.likes ?? 0}
                              </span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    아직 변경 이력이 없어요.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

