import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const ADSTERRA_ALL_PLACEMENTS_VALUE = '__all__';

export const ADSTERRA_PLACEMENT_PRESETS = [
  { id: '27624780', label: 'Smartlink' },
  { id: '27611711', label: '300x250' },
];

const ALLOWED_PLACEMENT_IDS = ADSTERRA_PLACEMENT_PRESETS.map(({ id }) => id);
const ALLOWED_PLACEMENT_NAMES = ['smartlink_1', '300x250_1'];
const PLACEMENT_LABEL_PRESETS = ADSTERRA_PLACEMENT_PRESETS.reduce((acc, preset) => {
  acc[preset.id] = preset.label;
  return acc;
}, {});
export const ADSTERRA_REQUIRED_PLACEMENT_SUMMARY = ADSTERRA_PLACEMENT_PRESETS.map(
  ({ id, label }) => `${label}(${id})`
).join('과 ');

const IMPRESSION_KEYS = [
  'impression',
  'impressions',
  'impressions_count',
  'total_impressions',
  'shows',
  'show',
  'views',
  'display',
  'display_count',
];
const CLICK_KEYS = ['clicks', 'click', 'click_count', 'total_clicks'];
const REVENUE_KEYS = [
  'revenue',
  'earnings',
  'income',
  'profit',
  'estimated_income',
  'estimate',
  'total_revenue',
  'payout',
];

function toFiniteNumber(value) {
  const numberLike = typeof value === 'string' ? value.replace(/,/g, '') : value;
  const parsed = Number(numberLike);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readMetric(row, keys) {
  if (!row || typeof row !== 'object') return 0;
  for (const key of keys) {
    if (!key) continue;
    const candidate = row?.[key];
    if (candidate === undefined || candidate === null || candidate === '') continue;
    const parsed = toFiniteNumber(candidate);
    if (parsed !== 0) return parsed;
    if (Number.isFinite(Number(candidate))) return Number(candidate);
  }
  return 0;
}

function normalizePlacementName(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function normalizePlacementId(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function extractPlacementLabel(placement) {
  if (!placement || typeof placement !== 'object') return '';
  const label =
    placement.title ||
    placement.alias ||
    placement.name ||
    placement.placement ||
    placement.ad_format ||
    placement.format ||
    '';
  return String(label).trim();
}

function extractPlacementId(placement) {
  if (!placement || typeof placement !== 'object') return '';
  const idValue =
    placement.id ??
    placement.ID ??
    placement.placement_id ??
    placement.placementId ??
    placement.value;
  return idValue !== undefined && idValue !== null ? String(idValue) : '';
}

function isPlacementAllowed(placement) {
  const idValue = normalizePlacementId(extractPlacementId(placement));
  if (idValue && ALLOWED_PLACEMENT_IDS.includes(idValue)) {
    return true;
  }
  const normalized = normalizePlacementName(extractPlacementLabel(placement));
  return normalized && ALLOWED_PLACEMENT_NAMES.includes(normalized);
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function parseUtcDateLike(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00Z`);
  }
  if (/Z$/i.test(raw)) {
    return new Date(raw);
  }
  return new Date(`${raw}Z`);
}

function toKstDateParts(input) {
  const parsed = parseUtcDateLike(input);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return { dateOnly: '', label: '', iso: '' };
  }
  const kst = new Date(parsed.getTime() + KST_OFFSET_MS);
  const iso = kst.toISOString();
  const dateOnly = iso.slice(0, 10);
  const time = iso.slice(11, 16);
  return { dateOnly, label: `${dateOnly} ${time}`, iso };
}

export default function useAdsterraStats({
  enabled,
  defaultRange,
  envToken,
  domainName,
  domainKey,
  initialDomainId = '',
}) {
  const [activeToken, setActiveToken] = useState(envToken || '');
  const [domainId, setDomainId] = useState(initialDomainId || '');
  const [placements, setPlacements] = useState([]);
  const [placementId, setPlacementId] = useState(ADSTERRA_ALL_PLACEMENTS_VALUE);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [stats, setStats] = useState([]);
  const [loadingPlacements, setLoadingPlacements] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [osFilter, setOsFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [deviceFormatFilter, setDeviceFormatFilter] = useState('');

  const placementsRequestRef = useRef(0);
  const statsRequestRef = useRef(0);
  const domainRequestRef = useRef(0);
  const domainResolvingRef = useRef(false);
  const placementsInitializedRef = useRef(false);
  const allowedPlacementIdsRef = useRef([]);

  useEffect(() => {
    if (envToken && !activeToken) setActiveToken(envToken);
  }, [envToken, activeToken]);

  const resolveDomainId = useCallback(async () => {
    if (!activeToken) return;
    if (domainId || domainResolvingRef.current) return;

    const requestId = domainRequestRef.current + 1;
    domainRequestRef.current = requestId;
    domainResolvingRef.current = true;
    setStatus('도메인 정보를 불러오는 중이에요.');
    setError('');

    try {
      const res = await fetch('/api/adsterra/domains', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: activeToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || '도메인 목록을 불러오지 못했어요.');
      }
      if (domainRequestRef.current !== requestId) return;

      const domains = Array.isArray(json?.domains) ? json.domains : [];
      const normalizedName = (domainName || '').trim().toLowerCase();
      const normalizedKey = (domainKey || '').trim().toLowerCase();

      const matched = domains.find((domain) => {
        if (!domain || typeof domain !== 'object') return false;
        const domainIdValue = (domain.id ?? '').toString().trim();
        const domainTitleValue = (domain.title ?? '').toString().trim();
        const normalizedTitle = domainTitleValue.toLowerCase();
        if (normalizedName && normalizedTitle === normalizedName) {
          return true;
        }
        if (!normalizedKey) return false;
        return (
          normalizedTitle === normalizedKey || domainIdValue.toLowerCase() === normalizedKey
        );
      });

      if (matched && matched.id) {
        setDomainId(String(matched.id));
        setStatus(`도메인 ${matched.title || matched.id}을(를) 사용해요.`);
        setError('');
      } else {
        setStatus('');
        setError('도메인 목록에서 일치하는 항목을 찾지 못했어요. 환경 변수를 확인해 주세요.');
      }
    } catch (err) {
      if (domainRequestRef.current === requestId) {
        setStatus('');
        setError(err.message || '도메인 목록을 불러오지 못했어요.');
      }
    } finally {
      if (domainRequestRef.current === requestId) {
        domainResolvingRef.current = false;
      }
    }
  }, [activeToken, domainId, domainKey, domainName]);

  useEffect(() => {
    if (!activeToken || domainId) return;
    resolveDomainId();
  }, [activeToken, domainId, resolveDomainId]);

  const fetchPlacements = useCallback(async () => {
    if (loadingPlacements) return;
    if (!activeToken) {
      setError('통계 API 토큰이 설정되지 않았어요.');
      return;
    }
    if (!domainId) {
      setError('도메인 정보가 올바르지 않습니다.');
      return;
    }

    placementsInitializedRef.current = true;
    const requestId = placementsRequestRef.current + 1;
    placementsRequestRef.current = requestId;
    setLoadingPlacements(true);
    setError('');
    setStatus('');

    try {
      const res = await fetch('/api/adsterra/placements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: activeToken, domainId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || '플레이스먼트를 불러오지 못했어요.');
      }
      if (placementsRequestRef.current !== requestId) return;

      const placementsItems = Array.isArray(json?.placements) ? json.placements : [];
      const filteredPlacements = placementsItems.filter(isPlacementAllowed);
      const collectedIds = new Set(ALLOWED_PLACEMENT_IDS);
      filteredPlacements.forEach((placement) => {
        const placementIdValue = extractPlacementId(placement);
        if (placementIdValue) {
          collectedIds.add(String(placementIdValue));
        }
      });
      allowedPlacementIdsRef.current = Array.from(collectedIds);
      setPlacements(filteredPlacements);

      const isAllSelected = placementId === ADSTERRA_ALL_PLACEMENTS_VALUE;

      if (filteredPlacements.length) {
        const hasCurrent = filteredPlacements.some(
          (placement) => extractPlacementId(placement) === placementId
        );
        if (!hasCurrent && !isAllSelected) {
          const firstId = extractPlacementId(filteredPlacements[0]);
          if (firstId) {
            setPlacementId(firstId);
          }
        }
      } else {
        setPlacementId(ADSTERRA_ALL_PLACEMENTS_VALUE);
      }
      setStatus(
        filteredPlacements.length
          ? '집중 모니터링 대상 플레이스먼트를 정렬했어요.'
          : `${ADSTERRA_REQUIRED_PLACEMENT_SUMMARY} 플레이스먼트를 찾지 못했어요.`
      );
    } catch (err) {
      if (placementsRequestRef.current === requestId) {
        setPlacements([]);
        setPlacementId(ADSTERRA_ALL_PLACEMENTS_VALUE);
        setStats([]);
        allowedPlacementIdsRef.current = [];
        setError(err.message || '플레이스먼트를 불러오지 못했어요.');
      }
    } finally {
      if (placementsRequestRef.current === requestId) {
        setLoadingPlacements(false);
      }
    }
  }, [activeToken, domainId, loadingPlacements, placementId]);

  useEffect(() => {
    placementsInitializedRef.current = false;
    allowedPlacementIdsRef.current = [];
  }, [activeToken, domainId]);

  useEffect(() => {
    if (!enabled) return;
    if (placementsInitializedRef.current) return;
    if (!activeToken) {
      setError('통계 API 토큰이 설정되지 않았어요.');
      return;
    }
    if (!domainId) {
      resolveDomainId();
      return;
    }
    fetchPlacements();
  }, [enabled, activeToken, fetchPlacements, domainId, resolveDomainId]);

  const canFetchStats = useMemo(
    () =>
      Boolean(
        activeToken &&
          domainId &&
          startDate &&
          endDate &&
          (placementId === ADSTERRA_ALL_PLACEMENTS_VALUE
            ? placements.length > 0
            : placementId)
      ),
    [activeToken, domainId, endDate, placementId, placements.length, startDate]
  );

  const fetchStats = useCallback(async () => {
    if (!activeToken) {
      setError('통계 API 토큰 환경 변수를 확인해 주세요.');
      return;
    }
    if (!domainId) {
      setError('도메인 정보가 설정되지 않았어요. 환경 변수를 확인해 주세요.');
      return;
    }
    const isAllSelected = placementId === ADSTERRA_ALL_PLACEMENTS_VALUE;
    if (!isAllSelected && !placementId) {
      setError('수익 포맷(플레이스먼트)을 선택해 주세요.');
      return;
    }
    if (isAllSelected && allowedPlacementIdsRef.current.length === 0) {
      setError('집중 모니터링할 플레이스먼트가 없습니다. 플레이스먼트를 먼저 불러와 주세요.');
      return;
    }
    if (!startDate || !endDate) {
      setError('조회 기간을 모두 입력해 주세요.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setError('시작일은 종료일보다 늦을 수 없어요.');
      return;
    }

    const requestId = statsRequestRef.current + 1;
    statsRequestRef.current = requestId;
    setLoadingStats(true);
    setError('');
    setStatus('');
    setStats([]);

    try {
      const selectedPlacementIds = isAllSelected
        ? [...allowedPlacementIdsRef.current]
        : placementId
        ? [placementId]
        : [];

      const res = await fetch('/api/adsterra/stats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: activeToken,
          domainId,
          placementId: !isAllSelected && placementId ? placementId : undefined,
          placementIds: selectedPlacementIds,
          allPlacements: isAllSelected && selectedPlacementIds.length === 0,
          startDate,
          endDate,
          groupBy: ['date', 'placement'],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || '통계를 불러오지 못했어요.');
      }
      if (statsRequestRef.current !== requestId) return;
      const items = Array.isArray(json?.items) ? json.items : [];
      const normalizedItems = items.map((entry) => {
        if (!entry || typeof entry !== 'object') return entry;
        const source = entry.date ?? entry.day ?? entry.Day ?? entry.group ?? '';
        const { dateOnly, label, iso } = toKstDateParts(source);
        const impressionsValue = readMetric(entry, IMPRESSION_KEYS);
        const clicksValue = readMetric(entry, CLICK_KEYS);
        const revenueValue = readMetric(entry, REVENUE_KEYS);
        return {
          ...entry,
          rawDate: source,
          localDate: dateOnly || (typeof source === 'string' ? source : ''),
          localDateLabel: label || (typeof source === 'string' ? source : ''),
          localDateIso: iso || '',
          impressionsValue,
          clicksValue,
          revenueValue,
        };
      });
      const allowedPlacementNames = new Set(ALLOWED_PLACEMENT_NAMES);
      const allowedPlacementIds = new Set(ALLOWED_PLACEMENT_IDS);
      allowedPlacementIdsRef.current.forEach((value) => {
        if (value !== undefined && value !== null) {
          allowedPlacementIds.add(String(value));
        }
      });

      const sanitizedItems = normalizedItems.filter((entry) => {
        const placementIdValue =
          entry?.placement_id ??
          entry?.placementId ??
          entry?.placementID ??
          entry?.placementid;
        const normalizedPlacementId =
          placementIdValue !== undefined && placementIdValue !== null
            ? String(placementIdValue)
            : '';

        if (normalizedPlacementId && allowedPlacementIds.has(normalizedPlacementId)) {
          return true;
        }

        const placementLabel =
          entry?.placement_name ??
          entry?.placement ??
          entry?.placementName ??
          entry?.ad_format ??
          entry?.format ??
          '';
        const normalizedPlacementLabel = normalizePlacementName(placementLabel);
        if (normalizedPlacementLabel && allowedPlacementNames.has(normalizedPlacementLabel)) {
          return true;
        }

        return true;
      });

      setStats(sanitizedItems);
      setStatus('통계를 최신 상태로 불러왔어요.');
    } catch (err) {
      if (statsRequestRef.current === requestId) {
        setStats([]);
        setError(err.message || '통계를 불러오지 못했어요.');
      }
    } finally {
      if (statsRequestRef.current === requestId) {
        setLoadingStats(false);
      }
    }
  }, [activeToken, domainId, endDate, placementId, startDate]);

  useEffect(() => {
    if (!enabled) return;
    if (!canFetchStats) return;
    fetchStats();
  }, [enabled, canFetchStats, fetchStats]);

  const placementLabelMap = useMemo(() => {
    const map = new Map();
    placements.forEach((placement) => {
      if (!placement || typeof placement !== 'object') return;
      const id = placement.id ?? placement.ID ?? placement.placement_id ?? placement.placementId;
      if (!id && id !== 0) return;
      const idKey = String(id);
      const label =
        placement.title ||
        placement.alias ||
        placement.name ||
        placement.placement ||
        placement.ad_format ||
        placement.format ||
        PLACEMENT_LABEL_PRESETS[idKey] ||
        idKey;
      map.set(idKey, label);
    });
    return map;
  }, [placements]);

  const makeUniqueSortedOptions = useCallback((getter) => {
    const values = new Set();
    stats.forEach((row) => {
      const value = getter(row);
      if (value) values.add(String(value));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [stats]);

  const countryOptions = useMemo(
    () =>
      makeUniqueSortedOptions(
        (row) => row?.country ?? row?.Country ?? row?.geo ?? row?.Geo
      ),
    [makeUniqueSortedOptions]
  );
  const osOptions = useMemo(
    () =>
      makeUniqueSortedOptions(
        (row) => row?.os ?? row?.OS ?? row?.platform ?? row?.Platform
      ),
    [makeUniqueSortedOptions]
  );
  const deviceOptions = useMemo(
    () =>
      makeUniqueSortedOptions(
        (row) => row?.device ?? row?.Device ?? row?.device_type ?? row?.deviceType
      ),
    [makeUniqueSortedOptions]
  );
  const deviceFormatOptions = useMemo(
    () =>
      makeUniqueSortedOptions(
        (row) => row?.device_format ?? row?.deviceFormat ?? row?.DeviceFormat
      ),
    [makeUniqueSortedOptions]
  );

  const filteredStats = useMemo(() => {
    const normalize = (value) => {
      if (value === null || value === undefined) return '';
      return String(value).trim().toLowerCase();
    };

    const normalizedCountry = normalize(countryFilter);
    const normalizedOs = normalize(osFilter);
    const normalizedDevice = normalize(deviceFilter);
    const normalizedDeviceFormat = normalize(deviceFormatFilter);

    return stats.filter((row) => {
      const countryValue = row?.country ?? row?.Country ?? row?.geo ?? row?.Geo;
      if (normalizedCountry && normalize(countryValue) !== normalizedCountry) return false;

      const osValue = row?.os ?? row?.OS ?? row?.platform ?? row?.Platform;
      if (normalizedOs && normalize(osValue) !== normalizedOs) return false;

      const deviceValue = row?.device ?? row?.Device ?? row?.device_type ?? row?.deviceType;
      if (normalizedDevice && normalize(deviceValue) !== normalizedDevice) return false;

      const deviceFormatValue =
        row?.device_format ?? row?.deviceFormat ?? row?.DeviceFormat;
      if (normalizedDeviceFormat && normalize(deviceFormatValue) !== normalizedDeviceFormat)
        return false;

      return true;
    });
  }, [stats, countryFilter, osFilter, deviceFilter, deviceFormatFilter]);

  const totals = useMemo(() => {
    if (!Array.isArray(filteredStats) || !filteredStats.length) {
      return { impressions: 0, clicks: 0, revenue: 0, ctr: 0, cpm: 0 };
    }

    const totalsValue = filteredStats.reduce(
      (acc, row) => {
        const impressions = row?.impressionsValue ?? readMetric(row, IMPRESSION_KEYS);
        const clicks = row?.clicksValue ?? readMetric(row, CLICK_KEYS);
        const revenue = row?.revenueValue ?? readMetric(row, REVENUE_KEYS);
        return {
          impressions: acc.impressions + (Number.isFinite(impressions) ? impressions : 0),
          clicks: acc.clicks + (Number.isFinite(clicks) ? clicks : 0),
          revenue: acc.revenue + (Number.isFinite(revenue) ? revenue : 0),
        };
      },
      { impressions: 0, clicks: 0, revenue: 0 }
    );

    const ctr = totalsValue.impressions > 0 ? (totalsValue.clicks / totalsValue.impressions) * 100 : 0;
    const cpm = totalsValue.impressions > 0 ? (totalsValue.revenue / totalsValue.impressions) * 1000 : 0;

    return { ...totalsValue, ctr, cpm };
  }, [filteredStats]);

  const resetDates = useCallback(() => {
    setStartDate(defaultRange.start);
    setEndDate(defaultRange.end);
  }, [defaultRange.end, defaultRange.start]);

  const placementLabel = useCallback(
    (id) => {
      if (id === ADSTERRA_ALL_PLACEMENTS_VALUE) return '전체 보기';
      const key = String(id);
      return placementLabelMap.get(key) || PLACEMENT_LABEL_PRESETS[key] || '';
    },
    [placementLabelMap]
  );

  return {
    activeToken,
    setActiveToken,
    domainId,
    setDomainId,
    placements,
    placementId,
    setPlacementId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    stats,
    filteredStats,
    loadingPlacements,
    loadingStats,
    error,
    status,
    setStatus,
    setError,
    fetchPlacements,
    fetchStats,
    countryFilter,
    setCountryFilter,
    osFilter,
    setOsFilter,
    deviceFilter,
    setDeviceFilter,
    deviceFormatFilter,
    setDeviceFormatFilter,
    countryOptions,
    osOptions,
    deviceOptions,
    deviceFormatOptions,
    totals,
    canFetchStats,
    resetDates,
    placementLabelMap,
    placementLabel,
    activeFilters: {
      country: countryFilter,
      os: osFilter,
      device: deviceFilter,
      deviceFormat: deviceFormatFilter,
    },
  };
}
