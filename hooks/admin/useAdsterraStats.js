import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const ADSTERRA_ALL_PLACEMENTS_VALUE = '__all__';

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

export default function useAdsterraStats({ visible }) {
  const defaultRange = useMemo(() => getDefaultAdsterraDateRange(), []);
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
  const [adsterraPlacementId, setAdsterraPlacementId] = useState(ADSTERRA_ALL_PLACEMENTS_VALUE);
  const [adsterraStartDate, setAdsterraStartDate] = useState(defaultRange.start);
  const [adsterraEndDate, setAdsterraEndDate] = useState(defaultRange.end);
  const [adsterraStats, setAdsterraStats] = useState([]);
  const [adsterraLoadingPlacements, setAdsterraLoadingPlacements] = useState(false);
  const [adsterraLoadingStats, setAdsterraLoadingStats] = useState(false);
  const [adsterraError, setAdsterraError] = useState('');
  const [adsterraStatus, setAdsterraStatus] = useState('');
  const [adsterraCountryFilter, setAdsterraCountryFilter] = useState('');
  const [adsterraOsFilter, setAdsterraOsFilter] = useState('');
  const [adsterraDeviceFilter, setAdsterraDeviceFilter] = useState('');
  const [adsterraDeviceFormatFilter, setAdsterraDeviceFormatFilter] = useState('');

  const adsterraPlacementsRequestRef = useRef(0);
  const adsterraPlacementsInitializedRef = useRef(false);
  const adsterraStatsRequestRef = useRef(0);
  const adsterraDomainRequestRef = useRef(0);
  const adsterraDomainResolvingRef = useRef(false);

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

      const isAllSelected = adsterraPlacementId === ADSTERRA_ALL_PLACEMENTS_VALUE;

      if (placements.length) {
        const hasCurrent = placements.some((placement) => extractPlacementId(placement) === adsterraPlacementId);
        if (!hasCurrent && !isAllSelected) {
          const firstId = extractPlacementId(placements[0]);
          if (firstId) {
            setAdsterraPlacementId(firstId);
          }
        }
      } else {
        setAdsterraPlacementId(ADSTERRA_ALL_PLACEMENTS_VALUE);
      }
      setAdsterraStatus(placements.length ? '플레이스먼트를 불러왔어요.' : '등록된 플레이스먼트를 찾을 수 없어요.');
    } catch (error) {
      if (adsterraPlacementsRequestRef.current === requestId) {
        setAdsterraPlacements([]);
        setAdsterraPlacementId(ADSTERRA_ALL_PLACEMENTS_VALUE);
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
    if (!adsterraActiveToken) {
      return;
    }
    if (!adsterraDomainId) {
      return;
    }
    if (adsterraPlacementsInitializedRef.current) {
      return;
    }
    fetchAdsterraPlacements();
  }, [adsterraActiveToken, adsterraDomainId, fetchAdsterraPlacements]);

  const handleAdsterraPlacementChange = useCallback((value) => {
    if (!value) {
      setAdsterraPlacementId('');
      return;
    }
    if (value === ADSTERRA_ALL_PLACEMENTS_VALUE) {
      setAdsterraPlacementId(ADSTERRA_ALL_PLACEMENTS_VALUE);
      return;
    }
    setAdsterraPlacementId(value);
  }, []);

  const adsterraAllPlacementsSelected = adsterraPlacementId === ADSTERRA_ALL_PLACEMENTS_VALUE;

  const adsterraCanFetchStats = useMemo(
    () =>
      Boolean(
        adsterraActiveToken &&
          adsterraDomainId &&
          adsterraStartDate &&
          adsterraEndDate &&
          (adsterraAllPlacementsSelected || adsterraPlacementId)
      ),
    [
      adsterraActiveToken,
      adsterraDomainId,
      adsterraStartDate,
      adsterraEndDate,
      adsterraAllPlacementsSelected,
      adsterraPlacementId,
    ]
  );

  const handleFetchAdsterraStats = useCallback(async () => {
    if (adsterraLoadingStats) {
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
    if (!adsterraStartDate || !adsterraEndDate) {
      setAdsterraError('날짜 범위를 올바르게 지정해 주세요.');
      return;
    }

    const requestId = adsterraStatsRequestRef.current + 1;
    adsterraStatsRequestRef.current = requestId;
    setAdsterraLoadingStats(true);
    setAdsterraError('');
    setAdsterraStatus('통계를 불러오는 중이에요.');

    try {
      const res = await fetch('/api/adsterra/stats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: adsterraActiveToken,
          domainId: adsterraDomainId,
          placementId: adsterraAllPlacementsSelected ? undefined : adsterraPlacementId,
          allPlacements: adsterraAllPlacementsSelected,
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
    adsterraAllPlacementsSelected,
    adsterraPlacementId,
    adsterraStartDate,
    adsterraEndDate,
    adsterraLoadingStats,
  ]);

  useEffect(() => {
    if (!visible) return;
    if (!adsterraCanFetchStats) return;
    handleFetchAdsterraStats();
  }, [visible, adsterraCanFetchStats, handleFetchAdsterraStats]);

  const handleResetAdsterraDates = useCallback(() => {
    setAdsterraStartDate(defaultRange.start);
    setAdsterraEndDate(defaultRange.end);
  }, [defaultRange.end, defaultRange.start]);

  const adsterraPlacementLabelMap = useMemo(() => {
    const map = new Map();
    adsterraPlacements.forEach((placement) => {
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

  return {
    adsterraEnvToken,
    adsterraActiveToken,
    setAdsterraActiveToken,
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
  };
}
