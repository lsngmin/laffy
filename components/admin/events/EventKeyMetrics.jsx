import { useId, useMemo } from 'react';

function aggregateByEvent(items) {
  const map = new Map();
  if (!Array.isArray(items)) return map;
  items.forEach((item) => {
    const name = typeof item?.eventName === 'string' ? item.eventName : '';
    if (!name) return;
    const prev = map.get(name) || { count: 0, valueSum: 0 };
    const count = Number(item?.count) || 0;
    const valueSum = Number(item?.valueSum) || 0;
    map.set(name, {
      count: prev.count + count,
      valueSum: prev.valueSum + valueSum,
    });
  });
  return map;
}

function clampRatio(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  if (num >= 1) return 1;
  return num;
}

function formatDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return '0초';
  if (value < 60) return `${Math.round(value)}초`;
  const minutes = Math.floor(value / 60);
  const remainingSeconds = Math.round(value % 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainMinutes = minutes % 60;
    return `${hours}시간 ${remainMinutes}분`;
  }
  return `${minutes}분 ${remainingSeconds.toString().padStart(2, '0')}초`;
}

function CircularGauge({ ratio, label, metric, description, colors = ['#818cf8', '#c084fc'] }) {
  const normalized = clampRatio(ratio);
  const size = 148;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gradientId = useId();

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-slate-950/40 p-4">
      <div className="relative inline-flex">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={colors[0]} />
              <stop offset="100%" stopColor={colors[1]} />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(148, 163, 184, 0.25)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - normalized)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-semibold text-white">{metric}</span>
          <span className="mt-0.5 text-[11px] text-slate-400">{label}</span>
        </div>
      </div>
      {description ? <p className="text-center text-[11px] text-slate-400">{description}</p> : null}
    </div>
  );
}

function buildRevenueGradient(segments) {
  if (!Array.isArray(segments) || !segments.length) {
    return 'conic-gradient(rgba(30, 41, 59, 0.6) 0% 100%)';
  }
  let current = 0;
  const parts = [];
  segments.forEach((segment) => {
    const ratio = clampRatio(segment.ratio);
    if (ratio <= 0) return;
    const start = current * 100;
    const end = (current + ratio) * 100;
    parts.push(`${segment.color} ${start}% ${end}%`);
    current += ratio;
  });
  if (current < 1) {
    parts.push(`rgba(30, 41, 59, 0.6) ${current * 100}% 100%`);
  }
  return `conic-gradient(${parts.join(', ')})`;
}

function RevenueDonut({ segments, centerLabel }) {
  if (!Array.isArray(segments) || !segments.length) {
    return (
      <div className="mt-6 rounded-xl bg-slate-950/40 p-6 text-center text-xs text-slate-400">
        수익 기여 이벤트가 아직 충분하지 않아요.
      </div>
    );
  }

  const gradient = buildRevenueGradient(segments);

  return (
    <div className="relative mx-auto mt-6 h-48 w-48">
      <div
        className="h-full w-full rounded-full border border-fuchsia-400/30 bg-slate-950/60"
        style={{ backgroundImage: gradient }}
      />
      <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-slate-900/90 text-center">
        <span className="text-lg font-semibold text-white">{centerLabel}</span>
        <span className="mt-1 text-[11px] text-slate-400">총 전환 기여</span>
      </div>
    </div>
  );
}

function ActivityRadar({ metrics }) {
  const usable = Array.isArray(metrics) ? metrics.filter((item) => Number.isFinite(item.value)) : [];
  if (usable.length < 3) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-slate-950/40 p-6 text-xs text-slate-400">
        사용자 활동을 그릴 만큼의 데이터가 부족해요.
      </div>
    );
  }

  const size = 240;
  const center = size / 2;
  const radius = size / 2 - 28;
  const step = (Math.PI * 2) / usable.length;
  const axes = usable.map((item, index) => {
    const angle = -Math.PI / 2 + index * step;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    return { ...item, angle, x, y };
  });

  const gridLevels = 4;
  const grid = Array.from({ length: gridLevels }, (_, idx) => {
    const level = (idx + 1) / gridLevels;
    const points = axes
      .map(({ angle }) => {
        const r = radius * level;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        return `${x},${y}`;
      })
      .join(' ');
    return (
      <polygon
        key={`grid-${level}`}
        points={points}
        fill="none"
        stroke="rgba(148, 163, 184, 0.15)"
      />
    );
  });

  const dataPoints = axes
    .map(({ angle, value }) => {
      const r = radius * clampRatio(value);
      const x = center + Math.cos(angle) * r;
      const y = center + Math.sin(angle) * r;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-64 w-64 max-w-full">
      <circle cx={center} cy={center} r={radius} fill="rgba(15, 23, 42, 0.45)" />
      {grid}
      {axes.map(({ x, y }, index) => (
        <line
          key={`axis-${index}`}
          x1={center}
          y1={center}
          x2={x}
          y2={y}
          stroke="rgba(148, 163, 184, 0.2)"
        />
      ))}
      <polygon
        points={dataPoints}
        fill="rgba(129, 140, 248, 0.35)"
        stroke="rgba(129, 140, 248, 0.7)"
        strokeWidth="2"
      />
      {axes.map(({ angle, x, y, label, display }, index) => {
        const labelRadius = radius + 18;
        const valueRadius = radius + 32;
        const labelX = center + Math.cos(angle) * labelRadius;
        const labelY = center + Math.sin(angle) * labelRadius;
        const valueX = center + Math.cos(angle) * valueRadius;
        const valueY = center + Math.sin(angle) * valueRadius;
        const anchor = Math.abs(Math.cos(angle)) < 0.2 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
        const baseline = Math.abs(Math.sin(angle)) < 0.2 ? 'middle' : Math.sin(angle) > 0 ? 'hanging' : 'baseline';
        return (
          <g key={`label-${index}`}>
            <text
              x={labelX}
              y={labelY}
              fill="rgba(226, 232, 240, 0.85)"
              fontSize="11"
              textAnchor={anchor}
              dominantBaseline={baseline}
            >
              {label}
            </text>
            <text
              x={valueX}
              y={valueY}
              fill="rgba(148, 163, 184, 0.85)"
              fontSize="10"
              textAnchor={anchor}
              dominantBaseline={baseline === 'middle' ? 'hanging' : baseline}
            >
              {display}
            </text>
          </g>
        );
      })}
      {axes.map(({ angle, value }, index) => {
        const r = radius * clampRatio(value);
        const pointX = center + Math.cos(angle) * r;
        const pointY = center + Math.sin(angle) * r;
        return <circle key={`point-${index}`} cx={pointX} cy={pointY} r={4} fill="rgb(129, 140, 248)" stroke="#1e1b4b" strokeWidth="1" />;
      })}
    </svg>
  );
}

export default function EventKeyMetrics({ items, formatNumber, formatPercent }) {
  const stats = useMemo(() => aggregateByEvent(items), [items]);

  const getStat = (name) => stats.get(name) || { count: 0, valueSum: 0 };

  const sponsorImpressions = getStat('x_sponsor_impression');
  const overlayClicks = getStat('x_overlay_click');
  const smartOpens = getStat('x_smart_link_open');
  const repeatClicks = getStat('x_sponsor_repeat_click');
  const scrollDepth = getStat('x_scroll_depth');
  const sessionDuration = getStat('x_session_duration_bucket');
  const multiView = getStat('x_multi_view_session');
  const visits = getStat('x_visit');
  const ctaFallback = getStat('x_cta_click_unable_to_play');
  const feedImpressions = getStat('x_feed_impression');
  const anyClick = getStat('x_any_click');

  const averageScroll = scrollDepth.count > 0 ? scrollDepth.valueSum / scrollDepth.count : 0;
  const averageDuration = sessionDuration.count > 0 ? sessionDuration.valueSum / sessionDuration.count : 0;
  const multiViewRate = visits.count > 0 ? multiView.count / visits.count : 0;
  const engagedRate = visits.count > 0 ? anyClick.count / visits.count : 0;
  const conversionRate = sponsorImpressions.count > 0 ? smartOpens.count / sponsorImpressions.count : 0;
  const overlayRate = sponsorImpressions.count > 0 ? overlayClicks.count / sponsorImpressions.count : 0;
  const overlayToOpenRate = overlayClicks.count > 0 ? smartOpens.count / overlayClicks.count : 0;
  const repeatIntensity = repeatClicks.count > 0 ? repeatClicks.valueSum / repeatClicks.count : 0;
  const fallbackShare = smartOpens.count > 0 ? ctaFallback.count / smartOpens.count : 0;
  const feedToOpenRate = feedImpressions.count > 0 ? smartOpens.count / feedImpressions.count : 0;
  const targetDuration = 240; // 4 minutes 기준
  const durationRatio = averageDuration > 0 ? Math.min(averageDuration, targetDuration) / targetDuration : 0;

  const revenueSegments = useMemo(() => {
    const raw = [
      { key: 'open', label: '스마트 링크 오픈', value: smartOpens.count, color: 'rgb(168, 85, 247)' },
      { key: 'repeat', label: '반복 클릭 지수', value: repeatClicks.valueSum, color: 'rgb(34, 211, 238)' },
      { key: 'fallback', label: 'CTA 장애 우회', value: ctaFallback.count, color: 'rgb(249, 115, 22)' },
    ].filter((segment) => Number(segment.value) > 0);
    const total = raw.reduce((sum, segment) => sum + Number(segment.value || 0), 0);
    return {
      total,
      segments: raw.map((segment) => ({
        ...segment,
        ratio: total > 0 ? Number(segment.value || 0) / total : 0,
      })),
    };
  }, [ctaFallback.count, repeatClicks.valueSum, smartOpens.count]);

  const radarMetrics = useMemo(
    () => [
      {
        key: 'multi',
        label: '다중 열람',
        value: multiViewRate,
        display: formatPercent ? formatPercent(multiViewRate || 0) : `${Math.round(multiViewRate * 100)}%`,
      },
      {
        key: 'engaged',
        label: '참여 세션',
        value: engagedRate,
        display: formatPercent ? formatPercent(engagedRate || 0) : `${Math.round(engagedRate * 100)}%`,
      },
      {
        key: 'scroll',
        label: '스크롤 깊이',
        value: averageScroll / 100,
        display: `${Math.round(averageScroll)}%`,
      },
      {
        key: 'duration',
        label: '체류 (4분 기준)',
        value: durationRatio,
        display: formatDuration(averageDuration),
      },
    ],
    [averageDuration, averageScroll, durationRatio, engagedRate, formatPercent, multiViewRate]
  );

  const engagementScore = radarMetrics.length
    ? radarMetrics.reduce((sum, metric) => sum + clampRatio(metric.value), 0) / radarMetrics.length
    : 0;

  if (!stats.size) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/80 p-5 shadow-lg shadow-indigo-900/40 xl:col-span-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">스폰서 전환 지수</h3>
              <p className="mt-1 text-xs text-slate-400">노출-클릭-오픈 단계별 전환을 한국 시간대 기준으로 확인합니다.</p>
            </div>
            <span className="text-xs text-indigo-200/90">총 전환율 {formatPercent(conversionRate || 0)}</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <CircularGauge
              ratio={overlayRate}
              metric={formatPercent(overlayRate || 0)}
              label="노출→오버레이"
              description={`오버레이 클릭 ${formatNumber(overlayClicks.count || 0)}건`}
              colors={['#38bdf8', '#6366f1']}
            />
            <CircularGauge
              ratio={overlayToOpenRate}
              metric={formatPercent(overlayToOpenRate || 0)}
              label="오버레이→오픈"
              description={`스마트 링크 오픈 ${formatNumber(smartOpens.count || 0)}건`}
              colors={['#a855f7', '#f472b6']}
            />
            <CircularGauge
              ratio={conversionRate}
              metric={formatPercent(conversionRate || 0)}
              label="노출→오픈"
              description={`노출 ${formatNumber(sponsorImpressions.count || 0)}건 대비`}
              colors={['#34d399', '#10b981']}
            />
          </div>
          <div className="mt-6 grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-950/40 p-3">
              <p className="font-semibold text-white">피드→오픈 전환</p>
              <p className="mt-1 text-indigo-200/90">{formatPercent(feedToOpenRate || 0)}</p>
              <p className="mt-1 text-[11px] text-slate-500">피드 노출 {formatNumber(feedImpressions.count || 0)}건 기준</p>
            </div>
            <div className="rounded-lg bg-slate-950/40 p-3">
              <p className="font-semibold text-white">반복 클릭 강도</p>
              <p className="mt-1 text-emerald-200/90">{repeatIntensity.toFixed(2)}</p>
              <p className="mt-1 text-[11px] text-slate-500">세션별 평균 누적 클릭</p>
            </div>
            <div className="rounded-lg bg-slate-950/40 p-3">
              <p className="font-semibold text-white">장애 우회 비중</p>
              <p className="mt-1 text-rose-200/90">{formatPercent(fallbackShare || 0)}</p>
              <p className="mt-1 text-[11px] text-slate-500">스마트 링크 대비 대체 CTA</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-fuchsia-500/40 bg-slate-900/80 p-5 shadow-lg shadow-fuchsia-900/40 xl:col-span-2">
          <h3 className="text-base font-semibold text-white">수익 기여 이벤트 분포</h3>
          <p className="mt-1 text-xs text-slate-400">스마트 링크 오픈과 반복 클릭, 장애 우회 클릭이 만들어낸 전환 기여도를 원형 차트로 보여줍니다.</p>
          <RevenueDonut
            segments={revenueSegments.segments}
            centerLabel={formatNumber(Math.round(revenueSegments.total) || 0)}
          />
          {revenueSegments.segments.length > 0 && (
            <div className="mt-5 space-y-3 text-xs text-slate-300">
              {revenueSegments.segments.map((segment) => (
                <div key={segment.key} className="flex items-center justify-between rounded-lg bg-slate-950/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                    <span className="text-slate-200">{segment.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{formatNumber(Math.round(segment.value) || 0)}</p>
                    <p className="text-[11px] text-slate-400">{formatPercent(segment.ratio || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-5 shadow-lg shadow-emerald-900/40">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">사용자 활동 레이더</h3>
            <p className="mt-1 text-xs text-slate-400">다중 열람·참여 세션·스크롤 깊이·체류 시간을 복합적으로 분석해 몰입도를 확인합니다.</p>
            <div className="mt-4 rounded-lg bg-slate-950/40 px-4 py-3 text-xs text-emerald-200/90">
              평균 활동 지수 {formatPercent ? formatPercent(engagementScore) : `${Math.round(engagementScore * 100)}%`}
            </div>
            <div className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-950/40 p-3">
                <p className="font-semibold text-white">다중 열람 세션</p>
                <p className="mt-1 text-indigo-200/90">{formatPercent(multiViewRate || 0)}</p>
                <p className="mt-1 text-[11px] text-slate-500">총 방문 {formatNumber(visits.count || 0)}건 중 {formatNumber(multiView.count || 0)}건</p>
              </div>
              <div className="rounded-lg bg-slate-950/40 p-3">
                <p className="font-semibold text-white">참여 세션 비중</p>
                <p className="mt-1 text-indigo-200/90">{formatPercent(engagedRate || 0)}</p>
                <p className="mt-1 text-[11px] text-slate-500">첫 상호작용을 기록한 세션</p>
              </div>
              <div className="rounded-lg bg-slate-950/40 p-3">
                <p className="font-semibold text-white">평균 스크롤 깊이</p>
                <p className="mt-1 text-indigo-200/90">{Math.round(averageScroll)}%</p>
                <p className="mt-1 text-[11px] text-slate-500">콘텐츠 소비 깊이</p>
              </div>
              <div className="rounded-lg bg-slate-950/40 p-3">
                <p className="font-semibold text-white">평균 체류 시간</p>
                <p className="mt-1 text-indigo-200/90">{formatDuration(averageDuration)}</p>
                <p className="mt-1 text-[11px] text-slate-500">세션 체류 시간 버킷 평균</p>
              </div>
            </div>
          </div>
          <div className="flex w-full justify-center lg:w-auto">
            <ActivityRadar metrics={radarMetrics} />
          </div>
        </div>
      </div>
    </div>
  );
}
