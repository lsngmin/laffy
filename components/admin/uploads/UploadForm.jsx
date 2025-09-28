import ClientBlobUploader from '../../ClientBlobUploader';

export default function UploadForm({
  hasToken,
  title,
  duration,
  channel,
  onTitleChange,
  onDurationChange,
  onChannelChange,
  handleUploadUrl,
  onUploaded,
}) {
  return (
    <div className="space-y-6 rounded-3xl bg-[#070b1b]/95 p-6 shadow-[0_0_45px_rgba(59,130,246,0.2)] ring-1 ring-slate-800/70 backdrop-blur">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">콘텐츠 메타</p>
        <h3 className="text-lg font-semibold text-slate-50">새로운 L 채널 아카이브</h3>
        <p className="text-sm text-slate-400">
          제목과 러닝타임을 입력한 뒤 파일을 업로드하면 메타 정보가 즉시 등록됩니다.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="group flex flex-col gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 transition hover:border-sky-500/40">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Title</span>
          <input
            disabled={!hasToken}
            type="text"
            placeholder="트윗 카드 타이틀"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full rounded-lg border border-slate-800/40 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 group-hover:border-sky-400/40 disabled:opacity-40"
          />
        </label>
        <label className="group flex flex-col gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 transition hover:border-sky-500/40">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Duration (sec)</span>
          <input
            disabled={!hasToken}
            type="number"
            min="0"
            placeholder="0"
            value={duration}
            onChange={(event) => onDurationChange(event.target.value)}
            className="w-full rounded-lg border border-slate-800/40 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 group-hover:border-sky-400/40 disabled:opacity-40"
          />
        </label>
        <label className="group flex flex-col gap-2 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 transition hover:border-sky-500/40 sm:col-span-2">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">Channel</span>
          <select
            disabled={!hasToken}
            value={channel}
            onChange={(event) => onChannelChange(event.target.value)}
            className="w-full rounded-lg border border-slate-800/40 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500/60 group-hover:border-sky-400/40 disabled:opacity-40"
          >
            <option value="l">L</option>
            <option value="x">X</option>
          </select>
        </label>
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-cyan-950/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/80">Asset Upload</p>
          <span className="text-[11px] text-slate-400">최대 200MB · JPG / PNG / WEBP / MP4</span>
        </div>
        {hasToken ? (
          <ClientBlobUploader
            handleUploadUrl={handleUploadUrl}
            accept="image/jpeg,image/png,image/webp,video/mp4"
            maxSizeMB={200}
            onUploaded={onUploaded}
          />
        ) : (
          <div className="rounded-xl border border-slate-800/70 bg-black/40 px-4 py-3 text-sm text-slate-400">
            관리자 토큰이 필요합니다.
          </div>
        )}
      </div>
    </div>
  );
}
