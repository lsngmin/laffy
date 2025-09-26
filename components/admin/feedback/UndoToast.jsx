export default function UndoToast({ info, status, onUndo, onDismiss }) {
  if (!info) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-[min(90vw,26rem)] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-slate-200 shadow-[0_25px_60px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex-1" role="status" aria-live="polite">
          {status === 'error'
            ? '복원에 실패했어요. 다시 시도해 주세요.'
            : status === 'success'
              ? '복원이 완료됐어요!'
              : `${info.title ? `‘${info.title}’` : '콘텐츠'} 항목을 삭제했어요.`}
        </div>
        <button
          type="button"
          onClick={onUndo}
          disabled={status === 'pending' || status === 'success'}
          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold shadow ${
            status === 'pending' || status === 'success'
              ? 'cursor-default bg-white/40 text-slate-700'
              : 'bg-white text-slate-900 hover:bg-white/90'
          }`}
        >
          {status === 'pending' ? '복원 중…' : status === 'success' ? '완료' : '되돌리기'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
          aria-label="되돌리기 알림 닫기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
