export default function UndoToast({ undoInfo, status, onUndo, onDismiss }) {
  if (!undoInfo) return null;
  const pending = status === 'pending';
  const success = status === 'success';
  const title = undoInfo.title || undoInfo.payload?.title || undoInfo.payload?.slug || '';

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="flex w-full max-w-xl items-center justify-between gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 shadow-lg shadow-black/40">
        <div>
          <p className="font-semibold text-slate-100">{title} 삭제됨</p>
          <p className="text-xs text-slate-400">
            {success ? '복원되었습니다.' : '10초 안에 되돌리기를 누르면 복원돼요.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={pending || success}
            className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 shadow shadow-emerald-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? '복원 중…' : success ? '복원 완료' : '되돌리기'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700"
            aria-label="토스트 닫기"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
