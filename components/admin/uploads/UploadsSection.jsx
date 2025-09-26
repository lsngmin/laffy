import UploadFilters from './UploadFilters';
import UploadForm from './UploadForm';
import UploadedItemCard from './UploadedItemCard';

export default function UploadsSection({
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
  onUpload,
  filters,
  onFilters,
  availableTypes,
  items,
  copiedSlug,
  onCopy,
  onEdit,
  onDelete,
}) {
  return (
    <section className="space-y-8">
      <UploadForm
        disabled={!hasToken}
        title={title}
        description={description}
        orientation={orientation}
        duration={duration}
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
        onOrientationChange={onOrientationChange}
        onDurationChange={onDurationChange}
        handleUploadUrl={handleUploadUrl}
        onUpload={onUpload}
      />

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Uploaded</h2>
          <UploadFilters
            search={filters.search}
            sort={filters.sort}
            type={filters.type}
            availableTypes={availableTypes}
            onSearchChange={(value) => onFilters({ ...filters, search: value })}
            onSortChange={(value) => onFilters({ ...filters, sort: value })}
            onTypeChange={(value) => onFilters({ ...filters, type: value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <UploadedItemCard
              key={item.pathname || item.slug}
              item={item}
              copied={copiedSlug === item.slug}
              hasToken={hasToken}
              onCopy={() => onCopy(item)}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item)}
            />
          ))}
          {items.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-700 px-4 py-12 text-center text-sm text-slate-400">
              아직 업로드된 콘텐츠가 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
