import { useMemo } from 'react';

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

function ProgressBar({ ratio, color = 'from-indigo-400 via-purple-400 to-pink-400' }) {
  const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
      <div
        className={`h-full bg-gradient-to-r ${color}`}
        style={{ width: `${Math.max(6, safeRatio * 100)}%` }}
      />
    </div>
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

  const averageScroll = scrollDepth.count > 0 ? scrollDepth.valueSum / scrollDepth.count : 0;
  const averageDuration = sessionDuration.count > 0 ? sessionDuration.valueSum / sessionDuration.count : 0;
  const multiViewRate = visits.count > 0 ? multiView.count / visits.count : 0;
  const conversionRate = sponsorImpressions.count > 0 ? smartOpens.count / sponsorImpressions.count : 0;
  const overlayToOpenRate = overlayClicks.count > 0 ? smartOpens.count / overlayClicks.count : 0;
  const repeatIntensity = repeatClicks.count > 0 ? repeatClicks.valueSum / repeatClicks.count : 0;
  const fallbackShare = smartOpens.count > 0 ? ctaFallback.count / smartOpens.count : 0;

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
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/80 p-5 shadow-lg shadow-indigo-900/40 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">스폰서 전환 퍼널</h3>
          <span className="text-xs text-indigo-200/90">
            최종 전환율 {formatPercent(conversionRate || 0)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          노출 대비 오버레이·스마트 링크 단계별 이탈을 한눈에 비교할 수 있어요.
        </p>
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

      <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-5 shadow-lg shadow-emerald-900/40">
        <h3 className="text-base font-semibold text-white">참여 심화 지표</h3>
        <p className="mt-1 text-xs text-slate-400">스크롤 깊이와 다중 열람 세션을 통해 콘텐츠 몰입도를 파악합니다.</p>
        <div className="mt-5 space-y-5">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>평균 스크롤 깊이</span>
              <span className="font-semibold text-white">{Math.round(averageScroll)}%</span>
            </div>
            <ProgressBar ratio={averageScroll / 100} color="from-emerald-400 via-teal-400 to-cyan-400" />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>다중 열람 세션 비중</span>
              <span className="font-semibold text-white">{formatPercent(multiViewRate || 0)}</span>
            </div>
            <ProgressBar ratio={multiViewRate} color="from-cyan-400 via-sky-400 to-blue-400" />
            <p className="mt-1 text-[11px] text-slate-500">
              총 방문 {formatNumber(visits.count || 0)}건 중 다중 열람 {formatNumber(multiView.count || 0)}건
            </p>
          </div>
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
