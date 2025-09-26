import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import ClientBlobUploader from '../components/ClientBlobUploader';

function toDateInputValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultAdsterraDateRange() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end),
  };
}

export default function Admin() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orientation, setOrientation] = useState('landscape');
  const [duration, setDuration] = useState('0');
  const [items, setItems] = useState([]);
  const [copiedSlug, setCopiedSlug] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', imageUrl: '', previewUrl: '', durationSeconds: '' });
  const [editInitialPreview, setEditInitialPreview] = useState('');
  const [editError, setEditError] = useState('');
  const [editStatus, setEditStatus] = useState('idle');
  const [editUploadState, setEditUploadState] = useState('idle');
  const [editUploadMessage, setEditUploadMessage] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteStatus, setDeleteStatus] = useState('idle');
  const [deleteError, setDeleteError] = useState('');
  const [undoInfo, setUndoInfo] = useState(null);
  const [undoStatus, setUndoStatus] = useState('idle');
  const [view, setView] = useState('uploads');
  const [metricsBySlug, setMetricsBySlug] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState(null);
  const [metricsEditor, setMetricsEditor] = useState(null);
  const metricsSaving = metricsEditor?.status === 'saving';
  const metricsSuccess = metricsEditor?.status === 'success';

  const copyTimeoutRef = useRef(null);
  const pendingMetricsRef = useRef(new Set());
  const editFileInputRef = useRef(null);
  const undoTimeoutRef = useRef(null);
  const adsterraPlacementsRequestRef = useRef(0);
  const adsterraPlacementsInitializedRef = useRef(false);
  const adsterraStatsRequestRef = useRef(0);
  const adsterraDomainRequestRef = useRef(0);
  const adsterraDomainResolvingRef = useRef(false);

  const hasToken = Boolean(token);
  const qs = useMemo(() => (hasToken ? `?token=${encodeURIComponent(token)}` : ''), [token, hasToken]);
  const numberFormatter = useMemo(() => new Intl.NumberFormat('ko-KR'), []);
  const decimalFormatterTwo = useMemo(
    () => new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    []
  );
  const decimalFormatterThree = useMemo(
    () => new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
    []
  );
  const defaultAdsterraRange = useMemo(() => getDefaultAdsterraDateRange(), []);
  const adsterraEnvToken = useMemo(
    () => (process.env.NEXT_PUBLIC_ADSTERRA_API_TOKEN || process.env.NEXT_PUBLIC_ADSTERRA_TOKEN || '').trim(),
    []
  );
  const [adsterraDomainId, setAdsterraDomainId] = useState(() => {
    const raw = process.env.NEXT_PUBLIC_ADSTERRA_DOMAIN_ID;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed) return trimmed;
    }
    return '';
  });
  const adsterraDomainName = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_ADSTERRA_DOMAIN_NAME;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed) return trimmed;
    }
    return 'laffy.org';
  }, []);
  const adsterraDomainKey = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_ADSTERRA_DOMAIN_KEY;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed) return trimmed;
    }
    return '';
  }, []);
  const [adsterraActiveToken, setAdsterraActiveToken] = useState(adsterraEnvToken);
  const [adsterraPlacements, setAdsterraPlacements] = useState([]);
  const [adsterraPlacementId, setAdsterraPlacementId] = useState('');
  const [adsterraStartDate, setAdsterraStartDate] = useState(defaultAdsterraRange.start);
  const [adsterraEndDate, setAdsterraEndDate] = useState(defaultAdsterraRange.end);
  const [adsterraStats, setAdsterraStats] = useState([]);
  const [adsterraLoadingPlacements, setAdsterraLoadingPlacements] = useState(false);
  const [adsterraLoadingStats, setAdsterraLoadingStats] = useState(false);
  const [adsterraError, setAdsterraError] = useState('');
  const [adsterraStatus, setAdsterraStatus] = useState('');
  const [adsterraCountryFilter, setAdsterraCountryFilter] = useState('');
  const [adsterraOsFilter, setAdsterraOsFilter] = useState('');
  const [adsterraDeviceFilter, setAdsterraDeviceFilter] = useState('');
  const [adsterraDeviceFormatFilter, setAdsterraDeviceFormatFilter] = useState('');

  const navItems = useMemo(
    () => [
      { key: 'uploads', label: '업로드 · 목록', requiresToken: false },
      { key: 'analytics', label: '분석', requiresToken: true },
      { key: 'adsterra', label: '통계', requiresToken: true },
    ],
    []
  );

  const refresh = useCallback(async () => {
    if (!hasToken) return;
    try {
      const res = await fetch(`/api/admin/list${qs}`);
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = await res.json();
      const baseItems = Array.isArray(data.items) ? data.items : [];
      const enriched = await Promise.all(
        baseItems.map(async (it) => {
          try {
            const metaFetchUrl = it.url ? `${it.url}${it.url.includes('?') ? '&' : '?'}_=${Date.now()}` : it.url;
            const metaRes = await fetch(metaFetchUrl, { cache: 'no-store' });
            if (!metaRes.ok) return { ...it, _error: true };
            const meta = await metaRes.json();
            const slug = meta?.slug || it.pathname?.replace(/^content\//, '').replace(/\.json$/, '');
            const type = (meta?.type || '').toLowerCase();
            const preview = meta?.thumbnail || meta?.poster || '';
            const routePath = `/x/${slug}`;
            const titleValue = meta?.title || slug;
            const descriptionValue = meta?.description || '';
            const sourceUrl = meta?.src || meta?.url || meta?.sourceUrl || '';
            const poster = meta?.poster || '';
            const thumbnail = meta?.thumbnail || '';
            const orientationValue = meta?.orientation || 'landscape';
            const durationSeconds = Number(meta?.durationSeconds) || 0;
            const likes = Number(meta?.likes) || 0;
            const views = Number(meta?.views) || 0;
            const publishedAt = meta?.publishedAt || '';
            return {
              ...it,
              slug,
              type,
              preview,
              routePath,
              title: titleValue,
              description: descriptionValue,
              src: sourceUrl,
              poster,
              thumbnail,
              orientation: orientationValue,
              durationSeconds,
              likes,
              views,
              publishedAt,
            };
          } catch {
            const slug = it.pathname?.replace(/^content\//, '').replace(/\.json$/, '');
            return { ...it, slug, _error: true };
          }
        })
      );
      setItems(enriched);
    } catch {
      setItems([]);
    }
  }, [hasToken, qs]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!hasToken) return undefined;
    const interval = setInterval(() => { refresh(); }, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hasToken, refresh]);

  useEffect(() => () => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!hasToken && (view === 'analytics' || view === 'adsterra')) setView('uploads');
  }, [hasToken, view]);

  useEffect(() => {
    setMetricsBySlug((prev) => {
      if (!prev || typeof prev !== 'object') return {};
      const next = {};
      items.forEach((item) => {
        if (item.slug && prev[item.slug]) next[item.slug] = prev[item.slug];
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === next[key])
      ) {
        return prev;
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (!hasToken || view !== 'analytics') return undefined;
    const slugs = items.map((it) => it.slug).filter(Boolean);
    const pendingSet = pendingMetricsRef.current;
    const fetchTargets = slugs.filter((slug) => !metricsBySlug[slug] && !pendingSet.has(slug));
    if (!fetchTargets.length) {
      setMetricsLoading(false);
      return undefined;
    }

    fetchTargets.forEach((slug) => pendingSet.add(slug));
    let cancelled = false;

    setMetricsLoading(true);
    setMetricsError(null);

    (async () => {
      try {
        const results = await Promise.all(
          fetchTargets.map(async (slug) => {
            const res = await fetch(`/api/metrics/get?slug=${encodeURIComponent(slug)}`);
            if (!res.ok) {
              throw new Error('metrics_error');
            }
            const data = await res.json();
            return {
              slug,
              metrics: {
                views: Number(data?.views) || 0,
                likes: Math.max(0, Number(data?.likes) || 0),
              },
            };
          })
        );
        if (cancelled) return;
        setMetricsBySlug((prev) => {
          const next = { ...prev };
          results.forEach(({ slug, metrics }) => {
            next[slug] = metrics;
          });
          return next;
        });
      } catch (err) {
        if (!cancelled) setMetricsError('메트릭을 불러오지 못했어요.');
      } finally {
        fetchTargets.forEach((slug) => pendingSet.delete(slug));
        if (!cancelled) setMetricsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      fetchTargets.forEach((slug) => pendingSet.delete(slug));
      setMetricsLoading(false);
    };
  }, [hasToken, view, items, metricsBySlug]);

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

  const analyticsRows = useMemo(
    () =>
      items
        .filter((it) => it.slug)
        .map((it) => ({
          ...it,
          metrics: metricsBySlug[it.slug] || null,
        })),
    [items, metricsBySlug]
  );

  const sortedAnalyticsRows = useMemo(
    () =>
      [...analyticsRows].sort((a, b) => {
        const aViews = a.metrics?.views ?? 0;
        const bViews = b.metrics?.views ?? 0;
        return bViews - aViews;
      }),
    [analyticsRows]
  );

  const analyticsTotals = useMemo(
    () =>
      analyticsRows.reduce(
        (acc, row) => {
          if (!row.metrics) return acc;
          return {
            views: acc.views + (row.metrics.views || 0),
            likes: acc.likes + (row.metrics.likes || 0),
          };
        },
        { views: 0, likes: 0 }
      ),
    [analyticsRows]
  );

  const averageLikeRate = useMemo(() => {
    const withViews = analyticsRows.filter((row) => row.metrics && row.metrics.views > 0);
    if (!withViews.length) return 0;
    const totalRate = withViews.reduce((acc, row) => acc + row.metrics.likes / row.metrics.views, 0);
    return totalRate / withViews.length;
  }, [analyticsRows]);

  const adsterraPlacementLabelMap = useMemo(() => {
    const map = new Map();
    adsterraPlacements.forEach((placement) => {
      if (!placement || typeof placement !== 'object') return;
      const id = placement.id ?? placement.ID ?? placement.placement_id ?? placement.placementId;
      if (!id && id !== 0) return;
      const label = placement.title
        || placement.alias
        || placement.name
        || placement.placement
        || placement.ad_format
        || placement.format
        || String(id);
      map.set(String(id), label);
    });
    return map;
  }, [adsterraPlacements]);

  const adsterraCountryOptions = useMemo(() => {
    const values = new Set();
    adsterraStats.forEach((row) => {
      const value = row?.country ?? row?.Country ?? row?.geo ?? row?.Geo;
      if (value) values.add(String(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [adsterraStats]);

  const adsterraOsOptions = useMemo(() => {
    const values = new Set();
    adsterraStats.forEach((row) => {
      const value = row?.os ?? row?.OS ?? row?.platform ?? row?.Platform;
      if (value) values.add(String(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [adsterraStats]);

  const adsterraDeviceOptions = useMemo(() => {
    const values = new Set();
    adsterraStats.forEach((row) => {
      const value = row?.device ?? row?.Device ?? row?.device_type ?? row?.deviceType;
      if (value) values.add(String(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [adsterraStats]);

  const adsterraDeviceFormatOptions = useMemo(() => {
    const values = new Set();
    adsterraStats.forEach((row) => {
      const value = row?.device_format ?? row?.deviceFormat ?? row?.DeviceFormat;
      if (value) values.add(String(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [adsterraStats]);

  const filteredAdsterraStats = useMemo(() => {
    const normalize = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).trim().toLowerCase();
    };

    const normalizedCountry = normalize(adsterraCountryFilter);
    const normalizedOs = normalize(adsterraOsFilter);
    const normalizedDevice = normalize(adsterraDeviceFilter);
    const normalizedDeviceFormat = normalize(adsterraDeviceFormatFilter);

    return adsterraStats.filter((row) => {
      const countryValue = row?.country ?? row?.Country ?? row?.geo ?? row?.Geo;
      if (normalizedCountry && normalize(countryValue) !== normalizedCountry) return false;

      const osValue = row?.os ?? row?.OS ?? row?.platform ?? row?.Platform;
      if (normalizedOs && normalize(osValue) !== normalizedOs) return false;

      const deviceValue = row?.device ?? row?.Device ?? row?.device_type ?? row?.deviceType;
      if (normalizedDevice && normalize(deviceValue) !== normalizedDevice) return false;

      const deviceFormatValue = row?.device_format ?? row?.deviceFormat ?? row?.DeviceFormat;
      if (normalizedDeviceFormat && normalize(deviceFormatValue) !== normalizedDeviceFormat) return false;

      return true;
    });
  }, [adsterraStats, adsterraCountryFilter, adsterraDeviceFilter, adsterraDeviceFormatFilter, adsterraOsFilter]);

  const adsterraTotals = useMemo(() => {
    if (!Array.isArray(filteredAdsterraStats) || !filteredAdsterraStats.length) {
      return { impressions: 0, clicks: 0, revenue: 0, ctr: 0, cpm: 0 };
    }

    const totals = filteredAdsterraStats.reduce(
      (acc, row) => {
        const impressions = Number(row?.impression ?? row?.impressions ?? 0);
        const clicks = Number(row?.clicks ?? row?.click ?? 0);
        const revenue = Number(row?.revenue ?? 0);
        return {
          impressions: acc.impressions + (Number.isFinite(impressions) ? impressions : 0),
          clicks: acc.clicks + (Number.isFinite(clicks) ? clicks : 0),
          revenue: acc.revenue + (Number.isFinite(revenue) ? revenue : 0),
        };
      },
      { impressions: 0, clicks: 0, revenue: 0 }
    );

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpm = totals.impressions > 0 ? (totals.revenue / totals.impressions) * 1000 : 0;

    return { ...totals, ctr, cpm };
  }, [filteredAdsterraStats]);

  const adsterraCanFetchStats = Boolean(
    adsterraActiveToken &&
    adsterraDomainId &&
    adsterraPlacementId &&
    adsterraStartDate &&
    adsterraEndDate
  );

  const formatPercent = useCallback((value) => {
    if (!Number.isFinite(value)) return '0%';
    return `${(value * 100).toFixed(1)}%`;
  }, []);

  const uploadsVisible = view === 'uploads';
  const analyticsVisible = view === 'analytics';
  const adsterraVisible = view === 'adsterra';

  useEffect(() => {
    if (adsterraEnvToken && !adsterraActiveToken) {
      setAdsterraActiveToken(adsterraEnvToken);
    }
  }, [adsterraActiveToken, adsterraEnvToken]);

  const resolveAdsterraDomainId = useCallback(async () => {
    if (!adsterraActiveToken) {
      return;
    }
    if (adsterraDomainId) {
      return;
    }
    if (adsterraDomainResolvingRef.current) {
      return;
    }

    const requestId = adsterraDomainRequestRef.current + 1;
    adsterraDomainRequestRef.current = requestId;
    adsterraDomainResolvingRef.current = true;
    setAdsterraStatus('도메인 정보를 불러오는 중이에요.');
    setAdsterraError('');

    try {
      const res = await fetch('/api/adsterra/domains', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: adsterraActiveToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || '도메인 목록을 불러오지 못했어요.');
      }
      if (adsterraDomainRequestRef.current !== requestId) return;

      const domains = Array.isArray(json?.domains) ? json.domains : [];
      const normalizedName = adsterraDomainName.trim().toLowerCase();
      const normalizedKey = adsterraDomainKey.trim().toLowerCase();
      const matched = domains.find((domain) => {
        if (!domain || typeof domain !== 'object') return false;
        const domainIdValue = (domain.id ?? '').toString().trim();
        const domainTitleValue = (domain.title ?? '').toString().trim();
        const normalizedTitle = domainTitleValue.toLowerCase();
        if (normalizedName && normalizedTitle === normalizedName) {
          return true;
        }
        if (!normalizedKey) {
          return false;
        }
        return normalizedTitle === normalizedKey || domainIdValue.toLowerCase() === normalizedKey;
      });

      if (matched && matched.id) {
        setAdsterraDomainId(String(matched.id));
        setAdsterraStatus(`도메인 ${matched.title || matched.id}을(를) 사용해요.`);
        setAdsterraError('');
      } else {
        setAdsterraStatus('');
        setAdsterraError('도메인 목록에서 일치하는 항목을 찾지 못했어요. 환경 변수를 확인해 주세요.');
      }
    } catch (error) {
      if (adsterraDomainRequestRef.current === requestId) {
        setAdsterraStatus('');
        setAdsterraError(error.message || '도메인 목록을 불러오지 못했어요.');
      }
    } finally {
      if (adsterraDomainRequestRef.current === requestId) {
        adsterraDomainResolvingRef.current = false;
      }
    }
  }, [adsterraActiveToken, adsterraDomainId, adsterraDomainKey, adsterraDomainName]);

  useEffect(() => {
    if (!adsterraActiveToken) return;
    if (adsterraDomainId) return;
    resolveAdsterraDomainId();
  }, [adsterraActiveToken, adsterraDomainId, resolveAdsterraDomainId]);

  const fetchAdsterraPlacements = useCallback(async () => {
    if (adsterraLoadingPlacements) {
      return;
    }
    if (!adsterraActiveToken) {
      setAdsterraError('통계 API 토큰이 설정되지 않았어요.');
      return;
    }
    if (!adsterraDomainId) {
      setAdsterraError('도메인 정보가 올바르지 않습니다.');
      return;
    }

    adsterraPlacementsInitializedRef.current = true;
    const requestId = adsterraPlacementsRequestRef.current + 1;
    adsterraPlacementsRequestRef.current = requestId;
    setAdsterraLoadingPlacements(true);
    setAdsterraError('');
    setAdsterraStatus('');

    try {
      const res = await fetch('/api/adsterra/placements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: adsterraActiveToken, domainId: adsterraDomainId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || '플레이스먼트를 불러오지 못했어요.');
      }
      if (adsterraPlacementsRequestRef.current !== requestId) return;
      const placements = Array.isArray(json?.placements) ? json.placements : [];
      setAdsterraPlacements(placements);

      const extractPlacementId = (placement) => {
        if (!placement || typeof placement !== 'object') return '';
        const idValue = placement.id ?? placement.ID ?? placement.placement_id ?? placement.placementId ?? placement.value;
        return idValue !== undefined && idValue !== null ? String(idValue) : '';
      };

      if (placements.length) {
        const hasCurrent = placements.some((placement) => extractPlacementId(placement) === adsterraPlacementId);
        if (!hasCurrent) {
          const firstId = extractPlacementId(placements[0]);
          if (firstId) {
            setAdsterraPlacementId(firstId);
          }
        }
      } else {
        setAdsterraPlacementId('');
      }
      setAdsterraStatus(placements.length ? '플레이스먼트를 불러왔어요.' : '등록된 플레이스먼트를 찾을 수 없어요.');
    } catch (error) {
      if (adsterraPlacementsRequestRef.current === requestId) {
        setAdsterraPlacements([]);
        setAdsterraPlacementId('');
        setAdsterraStats([]);
        setAdsterraError(error.message || '플레이스먼트를 불러오지 못했어요.');
      }
    } finally {
      if (adsterraPlacementsRequestRef.current === requestId) {
        setAdsterraLoadingPlacements(false);
      }
    }
  }, [adsterraActiveToken, adsterraDomainId, adsterraLoadingPlacements, adsterraPlacementId]);

  useEffect(() => {
    adsterraPlacementsInitializedRef.current = false;
  }, [adsterraActiveToken, adsterraDomainId]);

  useEffect(() => {
    if (!adsterraVisible) return;
    if (adsterraPlacementsInitializedRef.current) return;
    if (!adsterraActiveToken) {
      setAdsterraError('통계 API 토큰이 설정되지 않았어요.');
      return;
    }
    if (!adsterraDomainId) {
      resolveAdsterraDomainId();
      return;
    }
    fetchAdsterraPlacements();
  }, [
    adsterraVisible,
    adsterraActiveToken,
    fetchAdsterraPlacements,
    adsterraDomainId,
    resolveAdsterraDomainId,
  ]);

  const handleAdsterraPlacementChange = useCallback((value) => {
    const placementValue = value === null || value === undefined ? '' : String(value);
    setAdsterraPlacementId(placementValue);
    setAdsterraStats([]);
    setAdsterraStatus('');
    setAdsterraError('');
  }, []);

  const handleResetAdsterraDates = useCallback(() => {
    const defaults = getDefaultAdsterraDateRange();
    setAdsterraStartDate(defaults.start);
    setAdsterraEndDate(defaults.end);
  }, []);

  const handleFetchAdsterraStats = useCallback(async () => {
    if (!adsterraActiveToken) {
      setAdsterraError('통계 API 토큰 환경 변수를 확인해 주세요.');
      return;
    }
    if (!adsterraDomainId) {
      setAdsterraError('도메인 정보가 설정되지 않았어요. 환경 변수를 확인해 주세요.');
      return;
    }
    if (!adsterraPlacementId) {
      setAdsterraError('광고 포맷(플레이스먼트)을 선택해 주세요.');
      return;
    }
    if (!adsterraStartDate || !adsterraEndDate) {
      setAdsterraError('조회 기간을 모두 입력해 주세요.');
      return;
    }

    const start = new Date(adsterraStartDate);
    const end = new Date(adsterraEndDate);
    if (start > end) {
      setAdsterraError('시작일은 종료일보다 늦을 수 없어요.');
      return;
    }

    const requestId = adsterraStatsRequestRef.current + 1;
    adsterraStatsRequestRef.current = requestId;
    setAdsterraLoadingStats(true);
    setAdsterraError('');
    setAdsterraStatus('');
    setAdsterraStats([]);

    try {
      const res = await fetch('/api/adsterra/stats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: adsterraActiveToken,
          domainId: adsterraDomainId,
          placementId: adsterraPlacementId,
          startDate: adsterraStartDate,
          endDate: adsterraEndDate,
          groupBy: ['date'],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || '통계를 불러오지 못했어요.');
      }
      if (adsterraStatsRequestRef.current !== requestId) return;
      const items = Array.isArray(json?.items) ? json.items : [];
      setAdsterraStats(items);
      setAdsterraStatus(`총 ${items.length}건의 통계를 불러왔어요. (필터는 클라이언트에서 적용됩니다)`);
    } catch (error) {
      if (adsterraStatsRequestRef.current === requestId) {
        setAdsterraStats([]);
        setAdsterraError(error.message || '통계를 불러오지 못했어요.');
      }
    } finally {
      if (adsterraStatsRequestRef.current === requestId) {
        setAdsterraLoadingStats(false);
      }
    }
  }, [
    adsterraActiveToken,
    adsterraDomainId,
    adsterraPlacementId,
    adsterraStartDate,
    adsterraEndDate,
  ]);

  useEffect(() => {
    if (!adsterraVisible) return;
    if (!adsterraCanFetchStats) return;
    handleFetchAdsterraStats();
  }, [adsterraVisible, adsterraCanFetchStats, handleFetchAdsterraStats]);

  const openEditModal = useCallback((item) => {
    if (!item) return;
    const initialPreview = item.type === 'image'
      ? item.src || item.preview || ''
      : item.poster || item.thumbnail || item.preview || '';
    const numericDuration = (() => {
      const parsed = Number(item.durationSeconds);
      if (!Number.isFinite(parsed) || parsed < 0) return 0;
      return Math.round(parsed);
    })();

    setEditForm({
      title: item.title || item.slug,
      description: item.description || '',
      imageUrl: '',
      previewUrl: initialPreview,
      durationSeconds: String(numericDuration),
    });
    setEditInitialPreview(initialPreview);
    setEditUploadMessage('');
    setEditUploadState('idle');
    setEditError('');
    setEditStatus('idle');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
    setEditingItem({
      ...item,
      durationSeconds: numericDuration,
    });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingItem(null);
    setEditForm({ title: '', description: '', imageUrl: '', previewUrl: '', durationSeconds: '' });
    setEditInitialPreview('');
    setEditUploadMessage('');
    setEditUploadState('idle');
    setEditError('');
    setEditStatus('idle');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  }, []);

  const handleEditFieldChange = useCallback((field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if ((field === 'title' || field === 'durationSeconds') && editError) setEditError('');
  }, [editError]);

  const handleEditImageUpload = useCallback(async (event) => {
    const file = event?.target?.files?.[0];
    if (!file || !editingItem) return;

    setEditUploadMessage('');
    setEditError('');

    if (!file.type.startsWith('image/')) {
      setEditUploadState('error');
      setEditUploadMessage('이미지 파일만 업로드할 수 있어요.');
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      return;
    }

    const maxSizeMB = 200;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setEditUploadState('error');
      setEditUploadMessage(`이미지 크기가 너무 커요. 최대 ${maxSizeMB}MB까지 가능합니다.`);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      return;
    }

    try {
      setEditUploadState('uploading');
      const sanitizedName = file.name.replace(/\s+/g, '-');
      const uniqueName = `${Date.now()}-${sanitizedName}`;
      const blob = await upload(`images/${uniqueName}`, file, {
        access: 'public',
        handleUploadUrl: `/api/blob/upload${qs}`,
        contentType: file.type,
      });
      setEditForm((prev) => ({ ...prev, imageUrl: blob.url, previewUrl: blob.url }));
      setEditUploadState('success');
      setEditUploadMessage('새 이미지가 업로드되었습니다.');
    } catch (error) {
      console.error('Edit image upload failed', error);
      setEditUploadState('error');
      setEditUploadMessage('이미지 업로드에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  }, [editingItem, qs]);

  const handleRevertImage = useCallback(() => {
    setEditForm((prev) => ({ ...prev, imageUrl: '', previewUrl: editInitialPreview }));
    setEditUploadState('idle');
    setEditUploadMessage('기존 이미지로 되돌렸어요.');
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  }, [editInitialPreview]);

  const buildRegisterPayload = useCallback((item) => {
    if (!item) return null;
    const typeValue = (item.type || '').toLowerCase();
    const isImage = typeValue === 'image';
    const previewCandidates = [item.preview, item.poster, item.thumbnail];
    const basePreview = previewCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
    const srcCandidates = [item.src, item.poster, item.thumbnail, basePreview];
    const assetUrl = srcCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';
    if (!assetUrl) return null;

    const posterCandidates = isImage
      ? [item.poster, assetUrl, item.thumbnail, basePreview]
      : [item.poster, item.thumbnail, basePreview];
    const posterUrl = posterCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

    const thumbnailCandidates = isImage
      ? [item.thumbnail, posterUrl, assetUrl, basePreview]
      : [item.thumbnail, posterUrl, basePreview];
    const thumbnailUrl = thumbnailCandidates.find((value) => typeof value === 'string' && value.trim().length > 0) || '';

    const likesNumber = Number(item.likes);
    const viewsNumber = Number(item.views);

    const rawDuration = Number(item.durationSeconds);
    const durationSeconds = Number.isFinite(rawDuration) && rawDuration >= 0 ? Math.round(rawDuration) : 0;

    return {
      slug: item.slug,
      title: item.title || item.slug,
      description: item.description || '',
      url: assetUrl,
      durationSeconds,
      orientation: item.orientation || 'landscape',
      type: isImage ? 'image' : (typeValue || 'video'),
      poster: posterUrl || null,
      thumbnail: thumbnailUrl || null,
      likes: Number.isFinite(likesNumber) ? likesNumber : 0,
      views: Number.isFinite(viewsNumber) ? viewsNumber : 0,
      publishedAt: item.publishedAt || '',
    };
  }, []);

  const clearUndoTimer = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  }, []);

  const openDeleteModal = useCallback((item) => {
    setPendingDelete(item);
    setDeleteStatus('idle');
    setDeleteError('');
  }, []);

  const closeDeleteModal = useCallback(() => {
    setPendingDelete(null);
    setDeleteStatus('idle');
    setDeleteError('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;
    if (!hasToken) {
      setEditError('관리자 토큰이 필요합니다.');
      return;
    }

    const trimmedTitle = (editForm.title || '').trim();
    if (!trimmedTitle) {
      setEditError('제목을 입력해 주세요.');
      return;
    }

    const trimmedDescription = (editForm.description || '').trim();
    const isImageType = editingItem.type === 'image';
    const rawDurationInput = typeof editForm.durationSeconds === 'string'
      ? editForm.durationSeconds.trim()
      : String(editForm.durationSeconds || '').trim();

    let resolvedDurationSeconds;
    if (rawDurationInput === '') {
      const currentDuration = Number(editingItem.durationSeconds);
      resolvedDurationSeconds = Number.isFinite(currentDuration)
        ? Math.max(0, Math.round(currentDuration))
        : 0;
    } else {
      const parsed = Number(rawDurationInput);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setEditError('재생 시간을 올바른 숫자로 입력해 주세요.');
        return;
      }
      resolvedDurationSeconds = Math.max(0, Math.round(parsed));
    }

    const newImageUrl = editForm.imageUrl;
    const basePreview = editInitialPreview || editingItem.preview || '';

    const assetUrl = isImageType
      ? newImageUrl
        || editingItem.src
        || editingItem.poster
        || editingItem.thumbnail
        || basePreview
        || ''
      : editingItem.src
        || editingItem.poster
        || editingItem.thumbnail
        || basePreview
        || newImageUrl
        || '';

    const posterUrl = isImageType
      ? (newImageUrl || assetUrl)
      : (newImageUrl || editingItem.poster || editingItem.thumbnail || basePreview || '');

    const thumbnailUrl = isImageType
      ? (newImageUrl || assetUrl)
      : (newImageUrl || editingItem.thumbnail || editingItem.poster || basePreview || '');

    if (!assetUrl) {
      setEditStatus('idle');
      setEditError('원본 소스를 찾을 수 없어요. 이미지를 다시 업로드해 주세요.');
      return;
    }

    setEditStatus('saving');
    setEditError('');

    try {
      const res = await fetch(`/api/admin/register${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: editingItem.slug,
          title: trimmedTitle,
          description: trimmedDescription,
          url: assetUrl,
          durationSeconds: resolvedDurationSeconds,
          orientation: editingItem.orientation,
          type: editingItem.type,
          poster: posterUrl,
          thumbnail: thumbnailUrl,
          likes: editingItem.likes,
          views: editingItem.views,
          publishedAt: editingItem.publishedAt,
          metaUrl: editingItem.url,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message = payload?.error || 'save_failed';
        throw new Error(message);
      }

      setEditStatus('success');
      setItems((prev) => prev.map((it) => (it.slug === editingItem.slug
        ? { ...it, durationSeconds: resolvedDurationSeconds }
        : it)));
      setEditForm((prev) => ({
        ...prev,
        durationSeconds: String(resolvedDurationSeconds),
      }));
      setEditingItem((prev) => (prev ? {
        ...prev,
        durationSeconds: resolvedDurationSeconds,
      } : prev));
      await refresh();
      setTimeout(() => {
        closeEditModal();
      }, 900);
    } catch (error) {
      console.error('Edit save failed', error);
      setEditStatus('error');
      setEditError(error?.message === 'save_failed'
        ? '저장에 실패했어요. 잠시 후 다시 시도해 주세요.'
        : error?.message || '저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [closeEditModal, editForm.description, editForm.durationSeconds, editForm.imageUrl, editForm.title, editInitialPreview, editingItem, hasToken, qs, refresh, setEditingItem]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const item = pendingDelete;
    const payload = buildRegisterPayload(item);
    const metaUrl = typeof item.url === 'string' ? item.url : '';
    const body = item.url
      ? { url: item.url, slug: item.slug, type: item.type }
      : { pathname: item.pathname, slug: item.slug, type: item.type };
    setDeleteStatus('pending');
    setDeleteError('');

    try {
      const res = await fetch(`/api/admin/delete${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('delete_failed');

      closeDeleteModal();
      if (payload) {
        clearUndoTimer();
        setUndoInfo({
          payload,
          metaUrl,
          title: payload.title,
          slug: item.slug,
        });
        setUndoStatus('idle');
        undoTimeoutRef.current = setTimeout(() => {
          setUndoInfo(null);
          setUndoStatus('idle');
        }, 10000);
      } else {
        setUndoInfo(null);
        setUndoStatus('idle');
      }
      refresh();
    } catch (error) {
      console.error('Delete failed', error);
      setDeleteStatus('error');
      setDeleteError('삭제에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  }, [pendingDelete, buildRegisterPayload, qs, clearUndoTimer, closeDeleteModal, refresh]);

  const handleUndoDelete = useCallback(async () => {
    if (!undoInfo) return;
    setUndoStatus('pending');
    try {
      const res = await fetch(`/api/admin/register${qs}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...undoInfo.payload,
          metaUrl: undoInfo.metaUrl,
        }),
      });
      if (!res.ok) throw new Error('undo_failed');
      setUndoStatus('success');
      clearUndoTimer();
      undoTimeoutRef.current = setTimeout(() => {
        setUndoInfo(null);
        setUndoStatus('idle');
      }, 1200);
      await refresh();
    } catch (error) {
      console.error('Undo failed', error);
      setUndoStatus('error');
    }
  }, [undoInfo, qs, refresh, clearUndoTimer]);

  const handleDismissUndo = useCallback(() => {
    clearUndoTimer();
    setUndoInfo(null);
    setUndoStatus('idle');
  }, [clearUndoTimer]);

  const openMetricsEditor = useCallback((row) => {
    if (!row?.slug) return;
    const baseViews = typeof row.metrics?.views === 'number'
      ? row.metrics.views
      : (typeof row.views === 'number' ? row.views : null);
    const baseLikes = typeof row.metrics?.likes === 'number'
      ? row.metrics.likes
      : (typeof row.likes === 'number' ? row.likes : null);
    const views = baseViews === null ? '' : String(baseViews);
    const likes = baseLikes === null ? '' : String(baseLikes);
    setMetricsEditor({
      slug: row.slug,
      title: row.title || row.slug,
      views,
      likes,
      status: 'idle',
      error: '',
    });
  }, []);

  const closeMetricsEditor = useCallback(() => {
    setMetricsEditor(null);
  }, []);

  const handleMetricsFieldChange = useCallback((field, value) => {
    setMetricsEditor((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value,
        error: '',
        status: prev.status === 'error' ? 'idle' : prev.status,
      };
    });
  }, []);

  const handleMetricsSave = useCallback(async () => {
    if (!metricsEditor || !hasToken) return;
    const { slug, views, likes } = metricsEditor;

    const parseValue = (raw) => {
      if (raw === null || raw === undefined) return null;
      if (String(raw).trim() === '') return null;
      const num = Number(raw);
      if (!Number.isFinite(num)) return null;
      return Math.max(0, Math.round(num));
    };

    const parsedViews = parseValue(views);
    const parsedLikes = parseValue(likes);

    if ((views && parsedViews === null) || (likes && parsedLikes === null)) {
      setMetricsEditor((prev) => (prev ? {
        ...prev,
        status: 'error',
        error: '숫자로 입력해 주세요.',
      } : prev));
      return;
    }

    setMetricsEditor((prev) => (prev ? { ...prev, status: 'saving', error: '' } : prev));

    const payload = { slug };
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
      setMetricsBySlug((prev) => ({
        ...prev,
        [slug]: { views: nextViews, likes: nextLikes },
      }));
      setItems((prev) => prev.map((item) => (item.slug === slug ? {
        ...item,
        views: nextViews,
        likes: nextLikes,
      } : item)));
      setMetricsEditor((prev) => (prev ? {
        ...prev,
        status: 'success',
        views: String(nextViews),
        likes: String(nextLikes),
        error: '',
      } : prev));
      setTimeout(() => {
        setMetricsEditor((prev) => {
          if (!prev || prev.slug === slug) return null;
          return prev;
        });
      }, 900);
    } catch (error) {
      setMetricsEditor((prev) => (prev ? {
        ...prev,
        status: 'error',
        error: '메트릭 저장에 실패했어요. 잠시 후 다시 시도해 주세요.',
      } : prev));
    }
  }, [hasToken, metricsEditor, qs]);

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

    return raw
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 16) || `slug-${Date.now()}`;
  }

  async function registerMeta(blob) {
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
  }

  const undoDisplayTitle = undoInfo?.title || undoInfo?.payload?.title || undoInfo?.payload?.slug || '';

  return (
    <>
      <Head><title>Admin · Laffy</title></Head>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100 sm:px-6">
        <main className="mx-auto w-full max-w-5xl space-y-6">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="bg-gradient-to-r from-indigo-200 via-white to-pink-200 bg-clip-text text-3xl font-extrabold text-transparent">LAFFY Admin</h1>
            <div className="flex items-center gap-2 self-start rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
              <span className="uppercase tracking-[0.3em]">{hasToken ? 'ACCESS' : 'LOCKED'}</span>
            </div>
          </header>

          <nav className="rounded-full bg-slate-900/60 p-1 shadow-inner shadow-black/40">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
              {navItems.map((item) => {
                const active = view === item.key;
                const disabled = item.requiresToken && !hasToken;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { if (!disabled) setView(item.key); }}
                    disabled={disabled}
                    aria-pressed={active}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 ${active ? 'bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30' : 'text-slate-400 hover:text-slate-100'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {!hasToken && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
              <p className="font-semibold">토큰이 필요합니다</p>
              <p className="mt-1">URL 끝에 <code className="rounded bg-black/30 px-1">?token=YOUR_ADMIN_TOKEN</code> 을 붙여 접근해 주세요.</p>
            </div>
          )}

          <div className="relative min-h-[24rem]">
            <section
              className={`space-y-8 transition-all duration-200 ease-out ${uploadsVisible ? 'relative opacity-100' : 'absolute inset-0 -translate-y-2 opacity-0 pointer-events-none'}`}
            >
              <div className="space-y-4 rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800/70">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Title</label>
                    <input
                      disabled={!hasToken}
                      type="text"
                      placeholder="Title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
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
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">Orientation</label>
                    <select
                      disabled={!hasToken}
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
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
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm disabled:opacity-40"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <label className="mb-2 block text-xs uppercase tracking-widest text-slate-400">Upload</label>
                  <ClientBlobUploader
                    handleUploadUrl={`/api/blob/upload${qs}`}
                    accept="image/jpeg,image/png,image/webp,video/mp4"
                    maxSizeMB={200}
                    onUploaded={(blob) => registerMeta(blob)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Uploaded</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((it) => {
                    const copied = copiedSlug === it.slug;
                    return (
                      <div key={it.pathname} className="overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/70">
                        <div className="relative w-full aspect-video bg-slate-950/60">
                          {it.preview ? (
                            <img src={it.preview} alt={it.title || it.slug} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs text-slate-400">No preview</div>
                          )}
                          {it.type && (
                            <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold uppercase text-white">
                              {it.type}
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 p-3 text-sm">
                          <div className="truncate font-semibold text-slate-100">{it.title || it.slug}</div>
                          <div className="truncate text-[12px] text-slate-400">{it.slug}</div>
                          {it.description && (
                            <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-400/85">{it.description}</p>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            {it.routePath && (
                              <>
                                <a
                                  href={it.routePath}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-500"
                                >
                                  Open Route
                                </a>
                                <button
                                  onClick={async () => {
                                    try {
                                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                      const absoluteUrl = origin ? new URL(it.routePath, origin).toString() : it.routePath;
                                      const canUseClipboard = typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function';
                                      if (canUseClipboard) {
                                        await navigator.clipboard.writeText(absoluteUrl);
                                      } else if (typeof document !== 'undefined') {
                                        const textarea = document.createElement('textarea');
                                        textarea.value = absoluteUrl;
                                        textarea.setAttribute('readonly', '');
                                        textarea.style.position = 'absolute';
                                        textarea.style.left = '-9999px';
                                        document.body.appendChild(textarea);
                                        textarea.select();
                                        if (typeof document.execCommand === 'function') {
                                          document.execCommand('copy');
                                        } else {
                                          throw new Error('Clipboard API unavailable');
                                        }
                                        document.body.removeChild(textarea);
                                      }
                                      setCopiedSlug(it.slug);
                                      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                                      copyTimeoutRef.current = setTimeout(() => setCopiedSlug(''), 1800);
                                    } catch (e) {
                                      console.error('Copy failed', e);
                                    }
                                  }}
                                  className={`rounded-full px-3 py-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${copied ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/30' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                                >
                                  {copied ? 'Copied ✨' : 'Copy'}
                                </button>
                                {copied && (
                                  <span className="sr-only" aria-live="polite">링크가 복사되었습니다.</span>
                                )}
                              </>
                            )}
                            {hasToken && !it._error && (
                              <button
                                type="button"
                                onClick={() => openEditModal(it)}
                                className="rounded-full bg-gradient-to-r from-emerald-400/30 via-teal-400/25 to-cyan-400/25 px-3 py-1 text-sm font-semibold text-emerald-100 shadow-[0_12px_30px_rgba(16,185,129,0.25)] backdrop-blur transition hover:brightness-115 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              disabled={!hasToken}
                              onClick={() => openDeleteModal(it)}
                              className="ml-auto rounded-full bg-rose-600 px-3 py-1 hover:bg-rose-500 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="col-span-full rounded-2xl border border-dashed border-slate-700 px-4 py-12 text-center text-sm text-slate-400">
                      아직 업로드된 콘텐츠가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section
              className={`space-y-6 transition-all duration-200 ease-out ${analyticsVisible ? 'relative opacity-100' : 'absolute inset-0 translate-y-2 opacity-0 pointer-events-none'}`}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">콘텐츠</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatNumber(items.length)}</p>
                  <p className="mt-1 text-xs text-slate-500">등록된 메타 파일 수</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">총 조회수</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatNumber(analyticsTotals.views)}</p>
                  <p className="mt-1 text-xs text-slate-500">metrics 기준 누적</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">평균 좋아요율</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatPercent(averageLikeRate)}</p>
                  <p className="mt-1 text-xs text-slate-500">조회가 있는 콘텐츠 평균</p>
                </div>
              </div>

              {metricsError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
                  {metricsError}
                </div>
              )}

              <div className="overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/70">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800/70 text-sm">
                    <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">콘텐츠</th>
                        <th className="px-4 py-3 font-semibold">타입</th>
                        <th className="px-4 py-3 text-right font-semibold">조회수</th>
                        <th className="px-4 py-3 text-right font-semibold">좋아요</th>
                        <th className="px-4 py-3 text-right font-semibold">좋아요율</th>
                        <th className="px-4 py-3 text-right font-semibold">링크</th>
                        <th className="px-4 py-3 text-right font-semibold">편집</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {sortedAnalyticsRows.map((row) => {
                        const metrics = row.metrics;
                        const viewsDisplay = metrics ? formatNumber(metrics.views) : metricsLoading ? '불러오는 중…' : '—';
                        const likesDisplay = metrics ? formatNumber(metrics.likes) : metricsLoading ? '불러오는 중…' : '—';
                        const likeRateDisplay = metrics && metrics.views > 0 ? formatPercent(metrics.likes / metrics.views) : '—';
                        return (
                          <tr key={row.slug} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-100">{row.title || row.slug}</div>
                              <div className="text-xs text-slate-500">{row.slug}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[11px] uppercase tracking-widest text-slate-300">
                                {row.type || 'unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-100">{viewsDisplay}</td>
                            <td className="px-4 py-3 text-right text-slate-100">{likesDisplay}</td>
                            <td className="px-4 py-3 text-right text-slate-100">{likeRateDisplay}</td>
                            <td className="px-4 py-3 text-right">
                              {row.routePath ? (
                                <a
                                  href={row.routePath}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-sky-300 hover:text-sky-200"
                                >
                                  열기
                                </a>
                              ) : (
                                <span className="text-xs text-slate-500">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openMetricsEditor(row)}
                                className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                              >
                                수정
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {sortedAnalyticsRows.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                            분석할 콘텐츠가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {metricsLoading && (
                  <div className="border-t border-slate-800/70 bg-slate-900/70 px-4 py-3 text-right text-xs text-slate-400">
                    메트릭을 불러오는 중입니다…
                  </div>
                )}
              </div>
            </section>

            <section
              className={`space-y-6 transition-all duration-200 ease-out ${adsterraVisible ? 'relative opacity-100' : 'absolute inset-0 translate-y-2 opacity-0 pointer-events-none'}`}
            >
              <div className="space-y-4 rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800/70">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400">연결된 도메인</p>
                    <p className="text-sm font-semibold text-white">
                      {adsterraDomainName}
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {adsterraDomainId ? `#${adsterraDomainId}` : '—'}
                      </span>
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">환경 변수에 저장된 토큰으로 자동 연결돼요.</p>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-400 md:items-end">
                    <button
                      type="button"
                      onClick={() => {
                        fetchAdsterraPlacements();
                      }}
                      disabled={!adsterraActiveToken || adsterraLoadingPlacements}
                      className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      플레이스먼트 새로고침
                    </button>
                    {adsterraLoadingPlacements && <span>플레이스먼트를 불러오는 중입니다…</span>}
                    {!adsterraActiveToken && (
                      <span className="text-rose-200">환경 변수에 통계 API 토큰을 설정해 주세요.</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="md:col-span-2 xl:col-span-1">
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">광고 포맷 (플레이스먼트)</label>
                    <select
                      value={adsterraPlacementId}
                      onChange={(e) => handleAdsterraPlacementChange(e.target.value)}
                      disabled={!adsterraActiveToken || adsterraLoadingPlacements}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-40"
                    >
                      <option value="">플레이스먼트를 선택해 주세요</option>
                      {adsterraPlacements.map((placement) => {
                        const rawId = placement?.id ?? placement?.ID ?? placement?.placement_id ?? placement?.placementId ?? placement?.value;
                        const optionValue = rawId !== undefined && rawId !== null ? String(rawId) : '';
                        if (!optionValue) return null;
                        const label = placement?.title
                          || placement?.alias
                          || placement?.placement
                          || placement?.name
                          || placement?.ad_format
                          || `#${optionValue}`;
                        return (
                          <option key={optionValue} value={optionValue}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">시작일</label>
                    <input
                      type="date"
                      value={adsterraStartDate}
                      onChange={(e) => setAdsterraStartDate(e.target.value)}
                      max={adsterraEndDate || undefined}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">종료일</label>
                    <input
                      type="date"
                      value={adsterraEndDate}
                      onChange={(e) => setAdsterraEndDate(e.target.value)}
                      min={adsterraStartDate || undefined}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">국가 필터</label>
                    <select
                      value={adsterraCountryFilter}
                      onChange={(e) => setAdsterraCountryFilter(e.target.value)}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="">전체</option>
                      {adsterraCountryOptions.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">OS 필터</label>
                    <select
                      value={adsterraOsFilter}
                      onChange={(e) => setAdsterraOsFilter(e.target.value)}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="">전체</option>
                      {adsterraOsOptions.map((os) => (
                        <option key={os} value={os}>
                          {os}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">디바이스 필터</label>
                    <select
                      value={adsterraDeviceFilter}
                      onChange={(e) => setAdsterraDeviceFilter(e.target.value)}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="">전체</option>
                      {adsterraDeviceOptions.map((device) => (
                        <option key={device} value={device}>
                          {device}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">디바이스 포맷</label>
                    <select
                      value={adsterraDeviceFormatFilter}
                      onChange={(e) => setAdsterraDeviceFormatFilter(e.target.value)}
                      className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="">전체</option>
                      {adsterraDeviceFormatOptions.map((format) => (
                        <option key={format} value={format}>
                          {format}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleFetchAdsterraStats}
                    disabled={!adsterraCanFetchStats || adsterraLoadingStats}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {adsterraLoadingStats ? '통계 불러오는 중…' : '통계 다시 불러오기'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAdsterraDates}
                    className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800/60"
                  >
                    기간 초기화
                  </button>
                </div>

                {adsterraStatus && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                    {adsterraStatus}
                  </div>
                )}
                {adsterraError && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
                    {adsterraError}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">총 노출수</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatNumber(adsterraTotals.impressions)}</p>
                  <p className="mt-1 text-xs text-slate-500">선택한 기간 · 필터 기준 합계</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">총 클릭수</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatNumber(adsterraTotals.clicks)}</p>
                  <p className="mt-1 text-xs text-slate-500">필터 기준 평균 CTR {formatDecimal(adsterraTotals.ctr, 2)}%</p>
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-900/80 p-4 shadow-lg shadow-black/20">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">총 수익 (USD)</p>
                  <p className="mt-2 text-2xl font-bold text-white">{formatDecimal(adsterraTotals.revenue, 2)}</p>
                  <p className="mt-1 text-xs text-slate-500">필터 기준 평균 CPM {formatDecimal(adsterraTotals.cpm, 3)}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl bg-slate-900/80 ring-1 ring-slate-800/70">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800/70 text-sm">
                    <thead className="bg-slate-900/60 text-left text-xs uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">날짜</th>
                        <th className="px-4 py-3 font-semibold">국가</th>
                        <th className="px-4 py-3 font-semibold">광고 포맷</th>
                        <th className="px-4 py-3 font-semibold">OS</th>
                        <th className="px-4 py-3 font-semibold">디바이스</th>
                        <th className="px-4 py-3 font-semibold">디바이스 포맷</th>
                        <th className="px-4 py-3 text-right font-semibold">노출수</th>
                        <th className="px-4 py-3 text-right font-semibold">클릭수</th>
                        <th className="px-4 py-3 text-right font-semibold">CTR</th>
                        <th className="px-4 py-3 text-right font-semibold">CPM (USD)</th>
                        <th className="px-4 py-3 text-right font-semibold">수익 (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredAdsterraStats.map((row, index) => {
                        const impressions = Number(row?.impression ?? row?.impressions ?? 0) || 0;
                        const clicks = Number(row?.clicks ?? row?.click ?? 0) || 0;
                        const revenue = Number(row?.revenue ?? 0) || 0;
                        const ctrRaw = Number(row?.ctr ?? ((impressions > 0 && clicks >= 0) ? (clicks / impressions) * 100 : 0)) || 0;
                        const cpmRaw = Number(row?.cpm ?? ((impressions > 0 && revenue >= 0) ? (revenue / impressions) * 1000 : 0)) || 0;
                        const dateLabel = row?.date || row?.day || row?.Day || row?.group || `#${index + 1}`;
                        const countryLabel = row?.country ?? row?.Country ?? row?.geo ?? row?.Geo ?? '—';
                        const osLabel = row?.os ?? row?.OS ?? row?.platform ?? row?.Platform ?? '—';
                        const deviceLabel = row?.device ?? row?.Device ?? row?.device_type ?? row?.deviceType ?? '—';
                        const deviceFormatLabel = row?.device_format ?? row?.deviceFormat ?? row?.DeviceFormat ?? '—';
                        const placementIdFromRow = row?.placement_id
                          ?? row?.placementId
                          ?? row?.placementID
                          ?? row?.placementid;
                        const placementLabelRaw = row?.placement_name
                          ?? row?.placement
                          ?? row?.placementName
                          ?? row?.ad_format
                          ?? row?.adFormat
                          ?? '';
                        const placementResolved = placementLabelRaw
                          || (placementIdFromRow !== undefined && placementIdFromRow !== null
                            ? adsterraPlacementLabelMap.get(String(placementIdFromRow)) || ''
                            : '');
                        const placementDisplay = placementResolved
                          || adsterraPlacementLabelMap.get(adsterraPlacementId)
                          || '—';
                        const rowKey = `${dateLabel}-${index}-${placementIdFromRow ?? ''}-${countryLabel}-${osLabel}-${deviceLabel}-${deviceFormatLabel}`;
                        return (
                          <tr key={rowKey} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-semibold text-slate-100">{dateLabel}</td>
                            <td className="px-4 py-3 text-slate-100">{countryLabel}</td>
                            <td className="px-4 py-3 text-slate-100">{placementDisplay}</td>
                            <td className="px-4 py-3 text-slate-100">{osLabel}</td>
                            <td className="px-4 py-3 text-slate-100">{deviceLabel}</td>
                            <td className="px-4 py-3 text-slate-100">{deviceFormatLabel}</td>
                            <td className="px-4 py-3 text-right text-slate-100">{formatNumber(impressions)}</td>
                            <td className="px-4 py-3 text-right text-slate-100">{formatNumber(clicks)}</td>
                            <td className="px-4 py-3 text-right text-slate-100">{`${formatDecimal(ctrRaw, 3)}%`}</td>
                            <td className="px-4 py-3 text-right text-slate-100">{formatDecimal(cpmRaw, 3)}</td>
                            <td className="px-4 py-3 text-right text-slate-100">{formatDecimal(revenue, 2)}</td>
                          </tr>
                        );
                      })}
                      {!filteredAdsterraStats.length && !adsterraLoadingStats && (
                        <tr>
                          <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-400">
                            통계를 불러오면 여기에 표시됩니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {adsterraLoadingStats && (
                  <div className="border-t border-slate-800/70 bg-slate-900/70 px-4 py-3 text-right text-xs text-slate-400">
                    통계를 불러오는 중입니다…
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
      {metricsEditor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm px-4 py-10">
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_32px_100px_rgba(15,23,42,0.7)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-metrics-modal-title"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
            <button
              type="button"
              onClick={closeMetricsEditor}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              aria-label="메트릭 편집 닫기"
            >
              ✕
            </button>
            <div className="space-y-6 p-7 sm:p-9">
              <header className="space-y-2">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400/70">Metrics</p>
                <h3 id="admin-metrics-modal-title" className="text-xl font-semibold text-white sm:text-2xl">
                  {metricsEditor.title}
                </h3>
                <p className="text-[12px] text-slate-500">Slug · {metricsEditor.slug}</p>
              </header>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400">조회수</label>
                  <input
                    value={metricsEditor.views}
                    onChange={(event) => handleMetricsFieldChange('views', event.target.value)}
                    placeholder="숫자 입력"
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400">좋아요</label>
                  <input
                    value={metricsEditor.likes}
                    onChange={(event) => handleMetricsFieldChange('likes', event.target.value)}
                    placeholder="숫자 입력"
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>

              {metricsEditor.error && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {metricsEditor.error}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeMetricsEditor}
                  className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleMetricsSave}
                  disabled={metricsSaving}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.35)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-100 disabled:cursor-wait disabled:opacity-70"
                >
                  {metricsSaving ? '저장 중…' : metricsSuccess ? '저장 완료!' : '메트릭 저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur">
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-rose-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_40px_120px_rgba(127,29,29,0.55)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-delete-modal-title"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300" />
            <button
              type="button"
              onClick={closeDeleteModal}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
              aria-label="삭제 확인 창 닫기"
            >
              ✕
            </button>
            <div className="space-y-6 p-7 sm:p-9">
              <header className="space-y-2">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400/70">Delete Content</p>
                <h3 id="admin-delete-modal-title" className="text-2xl font-semibold text-white sm:text-3xl">{pendingDelete.title || pendingDelete.slug}</h3>
                <p className="text-[12px] text-slate-500">Slug · {pendingDelete.slug}</p>
              </header>

              <div className="space-y-4 text-sm text-slate-200/90">
                <p>이 콘텐츠의 메타 데이터가 영구 삭제됩니다. 삭제 후 10초 안에 되돌리기가 가능합니다.</p>
                <div className="space-y-2 rounded-2xl border border-rose-500/20 bg-slate-900/70 p-4 text-xs text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-widest text-slate-500">Slug</span>
                    <span className="font-mono text-[11px] text-slate-200">{pendingDelete.slug}</span>
                  </div>
                  {pendingDelete.routePath && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="uppercase tracking-widest text-slate-500">Route</span>
                      <span className="truncate text-[11px] text-slate-200">{pendingDelete.routePath}</span>
                    </div>
                  )}
                  {pendingDelete.preview && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="uppercase tracking-widest text-slate-500">Preview</span>
                      <span className="truncate text-[11px] text-slate-200">{pendingDelete.preview}</span>
                    </div>
                  )}
                </div>
                <p className="text-[12px] text-rose-200/80">
                  이 작업은 메타 파일을 삭제하지만 원본 미디어는 별도 보관됩니다. 필요 시 되돌리기를 눌러 복구할 수 있습니다.
                </p>
              </div>

              {deleteError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {deleteError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteStatus === 'pending'}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(248,113,113,0.35)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:cursor-wait disabled:opacity-70"
                >
                  {deleteStatus === 'pending' ? '삭제 중…' : '영구 삭제'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm px-4 py-10">
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_48px_140px_rgba(15,23,42,0.68)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-edit-modal-title"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <button
              type="button"
              onClick={closeEditModal}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
              aria-label="편집 창 닫기"
            >
              ✕
            </button>
            <div className="space-y-6 p-7 sm:p-10">
              <header className="space-y-2">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400/70">Edit Content</p>
                <h3 id="admin-edit-modal-title" className="text-2xl font-semibold text-white sm:text-3xl">{editingItem.title || editingItem.slug}</h3>
                <p className="text-[12px] text-slate-500">Slug · {editingItem.slug}</p>
              </header>

              <div className="grid gap-5">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400">Title</label>
                  <input
                    value={editForm.title}
                    onChange={(e) => handleEditFieldChange('title', e.target.value)}
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="콘텐츠 제목"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => handleEditFieldChange('description', e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="간단한 설명을 입력해 주세요."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-slate-400">Duration (seconds)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={editForm.durationSeconds}
                    onChange={(e) => handleEditFieldChange('durationSeconds', e.target.value)}
                    className="w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-3 text-sm text-white shadow-inner shadow-black/40 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="예: 123"
                  />
                  <p className="text-xs text-slate-500">초 단위로 입력해 주세요. 비워두면 기존 값이 유지됩니다.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-widest text-slate-400">대표 이미지</label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/70 sm:h-44 sm:w-44">
                      {editForm.previewUrl ? (
                        <img src={editForm.previewUrl} alt={`${editingItem.slug} preview`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs text-slate-500">이미지가 없습니다</div>
                      )}
                      {editUploadState === 'uploading' && (
                        <div className="absolute inset-0 grid place-items-center bg-slate-950/70 text-xs font-medium text-indigo-200">
                          업로드 중…
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3 text-xs text-slate-300/80">
                      <p>
                        새로운 이미지를 업로드하면 즉시 교체됩니다. 이미지 비율은 원본에 맞춰 표시돼요.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <input
                          ref={editFileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleEditImageUpload}
                        />
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(99,102,241,0.4)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-200"
                        >
                          이미지 교체
                        </button>
                        <button
                          type="button"
                          onClick={handleRevertImage}
                          disabled={!editForm.imageUrl}
                          className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          원본으로
                        </button>
                      </div>
                      {editUploadMessage && (
                        <p
                          className={`text-xs ${editUploadState === 'error' ? 'text-rose-300' : editUploadState === 'success' ? 'text-emerald-300' : 'text-slate-400'}`}
                        >
                          {editUploadMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {editError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {editError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={editStatus === 'saving'}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(16,185,129,0.35)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-100 disabled:cursor-wait disabled:opacity-70"
                >
                  {editStatus === 'saving' ? '저장 중…' : editStatus === 'success' ? '저장 완료!' : '변경사항 저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {undoInfo && (
        <div className="fixed bottom-6 left-1/2 z-40 w-[min(90vw,26rem)] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 text-sm text-slate-200 shadow-[0_25px_60px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="flex-1" role="status" aria-live="polite">
              {undoStatus === 'error'
                ? '복원에 실패했어요. 다시 시도해 주세요.'
                : undoStatus === 'success'
                  ? '복원이 완료됐어요!'
                  : `${undoDisplayTitle ? `‘${undoDisplayTitle}’` : '콘텐츠'} 항목을 삭제했어요.`}
            </div>
            <button
              type="button"
              onClick={handleUndoDelete}
              disabled={undoStatus === 'pending' || undoStatus === 'success'}
              className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold shadow ${undoStatus === 'pending' || undoStatus === 'success' ? 'cursor-default bg-white/40 text-slate-700' : 'bg-white text-slate-900 hover:bg-white/90'}`}
            >
              {undoStatus === 'pending'
                ? '복원 중…'
                : undoStatus === 'success'
                  ? '완료'
                  : '되돌리기'}
            </button>
            <button
              type="button"
              onClick={handleDismissUndo}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200"
              aria-label="되돌리기 알림 닫기"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

Admin.disableAds = true;
