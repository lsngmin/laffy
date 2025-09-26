import ModalPortal from './ModalPortal';

export default function DeleteModal({ item, status, error, onCancel, onConfirm }) {
  if (!item) return null;
  const pending = status === 'pending';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm px-4 py-10">
        <div
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_48px_140px_rgba(15,23,42,0.68)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-delete-modal-title"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-orange-500" />
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
            aria-label="삭제 창 닫기"
          >
            ✕
          </button>
          <div className="space-y-6 p-7 sm:p-10">
            <header className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-rose-300/70">Delete</p>
              <h3 id="admin-delete-modal-title" className="text-2xl font-semibold text-white sm:text-3xl">
                {item.title || item.slug}
              </h3>
              <p className="text-[12px] text-slate-500">Slug · {item.slug}</p>
            </header>

            <p className="text-sm leading-relaxed text-slate-300">
              이 콘텐츠의 메타와 업로드 파일을 삭제하시겠어요? 되돌리기는 제한된 시간 동안만 가능해요.
            </p>

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800/60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(248,113,113,0.35)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:cursor-wait disabled:opacity-70"
              >
                {pending ? '삭제 중…' : '영구 삭제'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
