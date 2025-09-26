import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import AdminPageShell from '../components/admin/layout/AdminPageShell';
import AdminNav from '../components/admin/layout/AdminNav';
import TokenNotice from '../components/admin/feedback/TokenNotice';
import UploadsSection from '../components/admin/uploads/UploadsSection';
import AnalyticsOverview from '../components/admin/analytics/AnalyticsOverview';
import AnalyticsToolbar from '../components/admin/analytics/AnalyticsToolbar';
import AnalyticsTable from '../components/admin/analytics/AnalyticsTable';
import AdsterraControls from '../components/admin/adsterra/AdsterraControls';
import AdsterraSummaryCards from '../components/admin/adsterra/AdsterraSummaryCards';
import AdsterraStatsTable from '../components/admin/adsterra/AdsterraStatsTable';
import AdsterraFilterChips from '../components/admin/adsterra/filters/AdsterraFilterChips';
import AdsterraChartPanel from '../components/admin/adsterra/AdsterraChartPanel';
import AdsterraPresetControls from '../components/admin/adsterra/AdsterraPresetControls';
import UndoToast from '../components/admin/feedback/UndoToast';
import MetricsModal from '../components/admin/modals/MetricsModal';
import DeleteModal from '../components/admin/modals/DeleteModal';
import EditContentModal from '../components/admin/modals/EditContentModal';
import buildAnalyticsCsv from '../components/admin/analytics/export/AnalyticsCsvExporter';
import useAdminItems from '../hooks/admin/useAdminItems';
import useClipboard from '../hooks/admin/useClipboard';
import useAnalyticsMetrics from '../hooks/admin/useAnalyticsMetrics';
import useAdsterraStats, { ADSTERRA_ALL_PLACEMENTS_VALUE } from '../hooks/admin/useAdsterraStats';
import useAdminModals from '../hooks/admin/useAdminModals';

function getUploadTimestamp(item) {
  const candidates = [
    item.updatedAt,
    item.uploadedAt,
    item.createdAt,
    item.rawMeta?.updatedAt,
    item.rawMeta?.createdAt,
    item.publishedAt,
  ];
  for (const value of candidates) {
    if (!value) continue;
    const numeric = new Date(value).getTime();
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

async function generateSlug(blob) {
  const raw = `${blob?.pathname || ''}-${blob?.url || ''}-${Date.now()}-${Math.random()}`;
  const cryptoObj = globalThis.crypto;

  if (cryptoObj?.subtle && typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder();
    const digest = await cryptoObj.subtle.digest('SHA-256', encoder.encode(raw));
    const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 16);
  }

  if (typeof cryptoObj?.randomUUID === 'function') {
    return cryptoObj.randomUUID().replace(/-/g, '').slice(0, 16);
  }

  return raw.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || `slug-${Date.now()}`;
}

export default function Admin() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [view, setView] = useState('uploads');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orientation, setOrientation] = useState('landscape');
  const [duration, setDuration] = useState('0');
  const [uploadFilters, setUploadFilters] = useState({ search: '', sort: 'recent', type: '' });
  const [analyticsSort, setAnalyticsSort] = useState('views');
  const [analyticsColumns, setAnalyticsColumns] = useState({
    views: true,
    likes: true,
    likeRate: true,
    link: true,
    edit: true,
  });
  const [adsterraPresets, setAdsterraPresets] = useState([]);

  const { items, setItems, refresh, hasToken, qs } = useAdminItems(token);
  const { copiedValue: copiedSlug, copy } = useClipboard();
  const {
    metricsBySlug,
    setMetricsBySlug,
    metricsLoading,
    metricsError,
    sortedAnalyticsRows,
    analyticsTotals,
    averageLikeRate,
  } = useAnalyticsMetrics({ items, view, hasToken });
  const {
    editingItem,
    editForm,
    editInitialPreview,
    editError,
    editStatus,
    editUploadState,
    editUploadMessage,
    editFileInputRef,
    openEditModal,
    closeEditModal,
    handleEditFieldChange,
    handleEditImageUpload,
    handleRevertImage,
    handleSaveEdit,
    pendingDelete,
    deleteStatus,
    deleteError,
    openDeleteModal,
    closeDeleteModal,
    handleConfirmDelete,
    undoInfo,
    undoStatus,
    handleUndoDelete,
    handleDismissUndo,
    metricsEditor,
    openMetricsEditor,
    closeMetricsEditor,
    handleMetricsFieldChange,
    handleMetricsSave,
  } = useAdminModals({ hasToken, qs, refresh, setItems, setMetricsBySlug });
  const {
    adsterraActiveToken,
    adsterraDomainId,
    adsterraDomainName,
    adsterraPlacements,
    adsterraPlacementId,
    setAdsterraPlacementId,
    handleAdsterraPlacementChange,
    adsterraStartDate,
    setAdsterraStartDate,
    adsterraEndDate,
    setAdsterraEndDate,
    adsterraStats,
    adsterraLoadingPlacements,
    adsterraLoadingStats,
    adsterraError,
    adsterraStatus,
    adsterraCountryFilter,
    setAdsterraCountryFilter,
    adsterraOsFilter,
    setAdsterraOsFilter,
    adsterraDeviceFilter,
    setAdsterraDeviceFilter,
    adsterraDeviceFormatFilter,
    setAdsterraDeviceFormatFilter,
    fetchAdsterraPlacements,
    handleFetchAdsterraStats,
    handleResetAdsterraDates,
    adsterraAllPlacementsSelected,
    adsterraCanFetchStats,
    adsterraPlacementLabelMap,
    adsterraCountryOptions,
    adsterraOsOptions,
    adsterraDeviceOptions,
    adsterraDeviceFormatOptions,
    filteredAdsterraStats,
    adsterraTotals,
  } = useAdsterraStats({ visible: view === 'adsterra' });

  useEffect(() => {
    if (!hasToken && view !== 'uploads') {
      setView('uploads');
    }
  }, [hasToken, view]);

  const navItems = useMemo(
    () => [
      { key: 'uploads', label: '업로드 · 목록', requiresToken: false },
      { key: 'analytics', label: '분석', requiresToken: true },
      { key: 'adsterra', label: '통계', requiresToken: true },
    ],
    []
  );

  const numberFormatter = useMemo(() => new Intl.NumberFormat('ko-KR'), []);
  const decimalFormatterTwo = useMemo(
    () => new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    []
  );
  const decimalFormatterThree = useMemo(
    () => new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
    []
  );

  const formatNumber = useCallback(
    (value) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return '0';
      return numberFormatter.format(value);
    },
    [numberFormatter]
  );

  const formatDecimal = useCallback(
    (value, digits = 2) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return digits === 3
          ? decimalFormatterThree.format(0)
          : decimalFormatterTwo.format(0);
      }
      const formatter = digits === 3 ? decimalFormatterThree : decimalFormatterTwo;
      return formatter.format(numeric);
    },
    [decimalFormatterThree, decimalFormatterTwo]
  );

  const formatPercent = useCallback(
    (value) => {
      if (!Number.isFinite(value)) return '0%';
      return `${(value * 100).toFixed(1)}%`;
    },
    []
  );

  const availableUploadTypes = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      if (item.type) set.add(item.type);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredUploads = useMemo(() => {
    const search = uploadFilters.search.trim().toLowerCase();
    const type = uploadFilters.type;
    const sorted = [...items]
      .filter((item) => {
        if (type && item.type !== type) return false;
        if (!search) return true;
        const haystacks = [item.slug, item.title, item.description];
        return haystacks.some((value) =>
          typeof value === 'string' ? value.toLowerCase().includes(search) : false
        );
      })
      .sort((a, b) => {
        switch (uploadFilters.sort) {
          case 'title':
            return (a.title || a.slug || '').localeCompare(b.title || b.slug || '');
          case 'views':
            return (b.views || 0) - (a.views || 0);
          default: {
            const aTime = getUploadTimestamp(a);
            const bTime = getUploadTimestamp(b);
            if (aTime === bTime) return (b.slug || '').localeCompare(a.slug || '');
            return bTime - aTime;
          }
        }
      });
    return sorted;
  }, [items, uploadFilters]);

  const analyticsSortOptions = useMemo(
    () => [
      { value: 'views', label: '조회수 순' },
      { value: 'likes', label: '좋아요 순' },
      { value: 'title', label: '제목 A-Z' },
    ],
    []
  );

  const analyticsRowsForDisplay = useMemo(() => {
    const base = [...sortedAnalyticsRows];
    if (analyticsSort === 'likes') {
      base.sort((a, b) => (b.metrics?.likes || 0) - (a.metrics?.likes || 0));
    } else if (analyticsSort === 'title') {
      base.sort((a, b) => (a.title || a.slug || '').localeCompare(b.title || b.slug || ''));
    } else {
      base.sort((a, b) => (b.metrics?.views || 0) - (a.metrics?.views || 0));
    }
    return base;
  }, [sortedAnalyticsRows, analyticsSort]);

  const handleAnalyticsToggleColumn = useCallback((key, value) => {
    setAnalyticsColumns((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleExportAnalytics = useCallback(() => {
    try {
      const csv = buildAnalyticsCsv(analyticsRowsForDisplay);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV export failed', error);
    }
  }, [analyticsRowsForDisplay]);

  const handleCopyRoute = useCallback(
    async (item) => {
      if (!item?.routePath) return;
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const absoluteUrl = origin ? new URL(item.routePath, origin).toString() : item.routePath;
        await copy(absoluteUrl);
      } catch (error) {
        console.error('Copy failed', error);
      }
    },
    [copy]
  );

  const handleUploadMeta = useCallback(
    async (blob) => {
      const slug = await generateSlug(blob);
      const contentType = typeof blob?.contentType === 'string' ? blob.contentType : '';
      const pathname = typeof blob?.pathname === 'string' ? blob.pathname : '';
      const lowerPathname = pathname.toLowerCase();
      const lowerUrl = typeof blob?.url === 'string' ? blob.url.toLowerCase() : '';
      const imageExtPattern = /(\.jpe?g|\.png|\.webp)$/;
      const hasImageExtension = imageExtPattern.test(lowerPathname) || imageExtPattern.test(lowerUrl);
      const isImage = contentType.startsWith('image/') || hasImageExtension;
      const normalizedType = isImage ? 'image' : 'video';

      const res = await fetch(`/api/admin/register${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug,
          title,
          description,
          url: blob.url,
          durationSeconds: (() => {
            const parsed = Number(duration);
            return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
          })(),
          orientation,
          type: normalizedType,
          poster: isImage ? blob.url : null,
          thumbnail: isImage ? blob.url : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`메타 저장 실패: ${err.error || res.status}`);
        return;
      }

      setTitle('');
      setDescription('');
      setDuration('0');
      refresh();
    },
    [description, duration, orientation, qs, refresh, title]
  );

  const analyticsVisible = view === 'analytics';
  const adsterraVisible = view === 'adsterra';

  const filterChips = (
    <AdsterraFilterChips
      filters={{
        country: adsterraCountryFilter,
        os: adsterraOsFilter,
        device: adsterraDeviceFilter,
        format: adsterraDeviceFormatFilter,
      }}
      onClear={(key) => {
        if (key === 'all') {
          setAdsterraCountryFilter('');
          setAdsterraOsFilter('');
          setAdsterraDeviceFilter('');
          setAdsterraDeviceFormatFilter('');
          return;
        }
        if (key === 'country') setAdsterraCountryFilter('');
        if (key === 'os') setAdsterraOsFilter('');
        if (key === 'device') setAdsterraDeviceFilter('');
        if (key === 'format') setAdsterraDeviceFormatFilter('');
      }}
    />
  );

  const handleSavePreset = useCallback(
    (name) => {
      const preset = {
        name,
        placementId: adsterraPlacementId,
        startDate: adsterraStartDate,
        endDate: adsterraEndDate,
        filters: {
          country: adsterraCountryFilter,
          os: adsterraOsFilter,
          device: adsterraDeviceFilter,
          format: adsterraDeviceFormatFilter,
        },
      };
      setAdsterraPresets((prev) => {
        const filtered = prev.filter((item) => item.name !== name);
        return [preset, ...filtered];
      });
    },
    [
      adsterraCountryFilter,
      adsterraDeviceFilter,
      adsterraDeviceFormatFilter,
      adsterraEndDate,
      adsterraOsFilter,
      adsterraPlacementId,
      adsterraStartDate,
    ]
  );

  const handleApplyPreset = useCallback(
    (preset) => {
      if (!preset) return;
      setAdsterraPlacementId(preset.placementId || ADSTERRA_ALL_PLACEMENTS_VALUE);
      setAdsterraStartDate(preset.startDate || '');
      setAdsterraEndDate(preset.endDate || '');
      setAdsterraCountryFilter(preset.filters?.country || '');
      setAdsterraOsFilter(preset.filters?.os || '');
      setAdsterraDeviceFilter(preset.filters?.device || '');
      setAdsterraDeviceFormatFilter(preset.filters?.format || '');
    },
    [
      setAdsterraDeviceFilter,
      setAdsterraDeviceFormatFilter,
      setAdsterraEndDate,
      setAdsterraOsFilter,
      setAdsterraPlacementId,
      setAdsterraCountryFilter,
      setAdsterraStartDate,
    ]
  );

  const handleDeletePreset = useCallback((preset) => {
    setAdsterraPresets((prev) => prev.filter((item) => item.name !== preset.name));
  }, []);

  const presetControls = (
    <AdsterraPresetControls
      presets={adsterraPresets}
      onSavePreset={handleSavePreset}
      onApplyPreset={handleApplyPreset}
      onDeletePreset={handleDeletePreset}
    />
  );

  const headerContent = (
    <>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="bg-gradient-to-r from-indigo-200 via-white to-pink-200 bg-clip-text text-3xl font-extrabold text-transparent">LAFFY Admin</h1>
        <div className="flex items-center gap-2 self-start rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
          <span className="uppercase tracking-[0.3em]">{hasToken ? 'ACCESS' : 'LOCKED'}</span>
        </div>
      </header>
      <AdminNav
        items={navItems}
        activeKey={view}
        onSelect={setView}
        hasToken={hasToken}
      />
    </>
  );

  return (
    <>
      <Head>
        <title>Admin · Laffy</title>
      </Head>
      <AdminPageShell header={headerContent}>
        {!hasToken && <TokenNotice />}

        {view === 'uploads' && (
          <UploadsSection
            hasToken={hasToken}
            title={title}
            description={description}
            orientation={orientation}
            duration={duration}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onOrientationChange={setOrientation}
            onDurationChange={setDuration}
            handleUploadUrl={`/api/blob/upload${qs}`}
            onUpload={handleUploadMeta}
            filters={uploadFilters}
            onFilters={setUploadFilters}
            availableTypes={availableUploadTypes}
            items={filteredUploads}
            copiedSlug={copiedSlug}
            onCopy={handleCopyRoute}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
          />
        )}

        {analyticsVisible && (
          <section className="space-y-6">
            <AnalyticsOverview
              itemCount={items.length}
              totals={{ views: analyticsTotals.views, likes: analyticsTotals.likes }}
              averageLikeRate={averageLikeRate}
              formatNumber={formatNumber}
              formatPercent={formatPercent}
            />
            <AnalyticsToolbar
              sort={analyticsSort}
              sortOptions={analyticsSortOptions}
              onSortChange={setAnalyticsSort}
              onExport={handleExportAnalytics}
              visibleColumns={analyticsColumns}
              onToggleColumn={handleAnalyticsToggleColumn}
            />
            {metricsError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">{metricsError}</div>
            )}
            <AnalyticsTable
              rows={analyticsRowsForDisplay}
              metricsLoading={metricsLoading}
              visibleColumns={analyticsColumns}
              formatNumber={formatNumber}
              formatPercent={formatPercent}
              onEdit={openMetricsEditor}
            />
          </section>
        )}

        {adsterraVisible && (
          <section className="space-y-6">
            <AdsterraControls
              domainName={adsterraDomainName}
              domainId={adsterraDomainId}
              activeToken={adsterraActiveToken}
              loadingPlacements={adsterraLoadingPlacements}
              placements={adsterraPlacements}
              placementId={adsterraPlacementId}
              onRefreshPlacements={fetchAdsterraPlacements}
              onPlacementChange={handleAdsterraPlacementChange}
              startDate={adsterraStartDate}
              endDate={adsterraEndDate}
              onStartDateChange={setAdsterraStartDate}
              onEndDateChange={setAdsterraEndDate}
              countryFilter={adsterraCountryFilter}
              osFilter={adsterraOsFilter}
              deviceFilter={adsterraDeviceFilter}
              deviceFormatFilter={adsterraDeviceFormatFilter}
              countryOptions={adsterraCountryOptions}
              osOptions={adsterraOsOptions}
              deviceOptions={adsterraDeviceOptions}
              deviceFormatOptions={adsterraDeviceFormatOptions}
              onCountryFilterChange={setAdsterraCountryFilter}
              onOsFilterChange={setAdsterraOsFilter}
              onDeviceFilterChange={setAdsterraDeviceFilter}
              onDeviceFormatFilterChange={setAdsterraDeviceFormatFilter}
              onFetch={handleFetchAdsterraStats}
              onResetDates={handleResetAdsterraDates}
              canFetch={adsterraCanFetchStats}
              loadingStats={adsterraLoadingStats}
              status={adsterraStatus}
              error={adsterraError}
              presetControls={presetControls}
              filterChips={filterChips}
            />
            <AdsterraSummaryCards
              totals={adsterraTotals}
              formatNumber={formatNumber}
              formatDecimal={formatDecimal}
            />
            <AdsterraChartPanel rows={filteredAdsterraStats} formatDecimal={formatDecimal} />
            <AdsterraStatsTable
              rows={filteredAdsterraStats.map((row) => {
                if (!adsterraAllPlacementsSelected) return row;
                const placementId = row?.placement_id
                  ?? row?.placementId
                  ?? row?.placementID
                  ?? row?.placementid;
                if (!placementId) return row;
                const label = adsterraPlacementLabelMap.get(String(placementId));
                return label ? { ...row, placement_name: label } : row;
              })}
              loading={adsterraLoadingStats}
              formatNumber={formatNumber}
              formatDecimal={formatDecimal}
            />
          </section>
        )}
      </AdminPageShell>

      <UndoToast
        undoInfo={undoInfo}
        status={undoStatus}
        onUndo={handleUndoDelete}
        onDismiss={handleDismissUndo}
      />
      <MetricsModal
        editor={metricsEditor}
        onClose={closeMetricsEditor}
        onFieldChange={handleMetricsFieldChange}
        onSave={handleMetricsSave}
      />
      <DeleteModal
        item={pendingDelete}
        status={deleteStatus}
        error={deleteError}
        onCancel={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />
      <EditContentModal
        item={editingItem}
        form={editForm}
        uploadState={editUploadState}
        uploadMessage={editUploadMessage}
        error={editError}
        status={editStatus}
        fileInputRef={editFileInputRef}
        onClose={closeEditModal}
        onFieldChange={handleEditFieldChange}
        onUpload={handleEditImageUpload}
        onRevertImage={handleRevertImage}
        onSave={handleSaveEdit}
      />
    </>
  );
}

Admin.disableAds = true;
