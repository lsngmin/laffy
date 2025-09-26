import ModalPortal from './ModalPortal';

export default function TimestampsEditorModal({
  editor,
  onClose,
  onFieldChange,
  onAddTimestamp,
  onRemoveTimestamp,
  onSave,
}) {
  if (!editor) return null;
  const { timestamps, title, status, error } = editor;
  const saving = status === 'saving';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur px-4 py-10">
        <div
          className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_48px_140px_rgba(55,65,81,0.7)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timestamps-editor-title"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-200"
            aria-label="타임스탬프 편집 닫기"
          >
            ✕
          </button>
          <div className="space-y-6 p-8">
            <header className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400/70">Timestamps</p>
              <h3 id="timestamps-editor-title" className="text-2xl font-semibold text-white">
                {title} · 구간 편집
              </h3>
            </header>

            <div className="space-y-4">
              {timestamps.map((stamp, index) => (
                <div
                  key={stamp.id}
                  className="grid gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 sm:grid-cols-12 sm:items-center"
                >
                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase tracking-widest text-slate-400">Seconds</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={stamp.seconds}
                      onChange={(event) => onFieldChange(index, 'seconds', event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="text-xs uppercase tracking-widest text-slate-400">Label</label>
                    <input
                      value={stamp.label}
                      onChange={(event) => onFieldChange(index, 'label', event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="text-xs uppercase tracking-widest text-slate-400">Description</label>
                    <input
                      value={stamp.description}
                      onChange={(event) => onFieldChange(index, 'description', event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700/60 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => onRemoveTimestamp(index)}
                      className="inline-flex items-center justify-center rounded-full border border-rose-500/40 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={onAddTimestamp}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(59,130,246,0.4)] transition hover:brightness-110"
              >
                + 타임스탬프 추가
              </button>
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
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.35)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-100 disabled:cursor-wait disabled:opacity-70"
              >
                {saving ? '저장 중…' : '타임스탬프 저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
