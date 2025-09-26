import ModalPortal from './ModalPortal';

export default function DeleteModal({ pendingDelete, status, error, onClose, onConfirm }) {
  if (!pendingDelete) return null;
  const deleting = status === 'pending';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
        <div
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-rose-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_40px_120px_rgba(127,29,29,0.55)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-delete-modal-title"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
            aria-label="삭제 확인 창 닫기"
          >
            ✕
          </button>
          <div className="space-y-6 p-7 sm:p-9">
            <header className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400/70">Delete Content</p>
              <h3 id="admin-delete-modal-title" className="text-2xl font-semibold text-white sm:text-3xl">
                {pendingDelete.title || pendingDelete.slug}
              </h3>
              <p className="text-[12px] text-slate-500">Slug · {pendingDelete.slug}</p>
            </header>

            <div className="space-y-4 text-sm text-slate-200/90">
              <p>이 콘텐츠의 메타 데이터가 영구 삭제됩니다. 삭제 후 10초 안에 되돌리기가 가능합니다.</p>
              <div className="space-y-2 rounded-2xl border border-rose-500/20 bg-slate-900/70 p-4 text-xs text-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <span className="uppercase tracking-widest text-slate-500">Slug</span>
                  <span className="font-mono text-[11px] text-slate-200">{pendingDelete.slug}</span>
                </div>
                {pendingDelete.routePath && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-widest text-slate-500">Route</span>
                    <span className="truncate text-[11px] text-slate-200">{pendingDelete.routePath}</span>
                  </div>
                )}
                {pendingDelete.preview && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-widest text-slate-500">Preview</span>
                    <span className="truncate text-[11px] text-slate-200">{pendingDelete.preview}</span>
                  </div>
                )}
              </div>
              <p className="text-[12px] text-rose-200/80">
                이 작업은 메타 파일을 삭제하지만 원본 미디어는 별도 보관됩니다. 필요 시 되돌리기를 눌러 복구할 수 있습니다.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={deleting}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(248,113,113,0.35)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:cursor-wait disabled:opacity-70"
              >
                {deleting ? '삭제 중…' : '영구 삭제'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
