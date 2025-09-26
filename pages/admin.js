import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageShell from '../components/admin/layout/AdminPageShell';
import AdminNav from '../components/admin/layout/AdminNav';
import TokenNotice from '../components/admin/feedback/TokenNotice';
import UploadsSection from '../components/admin/uploads/UploadsSection';
import AnalyticsOverview from '../components/admin/analytics/AnalyticsOverview';
import AnalyticsToolbar from '../components/admin/analytics/AnalyticsToolbar';
import AnalyticsTable from '../components/admin/analytics/AnalyticsTable';
import AnalyticsTrendChart from '../components/admin/analytics/AnalyticsTrendChart';
import AdsterraControls from '../components/admin/adsterra/AdsterraControls';
import AdsterraSummaryCards from '../components/admin/adsterra/AdsterraSummaryCards';
import AdsterraStatsTable from '../components/admin/adsterra/AdsterraStatsTable';
import AdsterraChartPanel from '../components/admin/adsterra/AdsterraChartPanel';
import MetricsModal from '../components/admin/modals/MetricsModal';
import DeleteModal from '../components/admin/modals/DeleteModal';
import EditContentModal from '../components/admin/modals/EditContentModal';
import TimestampsEditorModal from '../components/admin/modals/TimestampsEditorModal';
import UndoToast from '../components/admin/feedback/UndoToast';
import useClipboard from '../hooks/admin/useClipboard';
import useAdminItems from '../hooks/admin/useAdminItems';
import useAnalyticsMetrics from '../hooks/admin/useAnalyticsMetrics';
import useAdsterraStats, { ADSTERRA_ALL_PLACEMENTS_VALUE } from '../hooks/admin/useAdsterraStats';
import useAdminModals from '../hooks/admin/useAdminModals';
import { downloadAnalyticsCsv } from '../components/admin/analytics/export/AnalyticsCsvExporter';

const NAV_ITEMS = [
  { key: 'uploads', label: '업로드 · 목록', requiresToken: false },
  { key: 'analytics', label: '분석', requiresToken: true },
  { key: 'adsterra', label: '통계', requiresToken: true },
];

function getDefaultAdsterraDateRange() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const toInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return { start: toInput(start), end: toInput(end) };
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

export default function AdminPage() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const hasToken = Boolean(token);

  const qs = useMemo(() => (hasToken ? `?token=${encodeURIComponent(token)}` : ''), [hasToken, token]);
  const [uploadFilters, setUploadFilters] = useState({
    search: '',
    type: '',
    orientation: '',
    sort: 'recent',
  });

  const uploadsQueryString = useMemo(() => {
    if (!hasToken) return '';
    const params = new URLSearchParams();
    params.set('token', token);
    if (uploadFilters.search.trim()) params.set('search', uploadFilters.search.trim());
    if (uploadFilters.type) params.set('type', uploadFilters.type);
    if (uploadFilters.orientation) params.set('orientation', uploadFilters.orientation);
    if (uploadFilters.sort && uploadFilters.sort !== 'recent') params.set('sort', uploadFilters.sort);
    const serialized = params.toString();
    return serialized ? `?${serialized}` : '';
  }, [hasToken, token, uploadFilters]);

  const [view, setView] = useState('uploads');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orientation, setOrientation] = useState('landscape');
  const [duration, setDuration] = useState('0');

  const {
    items,
    setItems,
    refresh,
    loadMore,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error: itemsError,
  } = useAdminItems({ enabled: hasToken, queryString: uploadsQueryString, pageSize: 6 });
  const { copiedSlug, copy } = useClipboard();
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');

  const analytics = useAnalyticsMetrics({
    items,
    enabled: hasToken && view === 'analytics',
    initialFilters: analyticsInitialFilters,

    startDate: analyticsStartDate,
    endDate: analyticsEndDate,
  
  const analyticsInitialFilters = useMemo(
    () => ({ type: '', orientation: '', query: '' }),
    []
  );

  const defaultAdsterraRange = useMemo(() => getDefaultAdsterraDateRange(), []);
  const adsterraEnvToken = useMemo(
    () => (process.env.NEXT_PUBLIC_ADSTERRA_API_TOKEN || process.env.NEXT_PUBLIC_ADSTERRA_TOKEN || '').trim(),
    []
  );
  const adsterraDomainIdEnv = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_ADSTERRA_DOMAIN_ID;
    return typeof raw === 'string' ? raw.trim() : '';
  }, []);
  const adsterraDomainNameEnv = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_ADSTERRA_DOMAIN_NAME;
    return typeof raw === 'string' ? raw.trim() : 'laffy.org';
  }, []);
  const adsterraDomainKeyEnv = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_ADSTERRA_DOMAIN_KEY;
    return typeof raw === 'string' ? raw.trim() : '';
  }, []);

  const adsterra = useAdsterraStats({
    enabled: hasToken && view === 'adsterra',
    defaultRange: defaultAdsterraRange,
    envToken: adsterraEnvToken,
    domainName: adsterraDomainNameEnv,
    domainKey: adsterraDomainKeyEnv || adsterraDomainIdEnv,
    initialDomainId: adsterraDomainIdEnv,
  });

  const {
    editingItem,
    editForm,
    editStatus,
    editError,
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
    timestampsEditor,
    openTimestampsEditor,
    closeTimestampsEditor,
    handleTimestampsFieldChange,
    handleAddTimestamp,
    handleRemoveTimestamp,
    handleSaveTimestamps,
  } = useAdminModals({ hasToken, queryString: qs, setItems, refresh });

  useEffect(() => {
    if (!hasToken && (view === 'analytics' || view === 'adsterra')) {
      setView('uploads');
    }
  }, [hasToken, view]);

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

  const formatPercent = useCallback((value) => {
    if (!Number.isFinite(value)) return '0%';
    return `${(value * 100).toFixed(1)}%`;
  }, []);

  const uploadFormState = useMemo(
    () => ({
      title,
      description,
      orientation,
      duration,
      setTitle,
      setDescription,
      setOrientation,
      setDuration,
      handleUploadUrl: `/api/blob/upload${qs}`,
    }),
    [description, duration, orientation, qs, title]
  );

  const registerMeta = useCallback(
    async (blob) => {
      if (!hasToken) return;
      const slug = await generateSlug(blob);
      const contentType = typeof blob?.contentType === 'string' ? blob.contentType : '';
      const pathname = typeof blob?.pathname === 'string' ? blob.pathname : '';
      const lowerPathname = pathname.toLowerCase();
      const lowerUrl = typeof blob?.url === 'string' ? blob.url.toLowerCase() : '';
      const imageExtPattern = /(\.jpe?g|\.png|\.webp)$/;
      const hasImageExtension = imageExtPattern.test(lowerPathname) || imageExtPattern.test(lowerUrl);
      const isImage = contentType.startsWith('image/') || hasImageExtension;
      const normalizedType = isImage ? 'image' : 'video';
      const durationSeconds = (() => {
        const parsed = Number(duration);
        return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
      })();

      try {
        const res = await fetch(`/api/admin/register${qs}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            slug,
            title,
            description,
            url: blob.url,
            durationSeconds,
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
      } catch (error) {
        console.error('Meta register failed', error);
      }
    },
    [description, duration, hasToken, orientation, qs, refresh, title]
  );

  const handleUploadFiltersChange = useCallback((nextFilters) => {
    setUploadFilters((prev) => ({ ...prev, ...nextFilters }));
  }, []);

  const handleCopyRoute = useCallback(
    async (item) => {
      if (!item?.routePath) return;
      await copy(item.slug, item.routePath);
    },
    [copy]
  );

  const handleMetricsSave = useCallback(async () => {
    const editor = analytics.metricsEditor;
    if (!editor || !hasToken) return;

    const parseValue = (raw) => {
      if (raw === null || raw === undefined) return null;
      if (String(raw).trim() === '') return null;
      const num = Number(raw);
      if (!Number.isFinite(num)) return null;
      return Math.max(0, Math.round(num));
    };

    const parsedViews = parseValue(editor.views);
    const parsedLikes = parseValue(editor.likes);

    if ((editor.views && parsedViews === null) || (editor.likes && parsedLikes === null)) {
      analytics.setMetricsEditor((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              error: '숫자로 입력해 주세요.',
            }
          : prev
      );
      return;
    }

    analytics.setMetricsEditor((prev) => (prev ? { ...prev, status: 'saving', error: '' } : prev));

    const payload = { slug: editor.slug };
    if (parsedViews !== null) payload.views = parsedViews;
    if (parsedLikes !== null) payload.likes = parsedLikes;

    try {
      const res = await fetch(`/api/admin/metrics${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save_failed');
      const data = await res.json();
      const nextViews = Number(data?.views) || 0;
      const nextLikes = Number(data?.likes) || 0;
      analytics.updateMetricsForSlug(editor.slug, nextViews, nextLikes);
      setItems((prev) =>
        prev.map((item) =>
          item.slug === editor.slug
            ? {
                ...item,
                views: nextViews,
                likes: nextLikes,
              }
            : item
        )
      );
      analytics.setMetricsEditor((prev) =>
        prev
          ? {
              ...prev,
              status: 'success',
              views: String(nextViews),
              likes: String(nextLikes),
              error: '',
            }
          : prev
      );
      setTimeout(() => {
        analytics.closeMetricsEditor();
      }, 900);
    } catch (error) {
      analytics.setMetricsEditor((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              error: '메트릭 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
            }
          : prev
      );
    }
  }, [analytics, hasToken, qs, setItems]);

  const [adsterraPresets, setAdsterraPresets] = useState([]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('laffy-adsterra-presets');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setAdsterraPresets(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load adsterra presets', error);
    }
  }, []);

  const handleSavePreset = useCallback((preset) => {
    setAdsterraPresets((prev) => {
      const next = [preset, ...prev].slice(0, 20);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('laffy-adsterra-presets', JSON.stringify(next));
        } catch (error) {
          console.error('Failed to save adsterra presets', error);
        }
      }
      return next;
    });
  }, []);

  const handleApplyPreset = useCallback(
    (preset) => {
      if (!preset) return;
      if (preset.placementId !== undefined) {
        adsterra.setPlacementId(
          preset.placementId === null || preset.placementId === undefined
            ? ADSTERRA_ALL_PLACEMENTS_VALUE
            : preset.placementId
        );
      }
      if (preset.startDate) adsterra.setStartDate(preset.startDate);
      if (preset.endDate) adsterra.setEndDate(preset.endDate);
      adsterra.setCountryFilter(preset.countryFilter || '');
      adsterra.setOsFilter(preset.osFilter || '');
      adsterra.setDeviceFilter(preset.deviceFilter || '');
      adsterra.setDeviceFormatFilter(preset.deviceFormatFilter || '');
    },
    [adsterra]
  );

  const handleAnalyticsDateChange = useCallback((field, value) => {
    if (field === 'start') {
      setAnalyticsStartDate(value);
    } else if (field === 'end') {
      setAnalyticsEndDate(value);
    }
  }, []);

  const handleExportCsv = useCallback(() => {
    downloadAnalyticsCsv(analytics.exportRows);
  }, [analytics.exportRows]);

  const visibleColumns = analytics.visibleColumns;

  return (
    <AdminPageShell>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="bg-gradient-to-r from-indigo-200 via-white to-pink-200 bg-clip-text text-3xl font-extrabold text-transparent">
          LAFFY Admin
        </h1>
        <div className="flex items-center gap-2 self-start rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
          <span className="uppercase tracking-[0.3em]">{hasToken ? 'ACCESS' : 'LOCKED'}</span>
        </div>
      </header>

      <AdminNav
        items={NAV_ITEMS.map((item) => ({ ...item, disabled: item.requiresToken && !hasToken }))}
        activeView={view}
        onChange={setView}
      />

      {!hasToken && <TokenNotice />}

      <div className="relative min-h-[24rem]">
        {view === 'uploads' && (
          <UploadsSection
            hasToken={hasToken}
            items={items}
            copiedSlug={copiedSlug}
            onCopy={handleCopyRoute}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            registerMeta={registerMeta}
            uploadFormState={uploadFormState}
            onRefresh={refresh}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            isRefreshing={isRefreshing}
            error={itemsError}
            filters={uploadFilters}
            onFiltersChange={handleUploadFiltersChange}
            tokenQueryString={qs}
          />
        )}

        {view === 'analytics' && (
          <div className="space-y-6">
            <AnalyticsOverview
              itemCount={items.length}
              totals={analytics.analyticsTotals}
              averageLikeRate={analytics.averageLikeRate}
              formatNumber={formatNumber}
              formatPercent={formatPercent}
            />
            <AnalyticsToolbar
              sortKey={analytics.sortKey}
              sortDirection={analytics.sortDirection}
              onSortChange={analytics.setSort}
              visibleColumns={visibleColumns}
              onToggleColumn={analytics.toggleColumn}
              onExportCsv={handleExportCsv}
              startDate={analyticsStartDate}
              endDate={analyticsEndDate}
              onDateChange={handleAnalyticsDateChange}
              filters={analytics.filters}
              onFilterChange={analytics.updateFilters}
            />
            {analytics.isRangeActive && analytics.trendHistory.length > 0 && (
              <AnalyticsTrendChart history={analytics.trendHistory} formatNumber={formatNumber} />
            )}
            <AnalyticsTable
              rows={analytics.sortedAnalyticsRows}
              metricsLoading={analytics.metricsLoading}
              metricsError={analytics.metricsError}
              formatNumber={formatNumber}
              formatPercent={formatPercent}
              onEdit={analytics.openMetricsEditor}
              visibleColumns={visibleColumns}
            />
          </div>
        )}

        {view === 'adsterra' && (
          <div className="space-y-6">
            <AdsterraControls
              domainName={adsterraDomainNameEnv}
              domainId={adsterra.domainId}
              loadingPlacements={adsterra.loadingPlacements}
              loadingStats={adsterra.loadingStats}
              status={adsterra.status}
              error={adsterra.error}
              placements={adsterra.placements}
              placementId={adsterra.placementId}
              onPlacementChange={adsterra.setPlacementId}
              startDate={adsterra.startDate}
              endDate={adsterra.endDate}
              onStartDateChange={adsterra.setStartDate}
              onEndDateChange={adsterra.setEndDate}
              onRefreshPlacements={adsterra.fetchPlacements}
              onFetchStats={adsterra.fetchStats}
              onResetDates={adsterra.resetDates}
              canFetchStats={adsterra.canFetchStats}
              countryFilter={adsterra.countryFilter}
              onCountryFilterChange={adsterra.setCountryFilter}
              countryOptions={adsterra.countryOptions}
              osFilter={adsterra.osFilter}
              onOsFilterChange={adsterra.setOsFilter}
              osOptions={adsterra.osOptions}
              deviceFilter={adsterra.deviceFilter}
              onDeviceFilterChange={adsterra.setDeviceFilter}
              deviceOptions={adsterra.deviceOptions}
              deviceFormatFilter={adsterra.deviceFormatFilter}
              onDeviceFormatFilterChange={adsterra.setDeviceFormatFilter}
              deviceFormatOptions={adsterra.deviceFormatOptions}
              placementLabel={adsterra.placementLabel}
              presets={adsterraPresets}
              onSavePreset={handleSavePreset}
              onApplyPreset={handleApplyPreset}
            />
            <AdsterraSummaryCards totals={adsterra.totals} formatNumber={formatNumber} formatDecimal={formatDecimal} />
            <AdsterraChartPanel rows={adsterra.filteredStats} formatNumber={formatNumber} />
            <AdsterraStatsTable
              rows={adsterra.filteredStats}
              loading={adsterra.loadingStats}
              formatNumber={formatNumber}
              formatDecimal={formatDecimal}
              placementLabelMap={adsterra.placementLabelMap}
              selectedPlacementId={adsterra.placementId}
            />
          </div>
        )}
      </div>

      <MetricsModal
        editor={analytics.metricsEditor}
        onClose={analytics.closeMetricsEditor}
        onChange={analytics.handleMetricsFieldChange}
        onSave={handleMetricsSave}
      />
      <DeleteModal
        pendingDelete={pendingDelete}
        status={deleteStatus}
        error={deleteError}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />
      <EditContentModal
        editingItem={editingItem}
        editForm={editForm}
        editStatus={editStatus}
        editError={editError}
        editUploadState={editUploadState}
        editUploadMessage={editUploadMessage}
        editFileInputRef={editFileInputRef}
        onClose={closeEditModal}
        onFieldChange={handleEditFieldChange}
        onImageUpload={handleEditImageUpload}
        onRevertImage={handleRevertImage}
        onOpenTimestamps={openTimestampsEditor}
        onSave={handleSaveEdit}
      />
      <TimestampsEditorModal
        editor={timestampsEditor}
        onClose={closeTimestampsEditor}
        onFieldChange={handleTimestampsFieldChange}
        onAddTimestamp={handleAddTimestamp}
        onRemoveTimestamp={handleRemoveTimestamp}
        onSave={handleSaveTimestamps}
      />
      <UndoToast info={undoInfo} status={undoStatus} onUndo={handleUndoDelete} onDismiss={handleDismissUndo} />
    </AdminPageShell>
  );
}

AdminPage.disableAds = true;
