import ClientBlobUploader from '../../ClientBlobUploader';

export default function UploadForm({
  hasToken,
  title,
  channel,
  onTitleChange,
  onChannelChange,
  handleUploadUrl,
  onUploaded,
  onClose,
}) {
  return (
    <div className="space-y-6 rounded-3xl bg-[#070b1b]/95 p-6 shadow-[0_0_45px_rgba(59,130,246,0.2)] ring-1 ring-slate-800/70 backdrop-blur">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-slate-300">콘텐츠 업로드</p>
        <h3 className="text-xl font-semibold text-slate-50">간편하게 새 콘텐츠를 등록하세요</h3>
        <p className="text-sm leading-relaxed text-slate-300">
          제목과 채널만 지정하면 파일을 올리는 즉시 메타 정보가 자동으로 저장됩니다.
        </p>
      </div>
      <div className="space-y-4">
        <label className="group flex flex-col gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 transition hover:border-sky-500/40">
          <span className="text-xs font-medium text-slate-300">콘텐츠 제목</span>
          <input
            disabled={!hasToken}
            type="text"
            placeholder="예) 6월 1주차 하이라이트"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full rounded-lg border border-slate-800/40 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 group-hover:border-sky-400/40 disabled:opacity-40"
          />
        </label>
        <label className="group flex flex-col gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 transition hover:border-sky-500/40">
          <span className="text-xs font-medium text-slate-300">채널 선택</span>
          <select
            disabled={!hasToken}
            value={channel}
            onChange={(event) => onChannelChange(event.target.value)}
            className="w-full rounded-lg border border-slate-800/40 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 group-hover:border-sky-400/40 disabled:opacity-40"
          >
            <option value="l">L 채널</option>
          </select>
        </label>
      </div>
      <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-cyan-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/80">파일 업로드</p>
          <span className="text-[11px] text-slate-300">최대 200MB · JPG / PNG / WEBP / MP4</span>
        </div>
        {hasToken ? (
          <ClientBlobUploader
            handleUploadUrl={handleUploadUrl}
            accept="image/jpeg,image/png,image/webp,video/mp4"
            maxSizeMB={200}
            onUploaded={onUploaded}
          />
        ) : (
          <div className="rounded-xl border border-slate-800/70 bg-black/40 px-4 py-3 text-sm text-slate-300">
            관리자 토큰이 있어야 업로드할 수 있어요.
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        {typeof onClose === 'function' && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            닫기
          </button>
        )}
      </div>
    </div>
  );
}
