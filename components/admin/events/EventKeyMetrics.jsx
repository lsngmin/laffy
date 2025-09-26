import { useMemo } from 'react';

function aggregateByEvent(items) {
  const map = new Map();
  if (!Array.isArray(items)) return map;
  items.forEach((item) => {
    const name = typeof item?.eventName === 'string' ? item.eventName : '';
    if (!name) return;
    const prev = map.get(name) || { count: 0, valueSum: 0, uniqueSessions: 0, lastTimestamp: 0 };
    const count = Number(item?.count) || 0;
    const valueSum = Number(item?.valueSum) || 0;
    const uniqueSessions = Number(item?.uniqueSessions) || 0;
    const lastTsRaw = Number(item?.lastTimestamp || (item?.lastDate ? Date.parse(item.lastDate) : 0));
    const lastTimestamp = Number.isFinite(lastTsRaw) ? lastTsRaw : 0;
    map.set(name, {
      count: prev.count + count,
      valueSum: prev.valueSum + valueSum,
      uniqueSessions: prev.uniqueSessions + uniqueSessions,
      lastTimestamp: Math.max(prev.lastTimestamp, lastTimestamp),
    });
  });
  return map;
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

const gaugeColors = {
  indigo: 'rgba(129, 140, 248, 1)',
  emerald: 'rgba(16, 185, 129, 1)',
  cyan: 'rgba(6, 182, 212, 1)',
  rose: 'rgba(244, 114, 182, 1)',
};

function RadialGauge({ ratio, valueLabel, label, description, tone = 'indigo' }) {
  const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
  const angle = safeRatio * 360;
  const color = gaugeColors[tone] || gaugeColors.indigo;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-950/40 p-3">
      <div
        className="relative flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${angle}deg, rgba(15, 23, 42, 0.6) ${angle}deg)`,
        }}
      >
        <div className="flex h-[65%] w-[65%] items-center justify-center rounded-full bg-slate-900/90 text-sm font-semibold text-white">
          {valueLabel}
        </div>
      </div>
      <div className="text-xs text-slate-300">
        <p className="font-semibold text-white">{label}</p>
        {description ? <p className="mt-1 text-[11px] text-slate-400">{description}</p> : null}
      </div>
    </div>
  );
}

const kstFormatter = typeof Intl !== 'undefined'
  ? new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  : null;

function formatKstDateTime(timestamp) {
  if (!timestamp || Number.isNaN(Number(timestamp))) return '데이터 없음';
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return '데이터 없음';
  if (kstFormatter) {
    return kstFormatter.format(date);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function EventKeyMetrics({ items, formatNumber, formatPercent }) {
  const stats = useMemo(() => aggregateByEvent(items), [items]);

  const getStat = (name) => stats.get(name) || { count: 0, valueSum: 0, uniqueSessions: 0, lastTimestamp: 0 };

  const sponsorImpressions = getStat('x_sponsor_impression');
  const overlayClicks = getStat('x_overlay_click');
  const smartOpens = getStat('x_smart_link_open');
  const repeatClicks = getStat('x_sponsor_repeat_click');
  const scrollDepth = getStat('x_scroll_depth');
  const sessionDuration = getStat('x_session_duration_bucket');
  const multiView = getStat('x_multi_view_session');
  const visits = getStat('x_visit');
  const ctaFallback = getStat('x_cta_click_unable_to_play');

  const averageScroll = scrollDepth.count > 0 ? scrollDepth.valueSum / scrollDepth.count : 0;
  const averageDuration = sessionDuration.count > 0 ? sessionDuration.valueSum / sessionDuration.count : 0;
  const multiViewRate = visits.count > 0 ? multiView.count / visits.count : 0;
  const conversionRate = sponsorImpressions.count > 0 ? smartOpens.count / sponsorImpressions.count : 0;
  const overlayToOpenRate = overlayClicks.count > 0 ? smartOpens.count / overlayClicks.count : 0;
  const repeatIntensity = repeatClicks.count > 0 ? repeatClicks.valueSum / repeatClicks.count : 0;
  const fallbackShare = smartOpens.count > 0 ? ctaFallback.count / smartOpens.count : 0;
  const repeatShare = smartOpens.count > 0 ? Math.min(1, repeatClicks.count / smartOpens.count) : 0;
  const smartOpensPerSession = smartOpens.uniqueSessions > 0 ? smartOpens.count / smartOpens.uniqueSessions : 0;
  const totalRepeatClicks = Math.max(0, repeatClicks.valueSum || 0);

  const lastSponsorEvent = Math.max(
    sponsorImpressions.lastTimestamp,
    overlayClicks.lastTimestamp,
    smartOpens.lastTimestamp,
    repeatClicks.lastTimestamp,
  );

  const funnel = [
    { key: 'impression', label: '노출', value: sponsorImpressions.count },
    { key: 'overlay', label: '오버레이 클릭', value: overlayClicks.count },
    { key: 'open', label: '스마트 링크 오픈', value: smartOpens.count },
  ];
  const funnelMax = Math.max(...funnel.map((step) => step.value), 1);

  if (!stats.size) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4">
      <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/80 p-5 shadow-lg shadow-indigo-900/40 xl:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">스폰서 전환 퍼널</h3>
          <span className="text-xs text-indigo-200/90">
            최종 전환율 {formatPercent(conversionRate || 0)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <p>노출 대비 오버레이·스마트 링크 단계별 이탈을 한눈에 비교할 수 있어요.</p>
          <span className="rounded-full bg-indigo-500/20 px-2 py-1 text-[11px] text-indigo-100">
            최근 데이터 {formatKstDateTime(lastSponsorEvent)}
          </span>
        </div>
        <div className="mt-5 space-y-4">
          {funnel.map((step) => (
            <div key={step.key}>
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>{step.label}</span>
                <span className="font-semibold text-white">{formatNumber(step.value || 0)}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-950/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-rose-400"
                  style={{ width: `${Math.max(8, (step.value / funnelMax) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-950/40 p-3">
            <p className="font-semibold text-white">오버레이→오픈 전환</p>
            <p className="mt-1 text-indigo-200/90">{formatPercent(overlayToOpenRate || 0)}</p>
          </div>
          <div className="rounded-xl bg-slate-950/40 p-3">
            <p className="font-semibold text-white">CTA 장애 클릭 비중</p>
            <p className="mt-1 text-rose-200/90">{formatPercent(fallbackShare || 0)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-5 shadow-lg shadow-emerald-900/40 xl:col-span-2">
        <h3 className="text-base font-semibold text-white">스폰서 수익 신호</h3>
        <p className="mt-1 text-xs text-slate-400">
          실도달 전환율과 반복 클릭 강도를 활용해 캠페인 수익 기여도를 빠르게 점검합니다.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <RadialGauge
            ratio={conversionRate}
            valueLabel={formatPercent(conversionRate || 0)}
            label="스마트 링크 실도달율"
            description={`노출 ${formatNumber(sponsorImpressions.count || 0)}건 대비 오픈 ${formatNumber(smartOpens.count || 0)}건`}
            tone="emerald"
          />
          <RadialGauge
            ratio={repeatShare}
            valueLabel={formatPercent(repeatShare || 0)}
            label="반복 클릭 세션 비중"
            description={`반복 클릭 ${formatNumber(repeatClicks.count || 0)}건 · 평균 ${repeatIntensity.toFixed(2)}회`}
            tone="rose"
          />
        </div>
        <div className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-950/40 p-3">
            <p className="font-semibold text-white">세션당 평균 오픈 수</p>
            <p className="mt-1 text-emerald-200/90">{smartOpensPerSession.toFixed(2)}회</p>
          </div>
          <div className="rounded-xl bg-slate-950/40 p-3">
            <p className="font-semibold text-white">추가 반복 클릭 합계</p>
            <p className="mt-1 text-rose-200/90">{formatNumber(Math.round(totalRepeatClicks))}회</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-500/40 bg-slate-900/80 p-5 shadow-lg shadow-cyan-900/40">
        <h3 className="text-base font-semibold text-white">사용자 탐색 지표</h3>
        <p className="mt-1 text-xs text-slate-400">다중 열람과 스크롤 깊이를 종합해 콘텐츠 소비 강도를 확인합니다.</p>
        <div className="mt-5 space-y-4">
          <RadialGauge
            ratio={averageScroll / 100}
            valueLabel={`${Math.round(averageScroll)}%`}
            label="평균 스크롤 깊이"
            description="상세 콘텐츠 소비 몰입도"
            tone="cyan"
          />
          <RadialGauge
            ratio={multiViewRate}
            valueLabel={formatPercent(multiViewRate || 0)}
            label="다중 열람 세션 비중"
            description={`총 방문 ${formatNumber(visits.count || 0)}건 중 ${formatNumber(multiView.count || 0)}건`}
            tone="indigo"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-purple-500/40 bg-slate-900/80 p-5 shadow-lg shadow-purple-900/40">
        <h3 className="text-base font-semibold text-white">체류 & 반복 클릭</h3>
        <p className="mt-1 text-xs text-slate-400">세션 체류 시간과 반복 클릭 강도를 통해 수익 잠재력을 추적합니다.</p>
        <div className="mt-5 space-y-4 text-sm text-slate-200">
          <div className="rounded-xl bg-slate-950/40 p-3">
            <p className="text-xs text-slate-400">평균 세션 체류 시간</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatDuration(averageDuration)}</p>
          </div>
          <div className="rounded-xl bg-slate-950/40 p-3">
            <p className="text-xs text-slate-400">평균 반복 클릭 지수</p>
            <p className="mt-1 text-lg font-semibold text-white">{repeatIntensity.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
