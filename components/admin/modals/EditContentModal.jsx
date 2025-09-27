import ModalPortal from './ModalPortal';

export default function EditContentModal({
  editingItem,
  editForm,
  editStatus,
  editError,
  editUploadState,
  editUploadMessage,
  editFileInputRef,
  onClose,
  onFieldChange,
  onImageUpload,
  onRevertImage,
  onOpenTimestamps,
  onSave,
}) {
  if (!editingItem) return null;
  const saving = editStatus === 'saving';
  const success = editStatus === 'success';

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm px-4 py-10">
        <div
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_48px_140px_rgba(15,23,42,0.68)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-edit-modal-title"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            aria-label="편집 창 닫기"
          >
            ✕
          </button>
          <div className="space-y-6 p-7 sm:p-10">
            <header className="space-y-2">
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400/70">Edit Content</p>
              <h3 id="admin-edit-modal-title" className="text-2xl font-semibold text-white sm:text-3xl">
                {editingItem.title || editingItem.slug}
              </h3>
              <p className="text-[12px] text-slate-500">Slug · {editingItem.slug}</p>
            </header>

              <div className="grid gap-5">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400">Title</label>
                  <input
                    value={editForm.title}
                  onChange={(event) => onFieldChange('title', event.target.value)}
                  className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="콘텐츠 제목"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-slate-400">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(event) => onFieldChange('description', event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="간단한 설명을 입력해 주세요."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400">Duration (seconds)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={editForm.durationSeconds}
                    onChange={(event) => onFieldChange('durationSeconds', event.target.value)}
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="예: 123"
                  />
                  <p className="text-xs text-slate-500">초 단위로 입력해 주세요. 비워두면 기존 값이 유지됩니다.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400">Channel</label>
                  <select
                    value={editForm.channel || 'x'}
                    onChange={(event) => onFieldChange('channel', event.target.value)}
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    <option value="x">x</option>
                    <option value="l">l</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-widest text-slate-400">대표 이미지</label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 sm:h-44 sm:w-44">
                    {editForm.previewUrl ? (
                      <img src={editForm.previewUrl} alt={`${editingItem.slug} preview`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-slate-500">이미지가 없습니다</div>
                    )}
                    {editUploadState === 'uploading' && (
                      <div className="absolute inset-0 grid place-items-center bg-slate-950/70 text-xs font-medium text-indigo-200">
                        업로드 중…
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3 text-xs text-slate-300/80">
                    <p>새로운 이미지를 업로드하면 즉시 교체됩니다. 이미지 비율은 원본에 맞춰 표시돼요.</p>
                    <div className="flex flex-wrap gap-3">
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={onImageUpload}
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(99,102,241,0.4)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-200"
                      >
                        이미지 교체
                      </button>
                      <button
                        type="button"
                        onClick={onRevertImage}
                        disabled={!editForm.imageUrl}
                        className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        원본으로
                      </button>
                    </div>
                    {editUploadMessage && (
                      <p
                        className={`text-xs ${
                          editUploadState === 'error'
                            ? 'text-rose-300'
                            : editUploadState === 'success'
                              ? 'text-emerald-300'
                              : 'text-slate-400'
                        }`}
                      >
                        {editUploadMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-4 text-sm text-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">타임스탬프</p>
                    <p className="text-[12px] text-slate-500">총 {editingItem.timestamps?.length ?? 0}개</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTimestamps(editingItem)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                  >
                    타임스탬프 편집
                  </button>
                </div>
              </div>
            </div>

            {editError && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{editError}</div>
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
                {saving ? '저장 중…' : success ? '저장 완료!' : '변경사항 저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
