import { useEffect } from 'react';

const CHANNEL_LABELS = {
  l: 'L 채널',
  k: 'K 채널',
  x: 'X 채널',
  g: 'Gofile 채널',
};

function formatRelativeTime(value) {
  if (!value) return '';
  try {
    const target = new Date(value);
    if (Number.isNaN(target.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - target.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return '방금 전';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}일 전`;
    return target.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Failed to format time', value, error);
    return '';
  }
}

export default function PendingUploadsPanel({
  items = [],
  isLoading = false,
  onRefresh = () => {},
  onPublish = () => {},
  onDelete = () => {},
  hasToken = false,
  publishingSlug = '',
  publishFeedback,
}) {
  const feedback = publishFeedback || { status: 'idle', message: '' };

  useEffect(() => {
    if (!feedback?.message || feedback.status === 'idle') return undefined;
    const timer = setTimeout(() => {
      if (typeof feedback.onClear === 'function') {
        feedback.onClear();
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  return (
    <div className="space-y-4 rounded-3xl border border-slate-800/60 bg-slate-950/60 p-6 shadow-inner shadow-cyan-900/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-slate-400">게시 대기중</p>
          <h3 className="text-xl font-semibold text-slate-50">검토 후 게시를 완료하세요</h3>
          <p className="text-sm leading-relaxed text-slate-300">
            새로 업로드한 콘텐츠는 먼저 이곳에 쌓입니다. 검토 후 게시하기 버튼을 눌러 채널 목록으로 이동시켜 주세요.
          </p>
          {feedback?.message && (
            <p
              className={`rounded-xl px-3 py-2 text-xs ${
                feedback.status === 'success'
                  ? 'bg-emerald-500/10 text-emerald-200'
                  : feedback.status === 'error'
                    ? 'bg-rose-500/10 text-rose-200'
                    : 'bg-slate-800/70 text-slate-200'
              }`}
            >
              {feedback.message}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-slate-700/70 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
          >
            대기 목록 새로고침
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 text-sm text-slate-300">
          대기중인 콘텐츠를 불러오는 중입니다…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 text-sm text-slate-400">
          현재 게시 대기중인 콘텐츠가 없습니다.
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => {
            const channelLabel = CHANNEL_LABELS[item.channel] || '기타 채널';
            const pendingLabel = formatRelativeTime(item.pendingAt || item.uploadedAt);
            const isPublishing = publishingSlug === item.slug;
            return (
              <div
                key={item.pathname || item.slug}
                className="flex flex-col gap-4 rounded-2xl border border-slate-800/60 bg-[#060c1d]/80 p-4 shadow-lg shadow-indigo-900/10 md:flex-row"
              >
                <div className="w-full max-w-[220px] overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/70">
                  {item.preview ? (
                    <img src={item.preview} alt={item.title || item.slug} className="h-40 w-full object-cover" />
                  ) : (
                    <div className="grid h-40 place-items-center text-xs uppercase tracking-[0.32em] text-slate-500">
                      No Preview
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <div className="space-y-2">
                    <div className="font-mono text-sm font-semibold text-cyan-200">{item.slug}</div>
                    <h4 className="text-base font-semibold text-slate-100">{item.title || '제목 없음'}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-[11px] text-slate-300">
                        {channelLabel}
                      </span>
                      <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-[11px] text-slate-400">
                        {item.type === 'image' ? '이미지' : '영상'}
                      </span>
                      {pendingLabel && (
                        <span className="text-[11px] text-slate-500">{pendingLabel} 대기 시작</span>
                      )}
                    </div>
                    {item.summary && (
                      <p className="text-sm text-slate-300">{item.summary}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => onPublish(item)}
                      disabled={!hasToken || isPublishing}
                      className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/80 hover:text-emerald-50 disabled:cursor-not-allowed disabled:border-emerald-900 disabled:text-emerald-400"
                    >
                      {isPublishing ? '게시 중…' : '게시하기'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      disabled={!hasToken}
                      className="rounded-xl border border-rose-500/60 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-400/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:cursor-not-allowed disabled:border-rose-900 disabled:text-rose-400"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
