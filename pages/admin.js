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
import EventSummaryCards from '../components/admin/events/EventSummaryCards';
import EventFilters from '../components/admin/events/EventFilters';
import EventTable from '../components/admin/events/EventTable';
import EventTrendChart from '../components/admin/events/EventTrendChart';
import EventAdCorrelation from '../components/admin/insights/EventAdCorrelation';
import EventKeyMetrics from '../components/admin/events/EventKeyMetrics';
import IntegratedInsightHighlights from '../components/admin/insights/IntegratedInsightHighlights';
import RealtimeNotice from '../components/admin/common/RealtimeNotice';
import MetricsModal from '../components/admin/modals/MetricsModal';
import AnalyticsHistoryPanel from '../components/admin/analytics/AnalyticsHistoryPanel';
import AnalyticsCsvUploadModal from '../components/admin/modals/AnalyticsCsvUploadModal';
import DeleteModal from '../components/admin/modals/DeleteModal';
import EditContentModal from '../components/admin/modals/EditContentModal';
import TimestampsEditorModal from '../components/admin/modals/TimestampsEditorModal';
import UndoToast from '../components/admin/feedback/UndoToast';
import useClipboard from '../hooks/admin/useClipboard';
import useAdminItems from '../hooks/admin/useAdminItems';
import useAnalyticsMetrics from '../hooks/admin/useAnalyticsMetrics';
import useAdsterraStats, { ADSTERRA_ALL_PLACEMENTS_VALUE } from '../hooks/admin/useAdsterraStats';
import useEventAnalytics from '../hooks/admin/useEventAnalytics';
import useAdminModals from '../hooks/admin/useAdminModals';
import { downloadAnalyticsCsv } from '../components/admin/analytics/export/AnalyticsCsvExporter';
import useAdminCatalog from '../hooks/admin/useAdminCatalog';
import useVisitEvents from '../hooks/admin/useVisitEvents';
import VisitLogTable from '../components/admin/visits/VisitLogTable';

const NAV_ITEMS = [
  { key: 'uploads', label: '업로드', ariaLabel: '업로드 관리', requiresToken: false },
  { key: 'analytics', label: '목록', ariaLabel: '콘텐츠 목록', requiresToken: true },
  { key: 'events', label: '분석', ariaLabel: '커스텀 이벤트 분석', requiresToken: true },
  { key: 'ads', label: '수익', ariaLabel: '수익 분석', requiresToken: true },
  { key: 'insights', label: '인사이트', ariaLabel: '통합 인사이트', requiresToken: true },
  { key: 'visits', label: '방문 로그', ariaLabel: 'x_visit 원시 로그', requiresToken: true },
];
const DEFAULT_VISIT_LIMIT = 50;

function parseKstDateLike(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getTime());
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.includes('T')) {
      const parsed = new Date(trimmed);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(`${trimmed}T00:00:00+09:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function toGmtDateKeyFromKst(value) {
  const parsed = parseKstDateLike(value);
  if (!parsed) return '';
  return parsed.toISOString().slice(0, 10);
}

function convertEventTimeseriesToGmt(series) {
  if (!Array.isArray(series)) return [];
  const map = new Map();
  series.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const dateKey = toGmtDateKeyFromKst(entry.date);
    if (!dateKey) return;
    const count = Number(entry.count) || 0;
    const valueSum = Number(entry.valueSum) || 0;
    const existing = map.get(dateKey) || { date: dateKey, count: 0, valueSum: 0 };
    existing.count += count;
    existing.valueSum += valueSum;
    map.set(dateKey, existing);
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

const NAV_KEYS = new Set(NAV_ITEMS.map((item) => item.key));

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
  const isRouterReady = router?.isReady;

  const qs = useMemo(() => (hasToken ? `?token=${encodeURIComponent(token)}` : ''), [hasToken, token]);
  const [uploadFilters, setUploadFilters] = useState({
    search: '',
    type: '',
    sort: 'recent',
    channel: 'l',
  });

  const uploadsQueryString = useMemo(() => {
    if (!hasToken) return '';
    const params = new URLSearchParams();
    params.set('token', token);
    if (uploadFilters.search.trim()) params.set('search', uploadFilters.search.trim());
    if (uploadFilters.type) params.set('type', uploadFilters.type);
    if (uploadFilters.sort && uploadFilters.sort !== 'recent') params.set('sort', uploadFilters.sort);
    if (uploadFilters.channel) params.set('channel', uploadFilters.channel);
    const serialized = params.toString();
    return serialized ? `?${serialized}` : '';
  }, [hasToken, token, uploadFilters]);

  const [view, setView] = useState(() => {
    if (typeof window === 'undefined') return 'uploads';
    const stored = window.localStorage.getItem('laffy-admin-view');
    return stored && NAV_KEYS.has(stored) ? stored : 'uploads';
  });
  const [visitSlug, setVisitSlug] = useState('');
  const [visitLimit, setVisitLimit] = useState(DEFAULT_VISIT_LIMIT);
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('l');

  const {
    items: uploadItems,
    setItems,
    refresh: refreshUploads,
    loadMore,
    hasMore,
    isLoading,
    isLoadingMore,
    error: itemsError,
  } = useAdminItems({ enabled: hasToken, queryString: uploadsQueryString, pageSize: 6 });
  const catalog = useAdminCatalog({ enabled: hasToken, queryString: qs });
  const { refresh: refreshCatalog } = catalog;
  const refreshAll = useCallback(() => {
    refreshUploads();
    refreshCatalog();
  }, [refreshCatalog, refreshUploads]);
  const { copiedSlug, copy } = useClipboard();
  const [historyState, setHistoryState] = useState({ logs: [], loading: false, error: '' });
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [isCsvModalOpen, setCsvModalOpen] = useState(false);

  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  const [eventFilters, setEventFilters] = useState({ eventName: '', slug: '' });

  const analyticsInitialFilters = useMemo(
    () => ({ type: '', orientation: '', query: '' }),
    []
  );

  const analytics = useAnalyticsMetrics({
    items: catalog.items,
    enabled: hasToken && view === 'analytics',
    initialFilters: analyticsInitialFilters,
    startDate: analyticsStartDate,
    endDate: analyticsEndDate,
  });

  const eventAnalytics = useEventAnalytics({
    enabled: hasToken && view === 'events',
    token,
    startDate: analyticsStartDate,
    endDate: analyticsEndDate,
    filters: { ...eventFilters, limit: 200 },
  });

  const visitEvents = useVisitEvents({
    enabled: hasToken && view === 'visits',
    token,
    slug: visitSlug.trim(),
    limit: visitLimit,
  });

  const fetchHistory = useCallback(
    async (options = {}) => {
      if (!hasToken) return;
      const params = new URLSearchParams();
      params.set('token', token);
      const limit = options.limit || 100;
      if (limit) params.set('limit', String(limit));
      const targetSlugs = Array.isArray(options.slugs) ? options.slugs : analytics.selectedSlugs;
      targetSlugs.filter(Boolean).forEach((slug) => params.append('slug', slug));

      setHistoryState((prev) => ({ ...prev, loading: true, error: '' }));

      try {
        const res = await fetch(`/api/admin/metrics?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || '변경 이력을 불러오지 못했어요.');
        }
        setHistoryState({
          logs: Array.isArray(data?.logs) ? data.logs : [],
          loading: false,
          error: '',
        });
      } catch (error) {
        setHistoryState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message || '변경 이력을 불러오지 못했어요.',
        }));
      }
    },
    [analytics.selectedSlugs, hasToken, token]
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
    enabled: hasToken && (view === 'ads' || view === 'insights'),
    defaultRange: defaultAdsterraRange,
    envToken: adsterraEnvToken,
    domainName: adsterraDomainNameEnv,
    domainKey: adsterraDomainKeyEnv || adsterraDomainIdEnv,
    initialDomainId: adsterraDomainIdEnv,
  });

  const insightsEvents = useEventAnalytics({
    enabled: hasToken && view === 'insights',
    token,
    startDate: adsterra.startDate,
    endDate: adsterra.endDate,
    filters: { limit: 200 },
  });

  const insightsEventSeriesGmt = useMemo(
    () => convertEventTimeseriesToGmt(insightsEvents.data.timeseries),
    [insightsEvents.data.timeseries]
  );

  const adCorrelationSeries = useMemo(() => {
    const seriesMap = new Map();
    adsterra.filteredStats.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const labelSource =
        row.rawDate ?? row.date ?? row.day ?? row.Day ?? row.group ?? row.localDate ?? '';
      const rawString =
        typeof labelSource === 'string' ? labelSource : String(labelSource || '');
      const trimmed = rawString.trim();
      const fallbackKey = String(row.localDateIso || row.localDate || '').trim();
      const key = trimmed || fallbackKey;
      if (!key) return;
      const dateLabel = trimmed || key;
      const impressions = Number(row?.impression ?? row?.impressions ?? 0) || 0;
      const clicks = Number(row?.clicks ?? row?.click ?? 0) || 0;
      const revenue = Number(row?.revenue ?? 0) || 0;
      const current = seriesMap.get(key) || {
        date: dateLabel,
        impressions: 0,
        clicks: 0,
        revenue: 0,
      };
      current.date = dateLabel;
      current.impressions += impressions;
      current.clicks += clicks;
      current.revenue += revenue;
      seriesMap.set(key, current);
    });
    return Array.from(seriesMap.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([key, value]) => ({ date: value.date || key, ...value, key }));
  }, [adsterra.filteredStats]);

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
  } = useAdminModals({ hasToken, queryString: qs, setItems, refresh: refreshAll });

  useEffect(() => {
    if (!isRouterReady) return;
    if (!hasToken && (view === 'analytics' || view === 'events' || view === 'ads' || view === 'insights' || view === 'visits')) {
      setView('uploads');
    }
  }, [hasToken, isRouterReady, view]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!NAV_KEYS.has(view)) return;
    window.localStorage.setItem('laffy-admin-view', view);
  }, [view]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat('ko-KR'), []);
  const decimalFormatterTwo = useMemo(
    () => new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    []
  );
  const decimalFormatterThree = useMemo(
    () => new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
    []
  );
  const decimalFormatterFive = useMemo(
    () => new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 5, maximumFractionDigits: 5 }),
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
        if (digits === 3) return decimalFormatterThree.format(0);
        if (digits === 5) return decimalFormatterFive.format(0);
        return decimalFormatterTwo.format(0);
      }
      const formatter =
        digits === 3
          ? decimalFormatterThree
          : digits === 5
          ? decimalFormatterFive
          : decimalFormatterTwo;
      return formatter.format(numeric);
    },
    [decimalFormatterFive, decimalFormatterThree, decimalFormatterTwo]
  );

  const formatPercent = useCallback((value) => {
    if (!Number.isFinite(value)) return '0%';
    return `${(value * 100).toFixed(1)}%`;
  }, []);

  const formatCurrency = useCallback(
    (value, digits = 3) => {
      const numeric = Number(value);
      const safeDigits = digits === 5 ? 5 : digits === 3 ? 3 : 2;
      return `$${formatDecimal(Number.isFinite(numeric) ? numeric : 0, safeDigits)}`;
    },
    [formatDecimal]
  );

  const uploadFormState = useMemo(
    () => ({
      title,
      channel,
      setTitle,
      setChannel,
      handleUploadUrl: `/api/blob/upload${qs}`,
    }),
    [channel, qs, title]
  );

  const registerMeta = useCallback(
    async (blob) => {
      if (!hasToken) return false;
      const slug = await generateSlug(blob);
      const contentType = typeof blob?.contentType === 'string' ? blob.contentType : '';
      const pathname = typeof blob?.pathname === 'string' ? blob.pathname : '';
      const lowerPathname = pathname.toLowerCase();
      const lowerUrl = typeof blob?.url === 'string' ? blob.url.toLowerCase() : '';
      const imageExtPattern = /(\.jpe?g|\.png|\.webp)$/;
      const hasImageExtension = imageExtPattern.test(lowerPathname) || imageExtPattern.test(lowerUrl);
      const isImage = contentType.startsWith('image/') || hasImageExtension;
      const normalizedType = isImage ? 'image' : 'video';
      const normalizedChannel = channel === 'l' ? 'l' : 'x';

      try {
        const trimmedTitle = (title || '').trim();
        const fallbackTitle = trimmedTitle || slug;

        const payload = {
          schemaVersion: '2024-05',
          slug,
          type: normalizedType,
          channel: normalizedChannel,
          display: {
            socialTitle: fallbackTitle,
            cardTitle: fallbackTitle,
            summary: fallbackTitle,
            runtimeSec: 0,
          },
          media: {
            assetUrl: blob.url,
          },
          timestamps: {
            publishedAt: new Date().toISOString(),
          },
          metrics: {
            likes: 0,
            views: 0,
          },
          source: { origin: 'Blob' },
        };

        if (isImage) {
          payload.media.previewUrl = blob.url;
          payload.media.thumbUrl = blob.url;
        }

        const res = await fetch(`/api/admin/register${qs}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`메타 저장 실패: ${err.error || res.status}`);
          return false;
        }
        setTitle('');
        setChannel('l');
        refreshAll();
        return true;
      } catch (error) {
        console.error('Meta register failed', error);
        return false;
      }
    },
    [channel, hasToken, qs, refreshAll, title]
  );

  const handleUploadFiltersChange = useCallback((nextFilters) => {
    setUploadFilters((prev) => ({ ...prev, ...nextFilters }));
  }, []);

  const handleEventFilterChange = useCallback((next) => {
    setEventFilters((prev) => ({ ...prev, ...next }));
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
    const wantsViewsUpdate = editor.views !== '' && parsedViews !== null;
    const wantsLikesUpdate = editor.likes !== '' && parsedLikes !== null;

    if ((editor.views !== '' && parsedViews === null) || (editor.likes !== '' && parsedLikes === null)) {
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

    if (!wantsViewsUpdate && !wantsLikesUpdate) {
      analytics.setMetricsEditor((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              error: '변경할 값을 입력해 주세요.',
            }
          : prev
      );
      return;
    }

    analytics.setMetricsEditor((prev) => (prev ? { ...prev, status: 'saving', error: '' } : prev));
    const updates = editor.slugs.map((slug) => {
      const update = { slug };
      if (wantsViewsUpdate) update.views = parsedViews;
      if (wantsLikesUpdate) update.likes = parsedLikes;
      return update;
    });

    try {
      const res = await fetch(`/api/admin/metrics${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ updates, actor: 'admin-ui' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const firstError = Array.isArray(data?.details) && data.details.length ? data.details[0]?.message : null;
        throw new Error(firstError || data?.error || '메트릭 저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
      const results = Array.isArray(data?.results) ? data.results : [];
      const resultMap = new Map(results.map((entry) => [entry.slug, entry]));
      analytics.updateMetricsForSlug(results);
      if (results.length) {
        setItems((prev) =>
          prev.map((item) =>
            resultMap.has(item.slug)
              ? {
                  ...item,
                  views: resultMap.get(item.slug).views ?? item.views ?? 0,
                  likes: resultMap.get(item.slug).likes ?? item.likes ?? 0,
                }
              : item
          )
        );
      }

      analytics.setMetricsEditor((prev) => {
        if (!prev) return prev;
        const primarySlug = prev.slugs?.[0];
        const primaryResult = primarySlug ? resultMap.get(primarySlug) : null;
        return {
          ...prev,
          status: 'success',
          error: '',
          views:
            wantsViewsUpdate && parsedViews !== null
              ? String(parsedViews)
              : typeof primaryResult?.views === 'number'
                ? String(primaryResult.views)
                : prev.views,
          likes:
            wantsLikesUpdate && parsedLikes !== null
              ? String(parsedLikes)
              : typeof primaryResult?.likes === 'number'
                ? String(primaryResult.likes)
                : prev.likes,
          placeholders: {
            views:
              typeof primaryResult?.views === 'number'
                ? primaryResult.views
                : wantsViewsUpdate && parsedViews !== null
                  ? parsedViews
                  : prev.placeholders?.views ?? null,
            likes:
              typeof primaryResult?.likes === 'number'
                ? primaryResult.likes
                : wantsLikesUpdate && parsedLikes !== null
                  ? parsedLikes
                  : prev.placeholders?.likes ?? null,
          },
        };
      });

      if (isHistoryOpen) {
        fetchHistory({ slugs: editor.slugs });
      }

      if (editor.isBulk) {
        analytics.clearSelection();
      }

      setTimeout(() => {
        analytics.closeMetricsEditor();
      }, 900);
    } catch (error) {
      analytics.setMetricsEditor((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              error: error?.message || '메트릭 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
            }
          : prev
      );
    }
  }, [analytics, fetchHistory, hasToken, isHistoryOpen, qs, setItems]);

  const handleOpenHistory = useCallback(() => {
    setHistoryOpen(true);
    fetchHistory({ slugs: analytics.selectedSlugs });
  }, [analytics.selectedSlugs, fetchHistory]);

  const handleHistoryRetry = useCallback(() => {
    fetchHistory({ slugs: analytics.selectedSlugs });
  }, [analytics.selectedSlugs, fetchHistory]);

  useEffect(() => {
    if (isHistoryOpen) {
      fetchHistory({ slugs: analytics.selectedSlugs });
    }
  }, [analytics.selectedSlugs, fetchHistory, isHistoryOpen]);

  const handleCsvUpload = useCallback(
    async ({ csvText }) => {
      if (!hasToken) {
        throw new Error('인증 토큰이 필요합니다.');
      }
      if (typeof csvText !== 'string' || !csvText.trim()) {
        throw new Error('CSV 데이터가 비어 있어요.');
      }

      const res = await fetch(`/api/admin/metrics/import${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv: csvText, actor: 'admin-ui' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const firstError = Array.isArray(data?.details) && data.details.length ? data.details[0]?.message : null;
        throw new Error(firstError || data?.error || 'CSV 업로드 처리에 실패했어요.');
      }

      const results = Array.isArray(data?.results) ? data.results : [];
      analytics.updateMetricsForSlug(results);
      if (results.length) {
        const resultMap = new Map(results.map((entry) => [entry.slug, entry]));
        setItems((prev) =>
          prev.map((item) =>
            resultMap.has(item.slug)
              ? {
                  ...item,
                  views: resultMap.get(item.slug).views ?? item.views ?? 0,
                  likes: resultMap.get(item.slug).likes ?? item.likes ?? 0,
                }
              : item
          )
        );
      }

      if (isHistoryOpen) {
        const targetSlugs = results.map((entry) => entry.slug);
        fetchHistory({ slugs: targetSlugs.length ? targetSlugs : analytics.selectedSlugs });
      }

      return data;
    },
    [analytics, fetchHistory, hasToken, isHistoryOpen, qs, setItems]
  );

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
            items={uploadItems}
            copiedSlug={copiedSlug}
            onCopy={handleCopyRoute}
            onEdit={openEditModal}
            onDelete={openDeleteModal}
            registerMeta={registerMeta}
            uploadFormState={uploadFormState}
            onRefresh={refreshUploads}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            error={itemsError}
            filters={uploadFilters}
            onFiltersChange={handleUploadFiltersChange}
            tokenQueryString={qs}
          />
        )}

        {view === 'analytics' && (
          <div className="space-y-6">
            <AnalyticsOverview
              itemCount={catalog.items.length}
              totals={analytics.analyticsTotals}
              averageViews={analytics.averageViewsPerContent}
              formatNumber={formatNumber}
            />
            {catalog.error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                {catalog.error}
              </div>
            )}
            <AnalyticsToolbar
              sortKey={analytics.sortKey}
              sortDirection={analytics.sortDirection}
              onSortChange={analytics.setSort}
              visibleColumns={visibleColumns}
              onToggleColumn={analytics.toggleColumn}
              onExportCsv={handleExportCsv}
              selectedCount={analytics.selectedSlugs.length}
              onOpenBulkEditor={() => analytics.openMetricsEditor()}
              onOpenHistory={handleOpenHistory}
              onOpenCsvUpload={() => setCsvModalOpen(true)}

              startDate={analyticsStartDate}
              endDate={analyticsEndDate}
              onDateChange={handleAnalyticsDateChange}
              filters={analytics.filters}

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
              onEdit={openEditModal}
              visibleColumns={visibleColumns}
              selectedSlugs={analytics.selectedSlugs}
              onToggleRow={analytics.toggleRowSelection}
              onToggleAll={(selectAll) => (selectAll ? analytics.selectAllRows() : analytics.clearSelection())}
            />
          </div>
        )}

        {view === 'events' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">분석</h2>
                <p className="text-sm text-slate-400">Vercel Analytics와 함께 수집한 내부 이벤트를 필터링해 확인할 수 있어요.</p>
              </div>
              <button
                type="button"
                onClick={eventAnalytics.refresh}
                disabled={eventAnalytics.loading}
                className="self-start rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {eventAnalytics.loading ? '불러오는 중…' : '새로고침'}
              </button>
            </div>
            <RealtimeNotice
              title="Redis 실시간 이벤트"
              description="최근 3~5분 사이에 수집된 이벤트만 Redis에서 실시간으로 집계해요. 더 오래된 데이터는 별도 저장소 연결 전까지는 제공되지 않습니다."
            />
            <EventFilters
              startDate={analyticsStartDate}
              endDate={analyticsEndDate}
              onDateChange={handleAnalyticsDateChange}
              filters={eventFilters}
              onFilterChange={handleEventFilterChange}
              catalog={eventAnalytics.data.catalog}
              loading={eventAnalytics.loading}
              onRefresh={eventAnalytics.refresh}
            />
            <EventSummaryCards
              totals={eventAnalytics.data.totals}
              formatNumber={formatNumber}
              formatPercent={formatPercent}
            />
            <EventKeyMetrics
              items={eventAnalytics.data.items}
              formatNumber={formatNumber}
              formatPercent={formatPercent}
            />
            {eventAnalytics.data.timeseries.length > 0 && (
              <EventTrendChart series={eventAnalytics.data.timeseries} formatNumber={formatNumber} />
            )}
            <EventTable
              rows={eventAnalytics.data.items}
              loading={eventAnalytics.loading}
              error={eventAnalytics.error}
              formatNumber={formatNumber}
            />
          </div>
        )}

        {view === 'ads' && (
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
            <AdsterraSummaryCards
              totals={adsterra.totals}
              rows={adsterra.filteredStats}
              placementLabelMap={adsterra.placementLabelMap}
              formatNumber={formatNumber}
              formatCurrency={formatCurrency}
            />
            <AdsterraChartPanel
              rows={adsterra.filteredStats}
              formatNumber={formatNumber}
              formatCurrency={formatCurrency}
            />
            <AdsterraStatsTable
              rows={adsterra.filteredStats}
              loading={adsterra.loadingStats}
              formatNumber={formatNumber}
              formatCurrency={formatCurrency}
              placementLabelMap={adsterra.placementLabelMap}
              selectedPlacementId={adsterra.placementId}
              activeFilters={adsterra.activeFilters}
            />
          </div>
        )}

        {view === 'insights' && (
          <div className="space-y-6">
            <IntegratedInsightHighlights
              eventTotals={insightsEvents.data.totals}
              adTotals={adsterra.totals}
              formatNumber={formatNumber}
              formatDecimal={formatDecimal}
              formatPercent={formatPercent}
            />
            <EventAdCorrelation
              eventSeries={insightsEventSeriesGmt}
              adSeries={adCorrelationSeries}
              formatNumber={formatNumber}
              formatDecimal={formatDecimal}
            />
          </div>
        )}

        {view === 'visits' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">방문 로그 (x_visit)</h2>
                <p className="text-sm text-slate-400">콘텐츠별 방문 이벤트를 원시 데이터로 확인할 수 있어요.</p>
              </div>
              <button
                type="button"
                onClick={visitEvents.refresh}
                disabled={visitEvents.loading}
                className="self-start rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {visitEvents.loading ? '불러오는 중…' : '새로고침'}
              </button>
            </div>

            <div className="grid gap-3 sm:flex sm:items-end sm:gap-4">
              <label className="flex w-full flex-col gap-2 sm:max-w-xs">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Slug 필터</span>
                <input
                  type="text"
                  value={visitSlug}
                  onChange={(event) => setVisitSlug(event.target.value)}
                  placeholder="예: funny-cat"
                  className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 focus:border-emerald-400 focus:outline-none"
                />
              </label>
              <label className="flex w-full flex-col gap-2 sm:w-32">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">표시 개수</span>
                <select
                  value={String(visitLimit)}
                  onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10);
                    if (Number.isFinite(parsed)) {
                      setVisitLimit(Math.max(1, Math.min(200, parsed)));
                    } else {
                      setVisitLimit(DEFAULT_VISIT_LIMIT);
                    }
                  }}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 focus:border-emerald-400 focus:outline-none"
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </label>
            </div>

            {visitEvents.error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                {visitEvents.error}
              </div>
            )}

            {visitEvents.loading && visitEvents.items.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
                방문 로그를 불러오는 중이에요…
              </div>
            ) : (
              <VisitLogTable items={visitEvents.items} />
            )}

            {visitEvents.loading && visitEvents.items.length > 0 && (
              <p className="text-xs text-slate-500">새로운 데이터로 업데이트 중…</p>
            )}
          </div>
        )}
      </div>

      <MetricsModal
        editor={analytics.metricsEditor}
        onClose={analytics.closeMetricsEditor}
        onChange={analytics.handleMetricsFieldChange}
        onSave={handleMetricsSave}
      />
      <AnalyticsHistoryPanel
        open={isHistoryOpen}
        onClose={() => setHistoryOpen(false)}
        logs={historyState.logs}
        loading={historyState.loading}
        error={historyState.error}
        onRetry={handleHistoryRetry}
        focusSlugs={isHistoryOpen ? analytics.selectedSlugs : []}
      />
      <AnalyticsCsvUploadModal
        open={isCsvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onUpload={handleCsvUpload}
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
