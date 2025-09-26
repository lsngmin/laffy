import ClientBlobUploader from '../../ClientBlobUploader';

export default function UploadForm({
  disabled,
  title,
  description,
  orientation,
  duration,
  onTitleChange,
  onDescriptionChange,
  onOrientationChange,
  onDurationChange,
  handleUploadUrl,
  onUpload,
}) {
  return (
    <div className="space-y-4 rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800/70">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Title</label>
          <input
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
            value={orientation}
            onChange={(event) => onOrientationChange(event.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
          >
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Description</label>
          <input
            disabled={disabled}
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
        <ClientBlobUploader
          handleUploadUrl={handleUploadUrl}
          accept="image/jpeg,image/png,image/webp,video/mp4"
          maxSizeMB={200}
          onUploaded={onUpload}
        />
      </div>
    </div>
  );
}
