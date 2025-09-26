import ModalPortal from './ModalPortal';

export default function MetricsModal({ editor, onClose, onChange, onSave }) {
  if (!editor) return null;
  const saving = editor.status === 'saving';
  const success = editor.status === 'success';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm px-4 py-10">
        <div
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_32px_100px_rgba(15,23,42,0.7)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-metrics-modal-title"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            aria-label="메트릭 편집 닫기"
          >
            ✕
          </button>
          <div className="space-y-6 p-7 sm:p-9">
            <header className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400/70">Metrics</p>
              <h3 id="admin-metrics-modal-title" className="text-xl font-semibold text-white sm:text-2xl">
                {editor.title}
              </h3>
              <p className="text-[12px] text-slate-500">Slug · {editor.slug}</p>
            </header>

            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400">조회수</label>
                <input
                  value={editor.views}
                  onChange={(event) => onChange('views', event.target.value)}
                  placeholder="숫자 입력"
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400">좋아요</label>
                <input
                  value={editor.likes}
                  onChange={(event) => onChange('likes', event.target.value)}
                  placeholder="숫자 입력"
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>
            </div>

            {editor.error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {editor.error}
              </div>
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
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.35)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-100 disabled:cursor-wait disabled:opacity-70"
              >
                {saving ? '저장 중…' : success ? '저장 완료!' : '메트릭 저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
