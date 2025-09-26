import ClientBlobUploader from '../../ClientBlobUploader';

export default function UploadForm({
  hasToken,
  title,
  description,
  orientation,
  duration,
  onTitleChange,
  onDescriptionChange,
  onOrientationChange,
  onDurationChange,
  handleUploadUrl,
  onUploaded,
}) {
  return (
    <div className="space-y-4 rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800/70">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Title</label>
          <input
            disabled={!hasToken}
            type="text"
            placeholder="Title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Duration (s)</label>
          <input
            disabled={!hasToken}
            type="number"
            min="0"
            placeholder="0"
            value={duration}
            onChange={(event) => onDurationChange(event.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Orientation</label>
          <select
            disabled={!hasToken}
            value={orientation}
            onChange={(event) => onOrientationChange(event.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
          >
            <option value="landscape">landscape</option>
            <option value="portrait">portrait</option>
            <option value="square">square</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Description</label>
          <input
            disabled={!hasToken}
            type="text"
            placeholder="Description"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
          />
        </div>
      </div>
      <div className="pt-2">
        <label className="mb-2 block text-xs uppercase tracking-widest text-slate-400">Upload</label>
        {hasToken ? (
          <ClientBlobUploader
            handleUploadUrl={handleUploadUrl}
            accept="image/jpeg,image/png,image/webp,video/mp4"
            maxSizeMB={200}
            onUploaded={onUploaded}
          />
        ) : (
          <div className="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-400">
            관리자 토큰이 필요합니다.
          </div>
        )}
      </div>
    </div>
  );
}
