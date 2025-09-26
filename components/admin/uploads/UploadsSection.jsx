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
  onRefresh,
  onLoadMore,
  hasMore,
  isLoading,
  isLoadingMore,
  isRefreshing,
  error,
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [orientationFilter, setOrientationFilter] = useState('');
  const [sortOption, setSortOption] = useState('recent');
  const handleRefresh = onRefresh || (() => {});
  const handleLoadMore = onLoadMore || (() => {});

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

  const isFiltering = Boolean(search || typeFilter || orientationFilter || (sortOption && sortOption !== 'recent'));
  const showEmptyState = !isLoading && !filteredItems.length;
  const canShowLoadMore = hasMore;

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
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {isRefreshing && <span className="hidden sm:inline">자동 새로고침 중…</span>}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="rounded-full border border-slate-700 px-3 py-1 font-medium text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
            >
              새로고침
            </button>
          </div>
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

          {isLoading && !items.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-700 px-4 py-12 text-center text-sm text-slate-400">
              콘텐츠를 불러오는 중입니다…
            </div>
          )}

          {error && !isLoading && !items.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-red-500/60 px-4 py-12 text-center text-sm text-red-300">
              콘텐츠를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
            </div>
          )}

          {showEmptyState && items.length > 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-700 px-4 py-12 text-center text-sm text-slate-400">
              {isFiltering ? '조건에 맞는 콘텐츠가 없습니다.' : '표시할 콘텐츠가 없습니다.'}
            </div>
          )}

          {canShowLoadMore && (
            <div className="col-span-full flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="rounded-full bg-slate-800 px-6 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-900 disabled:text-slate-500"
              >
                {isLoadingMore ? '불러오는 중…' : '더 보기'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
