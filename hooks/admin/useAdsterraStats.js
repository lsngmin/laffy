import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKstLabel(raw) {
  if (!raw) return '';
  const value = typeof raw === 'string' ? raw.trim() : String(raw);
  if (!value) return '';
  const normalized = value.includes('T') || value.includes(':') ? value : `${value}T00:00:00Z`;
  let parsed = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
  if (Number.isNaN(parsed.getTime())) {
    parsed = new Date(normalized);
  }
  if (Number.isNaN(parsed.getTime())) return value;
  const kst = new Date(parsed.getTime() + KST_OFFSET_MS);
  const iso = kst.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export const ADSTERRA_ALL_PLACEMENTS_VALUE = '__all__';

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
      setPlacements(placementsItems);

      const extractPlacementId = (placement) => {
        if (!placement || typeof placement !== 'object') return '';
        const idValue =
          placement.id ??
          placement.ID ??
          placement.placement_id ??
          placement.placementId ??
          placement.value;
        return idValue !== undefined && idValue !== null ? String(idValue) : '';
      };

      const isAllSelected = placementId === ADSTERRA_ALL_PLACEMENTS_VALUE;

      if (placementsItems.length) {
        const hasCurrent = placementsItems.some(
          (placement) => extractPlacementId(placement) === placementId
        );
        if (!hasCurrent && !isAllSelected) {
          const firstId = extractPlacementId(placementsItems[0]);
          if (firstId) {
            setPlacementId(firstId);
          }
        }
      } else {
        setPlacementId(ADSTERRA_ALL_PLACEMENTS_VALUE);
      }
      setStatus(placementsItems.length ? '플레이스먼트를 불러왔어요.' : '등록된 플레이스먼트를 찾을 수 없어요.');
    } catch (err) {
      if (placementsRequestRef.current === requestId) {
        setPlacements([]);
        setPlacementId(ADSTERRA_ALL_PLACEMENTS_VALUE);
        setStats([]);
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
          (placementId === ADSTERRA_ALL_PLACEMENTS_VALUE || placementId)
      ),
    [activeToken, domainId, endDate, placementId, startDate]
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
    if (placementId !== ADSTERRA_ALL_PLACEMENTS_VALUE && !placementId) {
      setError('광고 포맷(플레이스먼트)을 선택해 주세요.');
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
      const res = await fetch('/api/adsterra/stats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: activeToken,
          domainId,
          placementId: placementId === ADSTERRA_ALL_PLACEMENTS_VALUE ? undefined : placementId,
          allPlacements: placementId === ADSTERRA_ALL_PLACEMENTS_VALUE,
          startDate,
          endDate,
          groupBy: ['date'],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || '통계를 불러오지 못했어요.');
      }
      if (statsRequestRef.current !== requestId) return;
      const items = Array.isArray(json?.items) ? json.items : [];
      const normalizedItems = items.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const dateLabel = item.kstDate || item.date || item.day || item.Day || item.group;
        return {
          ...item,
          kstDate: toKstLabel(dateLabel),
        };
      });
      setStats(normalizedItems);
      setStatus(`총 ${items.length}건의 통계를 불러왔어요. (필터는 클라이언트에서 적용됩니다)`);
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
      const label =
        placement.title ||
        placement.alias ||
        placement.name ||
        placement.placement ||
        placement.ad_format ||
        placement.format ||
        String(id);
      map.set(String(id), label);
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
      return placementLabelMap.get(String(id)) || '';
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
  };
}
