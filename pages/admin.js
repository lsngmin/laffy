import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminPageShell from '../components/admin/layout/AdminPageShell';
import AdminNav from '../components/admin/layout/AdminNav';
import TokenNotice from '../components/admin/feedback/TokenNotice';
import UploadsSection from '../components/admin/uploads/UploadsSection';
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
import DeleteModal from '../components/admin/modals/DeleteModal';
import EditContentModal from '../components/admin/modals/EditContentModal';
import { SPONSOR_SMART_LINK_URL } from '@/components/x/ads/constants';
import TimestampsEditorModal from '../components/admin/modals/TimestampsEditorModal';
import UndoToast from '../components/admin/feedback/UndoToast';
import useClipboard from '../hooks/admin/useClipboard';
import useAdminItems from '../hooks/admin/useAdminItems';
import usePendingUploads from '../hooks/admin/usePendingUploads';
import useAdsterraStats, { ADSTERRA_ALL_PLACEMENTS_VALUE } from '../hooks/admin/useAdsterraStats';
import useEventAnalytics from '../hooks/admin/useEventAnalytics';
import useAdminModals from '../hooks/admin/useAdminModals';
import useVisitEvents from '../hooks/admin/useVisitEvents';
import VisitLogTable from '../components/admin/visits/VisitLogTable';

const NAV_ITEMS = [
  { key: 'uploads', label: '업로드', ariaLabel: '업로드 관리', requiresToken: false },
  { key: 'events', label: '분석', ariaLabel: '커스텀 이벤트 분석', requiresToken: true },
  { key: 'ads', label: '수익', ariaLabel: '수익 분석', requiresToken: true },
  { key: 'insights', label: '인사이트', ariaLabel: '통합 인사이트', requiresToken: true },
  { key: 'visits', label: '방문 로그', ariaLabel: 'l_visit 원시 로그', requiresToken: true },
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
    channel: 'k',
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
  const [channel, setChannel] = useState('k');
  const [externalSource, setExternalSource] = useState('');
  const [cardStyle, setCardStyle] = useState('summary_large_image');
  const [isRegisteringExternal, setIsRegisteringExternal] = useState(false);

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
  const {
    items: pendingItems,
    setItems: setPendingItems,
    refresh: refreshPending,
    isLoading: isLoadingPending,
    error: pendingError,
  } = usePendingUploads({ enabled: hasToken, queryString: qs });
  const refreshAll = useCallback(() => {
    refreshUploads();
    refreshPending();
  }, [refreshUploads, refreshPending]);
  const { copiedSlug, copy } = useClipboard();

  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  const [eventFilters, setEventFilters] = useState({ eventName: '', slug: '' });
  const [publishingSlug, setPublishingSlug] = useState('');
  const [pendingFeedback, setPendingFeedback] = useState({ status: 'idle', message: '' });
  const [requeueState, setRequeueState] = useState({ status: 'idle', message: '', slug: '' });

  const clearPendingFeedback = useCallback(() => {
    setPendingFeedback({ status: 'idle', message: '' });
  }, []);

  const pendingFeedbackWithHandler = useMemo(
    () => ({ ...pendingFeedback, onClear: clearPendingFeedback }),
    [pendingFeedback, clearPendingFeedback]
  );

  const clearRequeueState = useCallback(() => {
    setRequeueState((prev) => (prev.status === 'pending' ? prev : { status: 'idle', message: '', slug: '' }));
  }, []);

  const requeueFeedback = useMemo(
    () => ({ ...requeueState, onClear: clearRequeueState }),
    [requeueState, clearRequeueState]
  );

  useEffect(() => {
    if (requeueState.status !== 'success') return undefined;
    const timer = setTimeout(() => {
      setRequeueState((prev) => (prev.status === 'success' ? { status: 'idle', message: '', slug: '' } : prev));
    }, 4000);
    return () => clearTimeout(timer);
  }, [requeueState.status]);

  useEffect(() => {
    if (!pendingError) return;
    setPendingFeedback({
      status: 'error',
      message: '게시 대기 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    });
  }, [pendingError]);

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
    if (!hasToken && (view === 'events' || view === 'ads' || view === 'insights' || view === 'visits')) {
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
      const sanitizedChannel = (() => {
        const value = typeof channel === 'string' ? channel.trim().toLowerCase() : '';
        return ['l', 'k', 'x', 'g'].includes(value) ? value : 'x';
      })();
      const trimmedExternalSource =
        typeof externalSource === 'string' ? externalSource.trim() : '';
      const externalAssetUrl = (() => {
        if (!trimmedExternalSource) return '';
        if (sanitizedChannel === 'k') return trimmedExternalSource;
        if (!isImage) return trimmedExternalSource;
        return '';
      })();
      const normalizedType = sanitizedChannel === 'k' ? 'video' : isImage ? 'image' : 'video';
      const safeCardStyle = cardStyle === 'summary' ? 'summary' : 'summary_large_image';

      if (sanitizedChannel === 'k' && !externalAssetUrl) {
        alert('K 채널은 외부 CDN 동영상 주소가 필요합니다. 입력 후 다시 시도해 주세요.');
        return false;
      }

      const assetUrl = externalAssetUrl || blob.url;

      try {
        const trimmedTitle = (title || '').trim();
        const fallbackTitle = trimmedTitle || slug;

        const nowIso = new Date().toISOString();
        const payload = {
          schemaVersion: '2024-05',
          slug,
          type: normalizedType,
          channel: sanitizedChannel,
          display: {
            socialTitle: fallbackTitle,
            cardTitle: fallbackTitle,
            summary: fallbackTitle,
            runtimeSec: 0,
          },
          media: {
            assetUrl,
          },
          timestamps: {
            pendingAt: nowIso,
            updatedAt: nowIso,
          },
          metrics: {
            likes: 0,
            views: 0,
          },
          source: { origin: externalAssetUrl ? 'External CDN' : 'Blob' },
        };

        payload.status = 'pending';

        payload.share = { ...(payload.share || {}), cardType: safeCardStyle };

        if (sanitizedChannel === 'k') {
          if (blob.url) {
            payload.media.previewUrl = blob.url;
            payload.media.thumbUrl = blob.url;
          }
          if (!payload.media.orientation) {
            payload.media.orientation = 'landscape';
          }
        } else if (isImage) {
          payload.media.previewUrl = blob.url;
          payload.media.thumbUrl = blob.url;
        } else if (blob.url) {
          payload.media.previewUrl = blob.url;
          if (!payload.media.thumbUrl) {
            payload.media.thumbUrl = blob.url;
          }
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
        setChannel(sanitizedChannel);
        setExternalSource('');
        setCardStyle('summary_large_image');
        refreshAll();
        return true;
      } catch (error) {
        console.error('Meta register failed', error);
        return false;
      }
    },
    [cardStyle, channel, externalSource, hasToken, qs, refreshAll, title]
  );

  const handleRegisterExternal = useCallback(async () => {
    if (!hasToken) {
      alert('관리자 토큰이 필요합니다.');
      return false;
    }

    const channelValue = (channel || '').trim().toLowerCase();
    const trimmedSource = (externalSource || '').trim();

    if (channelValue === 'k') {
      if (!trimmedSource) {
        alert('외부 CDN 동영상 URL을 입력해 주세요.');
        return false;
      }
      if (!/^https?:\/\//i.test(trimmedSource)) {
        alert('유효한 URL을 입력해 주세요.');
        return false;
      }

      setIsRegisteringExternal(true);
      try {
        const slug = await generateSlug({ pathname: trimmedSource, url: trimmedSource });
        const trimmedTitle = (title || '').trim();
        const fallbackTitle = trimmedTitle || slug;
        const nowIso = new Date().toISOString();

        const payload = {
          schemaVersion: '2024-05',
          slug,
          type: 'video',
          channel: 'k',
          display: {
            socialTitle: fallbackTitle,
            cardTitle: fallbackTitle,
            summary: fallbackTitle,
            runtimeSec: 0,
          },
          media: {
            assetUrl: trimmedSource,
            orientation: 'landscape',
          },
          timestamps: {
            pendingAt: nowIso,
            updatedAt: nowIso,
          },
          metrics: {
            likes: 0,
            views: 0,
          },
          source: { origin: 'External CDN' },
        };

        payload.status = 'pending';

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
        setChannel('k');
        setExternalSource('');
        setCardStyle('summary_large_image');
        refreshAll();
        return true;
      } catch (error) {
        console.error('External meta register failed', error);
        alert('등록에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return false;
      } finally {
        setIsRegisteringExternal(false);
      }
    }

    if (channelValue === 'g') {
      setIsRegisteringExternal(true);
      try {
        const destinationUrl = SPONSOR_SMART_LINK_URL;
        const trimmedTitle = (title || '').trim();
        const fallbackTitle = trimmedTitle || 'Gofile Smart Link';
        const nowIso = new Date().toISOString();

        const payload = {
          schemaVersion: '2024-05',
          type: 'video',
          channel: 'g',
          display: {
            socialTitle: fallbackTitle,
            cardTitle: fallbackTitle,
            summary: fallbackTitle,
            runtimeSec: 0,
          },
          media: {
            assetUrl: destinationUrl,
            orientation: 'landscape',
          },
          links: {
            smartLinkUrl: destinationUrl,
          },
          timestamps: {
            pendingAt: nowIso,
            updatedAt: nowIso,
          },
          metrics: {
            likes: 0,
            views: 0,
          },
          source: { origin: 'Gofile' },
        };

        payload.status = 'pending';

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
        setChannel('g');
        setExternalSource('');
        setCardStyle('summary_large_image');
        refreshAll();
        return true;
      } catch (error) {
        console.error('Gofile register failed', error);
        alert('등록에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        return false;
      } finally {
        setIsRegisteringExternal(false);
      }
    }

    alert('지원하지 않는 채널입니다. 채널을 다시 선택해 주세요.');
    return false;
  }, [channel, externalSource, hasToken, qs, refreshAll, title]);

  const handlePublishPending = useCallback(
    async (item) => {
      if (!hasToken || !item) return;
      const targetSlug = typeof item.slug === 'string' ? item.slug : '';
      if (!targetSlug) {
        setPendingFeedback({ status: 'error', message: '게시할 항목의 슬러그를 찾지 못했습니다.' });
        return;
      }

      setPublishingSlug(targetSlug);
      setPendingFeedback({ status: 'pending', message: '' });

      try {
        const res = await fetch(`/api/admin/pending/publish${qs}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug: targetSlug }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const message = payload?.error || `게시 실패: ${res.status}`;
          setPendingFeedback({ status: 'error', message });
          return;
        }

        setPendingItems((prev) => prev.filter((pending) => pending.slug !== targetSlug));
        await Promise.all([refreshPending(), refreshUploads()]);

        setPendingFeedback({
          status: 'success',
          message: `${item.title || targetSlug} 게시를 완료했습니다.`,
        });
      } catch (error) {
        console.error('Failed to publish pending item', error);
        setPendingFeedback({
          status: 'error',
          message: '게시에 실패했어요. 잠시 후 다시 시도해 주세요.',
        });
      } finally {
        setPublishingSlug('');
      }
    },
    [hasToken, qs, refreshPending, refreshUploads, setPendingItems]
  );

  const handleMoveToPending = useCallback(
    async (item) => {
      if (!hasToken || !item) return;
      const targetSlug = typeof item.slug === 'string' ? item.slug : '';
      const targetPath = typeof item.pathname === 'string' ? item.pathname : '';
      const targetUrl = typeof item.url === 'string' ? item.url : '';

      if (!targetSlug || (!targetPath && !targetUrl)) {
        setRequeueState({ status: 'error', message: '게시 대기 전환에 필요한 정보를 찾지 못했습니다.', slug: targetSlug });
        return;
      }

      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(
          `${item.title || targetSlug}을(를) 게시 대기 상태로 이동할까요? 기존 게시 목록에서 제거됩니다.`
        );
        if (!confirmed) return;
      }

      setRequeueState({ status: 'pending', message: `${item.title || targetSlug}을(를) 게시 대기로 이동 중…`, slug: targetSlug });

      try {
        const res = await fetch(`/api/admin/pending/requeue${qs}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug: targetSlug, pathname: targetPath, url: targetUrl }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const message = payload?.error || `게시 대기 전환 실패: ${res.status}`;
          setRequeueState({ status: 'error', message, slug: targetSlug });
          return;
        }

        await Promise.all([refreshUploads(), refreshPending()]);

        setRequeueState({
          status: 'success',
          message: `${item.title || targetSlug}을(를) 게시 대기 상태로 이동했어요.`,
          slug: targetSlug,
        });
      } catch (error) {
        console.error('Failed to move item to pending', error);
        setRequeueState({
          status: 'error',
          message: '게시 대기 전환에 실패했어요. 잠시 후 다시 시도해 주세요.',
          slug: targetSlug,
        });
      }
    },
    [hasToken, qs, refreshPending, refreshUploads]
  );

  const uploadFormState = useMemo(
    () => ({
      title,
      channel,
      externalSource,
      cardStyle,
      setTitle,
      setChannel,
      setExternalSource,
      setCardStyle,
      isRegisteringExternal,
      handleUploadUrl: `/api/blob/upload${qs}`,
    }),
    [cardStyle, channel, externalSource, isRegisteringExternal, qs, title]
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

  const renderActivePanel = () => {
    if (view === 'uploads') {
      return (
        <UploadsSection
          hasToken={hasToken}
          items={uploadItems}
          copiedSlug={copiedSlug}
          onCopy={handleCopyRoute}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
          registerMeta={registerMeta}
          uploadFormState={uploadFormState}
          onRegisterExternal={handleRegisterExternal}
          onRefresh={refreshUploads}
          onLoadMore={loadMore}
          hasMore={hasMore}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          error={itemsError}
          filters={uploadFilters}
          onFiltersChange={handleUploadFiltersChange}
          tokenQueryString={qs}
          pendingItems={pendingItems}
          onRefreshPending={refreshPending}
          onPublishPending={handlePublishPending}
          isLoadingPending={isLoadingPending}
          publishingSlug={publishingSlug}
          pendingFeedback={pendingFeedbackWithHandler}
          onMoveToPending={handleMoveToPending}
          requeueFeedback={requeueFeedback}
        />
      );
    }

    if (view === 'events') {
      return (
        <div className="space-y-6 animate-fade-slide">
          <div className="animate-fade-slide flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">분석</h2>
              <p className="text-sm text-slate-400">Vercel Analytics와 함께 수집한 내부 이벤트를 필터링해 확인할 수 있어요.</p>
            </div>
            <button
              type="button"
              onClick={eventAnalytics.refresh}
              disabled={eventAnalytics.loading}
              className="pressable self-start rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition-all duration-300 hover:border-indigo-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {eventAnalytics.loading ? '불러오는 중…' : '새로고침'}
            </button>
          </div>
          <RealtimeNotice
            title="Redis 큐 기반 집계"
            description="l_visit 이벤트는 먼저 Redis 큐에 적재된 뒤 주기적으로 Postgres에 반영돼요. 실시간 수치는 약간의 지연이 있을 수 있습니다."
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
          <EventSummaryCards totals={eventAnalytics.data.totals} formatNumber={formatNumber} />
          <EventKeyMetrics items={eventAnalytics.data.items} formatNumber={formatNumber} />
          <EventTrendChart
            seriesByGranularity={eventAnalytics.data.timeseriesByGranularity}
            formatNumber={formatNumber}
          />
          <EventTable
            rows={eventAnalytics.data.items}
            loading={eventAnalytics.loading}
            error={eventAnalytics.error}
            formatNumber={formatNumber}
          />
        </div>
      );
    }

    if (view === 'ads') {
      return (
        <div className="space-y-6 animate-fade-slide">
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
            formatDecimal={formatDecimal}
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
      );
    }

    if (view === 'insights') {
      return (
        <div className="space-y-6 animate-fade-slide">
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
      );
    }

    if (view === 'visits') {
      return (
        <div className="space-y-6 animate-fade-slide">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">방문 로그 (l_visit)</h2>
              <p className="text-sm text-slate-400">콘텐츠별 방문 이벤트를 원시 데이터로 확인할 수 있어요.</p>
            </div>
            <button
              type="button"
              onClick={visitEvents.refresh}
              disabled={visitEvents.loading}
              className="pressable self-start rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition-all duration-300 hover:border-emerald-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
      );
    }

    return null;
  };

  return (
    <AdminPageShell>
      <header className="animate-fade-slide flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

      {!hasToken && (
        <div className="animate-fade-slide">
          <TokenNotice />
        </div>
      )}

      <div className="relative min-h-[24rem]">
        {renderActivePanel()}
      </div>

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
