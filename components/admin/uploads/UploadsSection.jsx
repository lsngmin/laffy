import { useMemo, useState } from 'react';
import UploadFilters from './UploadFilters';
import UploadForm from './UploadForm';
import UploadedItemCard from './UploadedItemCard';

export default function UploadsSection({
  hasToken,
  items,
  copiedSlug,
  onCopy,
  onEdit,
  onDelete,
  registerMeta,
  uploadFormState,
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [orientationFilter, setOrientationFilter] = useState('');
  const [sortOption, setSortOption] = useState('recent');

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    let next = items.filter((item) => {
      const matchesSearch = normalizedSearch
        ? [item.title, item.slug, item.description]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch))
        : true;
      if (!matchesSearch) return false;
      if (typeFilter && (item.type || '').toLowerCase() !== typeFilter) return false;
      if (orientationFilter && (item.orientation || '') !== orientationFilter) return false;
      return true;
    });

    if (sortOption === 'title') {
      next = [...next].sort((a, b) => {
        const aTitle = (a.title || a.slug || '').toLowerCase();
        const bTitle = (b.title || b.slug || '').toLowerCase();
        return aTitle.localeCompare(bTitle);
      });
    } else if (sortOption === 'duration') {
      next = [...next].sort((a, b) => (Number(b.durationSeconds) || 0) - (Number(a.durationSeconds) || 0));
    }

    return next;
  }, [items, orientationFilter, search, sortOption, typeFilter]);

  return (
    <section className="space-y-8">
      <UploadForm
        hasToken={hasToken}
        title={uploadFormState.title}
        description={uploadFormState.description}
        orientation={uploadFormState.orientation}
        duration={uploadFormState.duration}
        onTitleChange={uploadFormState.setTitle}
        onDescriptionChange={uploadFormState.setDescription}
        onOrientationChange={uploadFormState.setOrientation}
        onDurationChange={uploadFormState.setDuration}
        handleUploadUrl={uploadFormState.handleUploadUrl}
        onUploaded={registerMeta}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Uploaded ({filteredItems.length}/{items.length})
          </h2>
        </div>
        <UploadFilters
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          orientationFilter={orientationFilter}
          onOrientationFilterChange={setOrientationFilter}
          sortOption={sortOption}
          onSortOptionChange={setSortOption}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredItems.map((item) => (
            <UploadedItemCard
              key={item.pathname || item.slug || item.routePath || item.url}
              item={item}
              hasToken={hasToken}
              copiedSlug={copiedSlug}
              onCopy={onCopy}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {!filteredItems.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-700 px-4 py-12 text-center text-sm text-slate-400">
              조건에 맞는 콘텐츠가 없습니다.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
