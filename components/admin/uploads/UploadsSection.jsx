import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UploadFilters from './UploadFilters';
import UploadForm from './UploadForm';
import UploadedItemCard from './UploadedItemCard';
import buildRegisterPayload from '@/lib/admin/buildRegisterPayload';

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
  error,
  filters,
  onFiltersChange,
  tokenQueryString,
}) {
  const queryString = typeof tokenQueryString === 'string' ? tokenQueryString : '';
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkFeedback, setBulkFeedback] = useState({ status: 'idle', message: '' });
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [bulkTagForm, setBulkTagForm] = useState({ type: '' });
  const [isTagSubmitting, setIsTagSubmitting] = useState(false);
  const handleRefresh = onRefresh || (() => {});
  const handleLoadMore = onLoadMore || (() => {});

  const {
    search = '',
    type: typeFilter = '',
    sort: sortOption = 'recent',
    channel: channelFilter = '',
  } =
    filters || {};

  const changeFilters = useCallback(
    (next) => {
      if (typeof onFiltersChange === 'function') {
        onFiltersChange(next);
      }
    },
    [onFiltersChange]
  );

  const handleSearchChange = useCallback((value) => changeFilters({ search: value }), [changeFilters]);
  const handleTypeFilterChange = useCallback((value) => changeFilters({ type: value }), [changeFilters]);
  const handleSortChange = useCallback((value) => changeFilters({ sort: value }), [changeFilters]);
  const handleChannelFilterChange = useCallback((value) => changeFilters({ channel: value }), [changeFilters]);

  const itemKey = useCallback((item) => item?.pathname || item?.slug || item?.routePath || item?.url || '', []);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (!Array.isArray(items) || !items.length) return new Set();
      const next = new Set();
      items.forEach((item) => {
        const key = itemKey(item);
        if (prev.has(key)) {
          next.add(key);
        }
      });
      return next;
    });
  }, [items, itemKey]);

  const toggleSelectItem = useCallback(
    (item) => {
      const key = itemKey(item);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    [itemKey]
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(itemKey(item))),
    [items, itemKey, selectedIds]
  );

  const selectAllRef = useRef(null);
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const toggleSelectAll = useCallback(() => {
    if (!items.length) return;
    setSelectedIds((prev) => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map((item) => itemKey(item)));
    });
  }, [itemKey, items]);

  useEffect(() => {
    if (bulkFeedback.status === 'idle') return undefined;
    const timer = setTimeout(() => {
      setBulkFeedback((prev) => (prev.status === 'success' ? { status: 'idle', message: '' } : prev));
    }, 4000);
    return () => clearTimeout(timer);
  }, [bulkFeedback.status]);

  const isFiltering = Boolean(
    search ||
      typeFilter ||
      channelFilter ||
      (sortOption && sortOption !== 'recent')
  );
  const showEmptyState = !isLoading && !items.length;
  const canShowLoadMore = hasMore;
  const selectedCount = selectedIds.size;

  const handleBulkDelete = useCallback(async () => {
    if (!hasToken || !selectedItems.length) return;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`선택한 ${selectedItems.length}개 항목을 삭제할까요?`);
      if (!confirmed) return;
    }

    setBulkFeedback({ status: 'pending', message: '선택 항목을 삭제하는 중입니다…' });

    try {
      for (const item of selectedItems) {
        const body = item.url
          ? { url: item.url, slug: item.slug, type: item.type, channel: item.channel }
          : { pathname: item.pathname, slug: item.slug, type: item.type, channel: item.channel };
        const res = await fetch(`/api/admin/delete${queryString}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          throw new Error('delete_failed');
        }
      }
      setBulkFeedback({ status: 'success', message: `${selectedItems.length}개 항목을 삭제했습니다.` });
      setSelectedIds(new Set());
      handleRefresh();
    } catch (error) {
      console.error('Bulk delete failed', error);
      setBulkFeedback({ status: 'error', message: '선택 항목 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.' });
    }
  }, [handleRefresh, hasToken, queryString, selectedItems]);

  const handleBulkCopy = useCallback(async () => {
    if (!selectedItems.length) return;
    const links = selectedItems
      .map((item) => {
        if (!item.routePath) return null;
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return origin ? new URL(item.routePath, origin).toString() : item.routePath;
      })
      .filter(Boolean);

    if (!links.length) {
      setBulkFeedback({ status: 'error', message: '복사할 링크가 없습니다.' });
      return;
    }

    try {
      const text = links.join('\n');
      const canUseClipboard =
        typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function';

      if (canUseClipboard) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        if (typeof document.execCommand === 'function') {
          document.execCommand('copy');
        } else {
          document.body.removeChild(textarea);
          throw new Error('clipboard_unavailable');
        }
        document.body.removeChild(textarea);
      } else {
        throw new Error('clipboard_unavailable');
      }

      setBulkFeedback({ status: 'success', message: `${links.length}개 링크를 복사했습니다.` });
    } catch (error) {
      console.error('Bulk copy failed', error);
      setBulkFeedback({ status: 'error', message: '링크 복사에 실패했어요. 다른 브라우저에서 시도해 주세요.' });
    }
  }, [selectedItems]);

  const handleOpenTagDialog = useCallback(() => {
    setBulkTagForm({ type: '' });
    setTagDialogOpen(true);
    setBulkFeedback({ status: 'idle', message: '' });
  }, []);

  const handleCloseTagDialog = useCallback(() => {
    if (isTagSubmitting) return;
    setTagDialogOpen(false);
    setBulkTagForm({ type: '' });
  }, [isTagSubmitting]);

  const handleBulkTagSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!hasToken || !selectedItems.length) return;

      const { type } = bulkTagForm;
      if (!type) {
        setBulkFeedback({ status: 'error', message: '변경할 타입을 선택해 주세요.' });
        return;
      }

      setIsTagSubmitting(true);
      setBulkFeedback({ status: 'pending', message: '선택 항목의 태그를 업데이트하는 중입니다…' });

      try {
        for (const item of selectedItems) {
          const payload = buildRegisterPayload(item);
          if (!payload) continue;
          if (type) payload.type = type;
          if (item.url) payload.metaUrl = item.url;

          const res = await fetch(`/api/admin/register${queryString}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            throw new Error('tag_update_failed');
          }
        }

        setBulkFeedback({ status: 'success', message: `${selectedItems.length}개 항목의 타입을 변경했습니다.` });
        setTagDialogOpen(false);
        setSelectedIds(new Set());
        handleRefresh();
      } catch (error) {
        console.error('Bulk tag update failed', error);
        setBulkFeedback({ status: 'error', message: '타입 변경에 실패했어요. 잠시 후 다시 시도해 주세요.' });
      } finally {
        setIsTagSubmitting(false);
      }
    },
    [bulkTagForm, handleRefresh, hasToken, queryString, selectedItems]
  );

  const activeChannelLabel = useMemo(() => {
    if (channelFilter === 'l') return 'L 채널 콘텐츠';
    if (channelFilter === 'x') return 'X 채널 콘텐츠';
    return '전체 채널 콘텐츠';
  }, [channelFilter]);

  const handleUploadComplete = useCallback(
    async (blob) => {
      const result = await registerMeta(blob);
      if (result) {
        setUploadModalOpen(false);
      }
    },
    [registerMeta, setUploadModalOpen]
  );

  const handleCloseUploadModal = useCallback(() => {
    setUploadModalOpen(false);
  }, []);

  return (
    <section className="space-y-6">
      <div className="space-y-6 rounded-3xl border border-slate-800/60 bg-gradient-to-r from-[#050916]/90 via-[#060b1c]/80 to-[#0a1124]/90 p-6 shadow-lg shadow-cyan-900/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.48em] text-slate-400">콘텐츠 관리</p>
            <h2 className="text-2xl font-semibold text-slate-50">업로드한 자료를 한눈에 살펴보세요</h2>
            <p className="text-sm text-slate-300">
              {activeChannelLabel} {items.length}개를 손쉽게 정리하고 공유할 수 있어요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasToken && (
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/40 transition hover:from-sky-400 hover:via-cyan-400 hover:to-indigo-400"
              >
                새 콘텐츠 업로드
              </button>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="rounded-full border border-slate-700/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:border-slate-900 disabled:text-slate-600"
            >
              목록 새로고침
            </button>
          </div>
        </div>
        <UploadFilters
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
          channelFilter={channelFilter}
          onChannelFilterChange={handleChannelFilterChange}
          sortOption={sortOption}
          onSortOptionChange={handleSortChange}
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-3 rounded-3xl border border-slate-800/60 bg-slate-950/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-400"
                  onChange={toggleSelectAll}
                  checked={allSelected}
                />
                전체 선택
              </label>
              <span className="rounded-full bg-slate-900/40 px-3 py-1 text-xs text-slate-400">전체 {items.length}개</span>
              {selectedCount > 0 && (
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                  {selectedCount}개 선택됨
                </span>
              )}
            </div>
          </div>
          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBulkCopy}
                className="rounded-full bg-slate-800 px-4 py-1.5 text-sm text-slate-200 transition hover:bg-slate-700"
              >
                링크 복사
              </button>
              <button
                type="button"
                onClick={handleOpenTagDialog}
                className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                타입 변경
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="rounded-full bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {bulkFeedback.message && (
          <div
            className={`rounded-3xl border px-4 py-3 text-sm shadow ${
              bulkFeedback.status === 'error'
                ? 'border-rose-500/70 bg-rose-500/15 text-rose-200 shadow-rose-900/30'
                : bulkFeedback.status === 'pending'
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-200 shadow-sky-900/30'
                  : 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200 shadow-emerald-900/20'
            }`}
          >
            {bulkFeedback.message}
          </div>
        )}

        {tagDialogOpen && (
          <form
            onSubmit={handleBulkTagSubmit}
            className="space-y-4 rounded-3xl border border-slate-800/70 bg-[#060b1c]/90 p-5 text-sm text-slate-200 shadow-inner shadow-slate-900/40"
          >
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.28em] text-slate-400">타입</span>
                <select
                  value={bulkTagForm.type}
                  onChange={(event) => setBulkTagForm((prev) => ({ ...prev, type: event.target.value }))}
                  className="rounded-xl border border-slate-800/60 bg-black/40 px-3 py-1 text-sm text-slate-100"
                >
                  <option value="">변경 없음</option>
                  <option value="video">영상</option>
                  <option value="image">이미지</option>
                </select>
              </label>
              <span className="text-xs text-slate-500">선택된 항목에 동일한 타입을 적용합니다.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isTagSubmitting}
                className="rounded-full bg-emerald-600 px-5 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900 disabled:text-emerald-300"
              >
                {isTagSubmitting ? '적용 중…' : '적용하기'}
              </button>
              <button
                type="button"
                onClick={handleCloseTagDialog}
                className="rounded-full bg-slate-800 px-5 py-1.5 text-sm text-slate-200 transition hover:bg-slate-700"
              >
                취소
              </button>
            </div>
          </form>
        )}

        <div className="grid gap-4">
          {items.map((item) => (
            <UploadedItemCard
              key={item.pathname || item.slug || item.routePath || item.url}
              item={item}
              hasToken={hasToken}
              copiedSlug={copiedSlug}
              onCopy={onCopy}
              onEdit={onEdit}
              onDelete={onDelete}
              selectable={hasToken}
              selected={selectedIds.has(itemKey(item))}
              onToggleSelect={() => toggleSelectItem(item)}
            />
          ))}

          {isLoading && !items.length && (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-700 px-4 py-12 text-center text-sm text-slate-400">
              콘텐츠를 불러오는 중입니다…
            </div>
          )}

          {error && !isLoading && !items.length && (
            <div className="col-span-full rounded-3xl border border-dashed border-rose-500/70 px-4 py-12 text-center text-sm text-rose-200">
              콘텐츠를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
            </div>
          )}

          {showEmptyState && (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-700 px-4 py-12 text-center text-sm text-slate-400">
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

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur">
          <div className="relative w-full max-w-3xl">
            <button
              type="button"
              onClick={handleCloseUploadModal}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/80 bg-black/40 text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              <span className="sr-only">업로드 포털 닫기</span>
              ×
            </button>
            <UploadForm
              hasToken={hasToken}
              title={uploadFormState.title}
              channel={uploadFormState.channel}
              onTitleChange={uploadFormState.setTitle}
              onChannelChange={uploadFormState.setChannel}
              handleUploadUrl={uploadFormState.handleUploadUrl}
              onUploaded={handleUploadComplete}
              onClose={handleCloseUploadModal}
            />
          </div>
        </div>
      )}
    </section>
  );
}
