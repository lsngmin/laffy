import { useMemo } from 'react';
import { ParentSize } from '@visx/responsive';
import {
  AnimatedAxis,
  AnimatedGrid,
  AnimatedAreaSeries,
  AnimatedBarSeries,
  AnimatedLineSeries,
  Tooltip,
  XYChart,
  buildChartTheme,
} from '@visx/xychart';
import { curveMonotoneX } from '@visx/curve';

const chartTheme = buildChartTheme({
  backgroundColor: '#020817',
  colors: ['#38bdf8', '#f472b6', '#a855f7'],
  gridColor: '#1f2937',
  gridColorDark: '#111827',
  svgLabelSmall: { fill: '#94a3b8' },
  svgLabelBig: { fill: '#e2e8f0' },
});

function buildDailyMetrics(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const label = row?.localDate || row?.date || row?.day || row?.Day || row?.group;
    if (!label) return;
    const key = row?.localDateIso || label;
    const impressions = Number(row?.impressionsValue ?? row?.impression ?? row?.impressions ?? 0) || 0;
    const revenue = Number(row?.revenueValue ?? row?.revenue ?? row?.earnings ?? row?.income ?? 0) || 0;

    const current = map.get(key) || { key, label, impressions: 0, revenue: 0 };
    current.impressions += impressions;
    current.revenue += revenue;
    map.set(key, current);
  });

  return Array.from(map.values())
    .map((value) => {
      const { impressions, revenue } = value;
      const cpm = impressions > 0 ? (revenue / impressions) * 1000 : 0;
      const rpm = impressions > 0 ? revenue / impressions : 0;
      return { ...value, cpm, rpm };
    })
    .sort((a, b) => new Date(a.key || a.label) - new Date(b.key || b.label));
}

function ChartSection({ title, helper, children }) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-800/60 bg-slate-900/70 p-5">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        {helper ? <p className="mt-1 text-[12px] text-slate-400">{helper}</p> : null}
      </div>
      <div className="h-[260px] w-full">{children}</div>
    </div>
  );
}

export default function AdsterraChartPanel({ rows, formatNumber, formatCurrency }) {
  const data = useMemo(() => buildDailyMetrics(rows), [rows]);

  if (!data.length) {
    return (
      <section className="rounded-3xl border border-slate-800/70 bg-slate-950/75 p-6 text-sm text-slate-400">
        통계를 불러오면 날짜별 추세 그래프가 표시됩니다.
      </section>
    );
  }

  const xAccessor = (d) => d.label;
  const impressionsAccessor = (d) => d.impressions;
  const revenueAccessor = (d) => d.revenue;
  const cpmAccessor = (d) => d.cpm;

  const maxRevenue = Math.max(...data.map(revenueAccessor), 1);
  const maxImpressions = Math.max(...data.map(impressionsAccessor), 1);
  const maxCpm = Math.max(...data.map(cpmAccessor), 1);

  return (
    <section className="space-y-6 rounded-3xl border border-slate-800/70 bg-slate-950/75 p-6 shadow-xl shadow-slate-950/40">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold text-white">날짜별 성과 추세</h3>
        <p className="text-sm text-slate-400">
          스마트링크와 배너광고의 데이터를 합쳐 수익·노출·CPM 흐름을 비교합니다.
        </p>
      </div>

      <ChartSection title="수익 추세" helper="면적은 수익, 선은 CPM을 나타냅니다.">
        <ParentSize>
          {({ width, height }) => (
            <XYChart
              width={width}
              height={height}
              xScale={{ type: 'band', paddingInner: 0.4 }}
              yScale={{ type: 'linear', nice: true, zero: true }}
              theme={chartTheme}
            >
              <AnimatedGrid columns={false} numTicks={4} />
              <AnimatedAxis orientation="bottom" tickLabelProps={() => ({ fill: '#94a3b8', fontSize: 11 })} />
              <AnimatedAxis
                orientation="left"
                numTicks={4}
                tickFormat={(value) => formatCurrency(value)}
                tickLabelProps={() => ({ fill: '#94a3b8', fontSize: 11 })}
              />
              <AnimatedAxis
                orientation="right"
                numTicks={4}
                tickFormat={(value) => formatCurrency(value, 3)}
                tickLabelProps={() => ({ fill: '#94a3b8', fontSize: 11 })}
              />
              <AnimatedAreaSeries
                dataKey=" 수익"
                data={data}
                xAccessor={xAccessor}
                yAccessor={revenueAccessor}
                curve={curveMonotoneX}
                fillOpacity={0.25}
              />
              <AnimatedLineSeries
                dataKey=" CPM"
                data={data}
                xAccessor={xAccessor}
                yAccessor={cpmAccessor}
                curve={curveMonotoneX}
                yAxis="right"
              />
              <Tooltip
                showDatumGlyph
                snapTooltipToDatumX
                renderTooltip={({ tooltipData }) => {
                  const datum = tooltipData?.nearestDatum?.datum;
                  if (!datum) return null;
                  return (
                    <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-[12px] text-slate-100">
                      <p className="font-semibold text-white">{datum.label}</p>
                      <p>수익 {formatCurrency(datum.revenue)}</p>
                      <p>CPM {formatCurrency(datum.cpm, 3)}</p>
                    </div>
                  );
                }}
              />
            </XYChart>
          )}
        </ParentSize>
      </ChartSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSection title="노출량 막대" helper="날짜별 노출을 막대로 표현했습니다.">
          <ParentSize>
            {({ width, height }) => (
              <XYChart
                width={width}
                height={height}
                xScale={{ type: 'band', paddingInner: 0.4 }}
                yScale={{ type: 'linear', nice: true, zero: true }}
                theme={chartTheme}
              >
                <AnimatedGrid columns={false} numTicks={4} />
                <AnimatedAxis orientation="bottom" tickLabelProps={() => ({ fill: '#94a3b8', fontSize: 11 })} />
                <AnimatedAxis
                  orientation="left"
                  numTicks={4}
                  tickFormat={(value) => formatNumber(value)}
                  tickLabelProps={() => ({ fill: '#94a3b8', fontSize: 11 })}
                />
                <AnimatedBarSeries
                  dataKey="노출"
                  data={data}
                  xAccessor={xAccessor}
                  yAccessor={impressionsAccessor}
                  radius={4}
                />
                <Tooltip
                  snapTooltipToDatumX
                  renderTooltip={({ tooltipData }) => {
                    const datum = tooltipData?.nearestDatum?.datum;
                    if (!datum) return null;
                    return (
                      <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-[12px] text-slate-100">
                        <p className="font-semibold text-white">{datum.label}</p>
                        <p>노출 {formatNumber(datum.impressions)}</p>
                      </div>
                    );
                  }}
                />
              </XYChart>
            )}
          </ParentSize>
        </ChartSection>

        <ChartSection title="CPM 라인" helper="CPM(1,000회 노출당 수익)을 추적합니다.">
          <ParentSize>
            {({ width, height }) => (
              <XYChart
                width={width}
                height={height}
                xScale={{ type: 'band', paddingInner: 0.4 }}
                yScale={{ type: 'linear', nice: true, zero: true }}
                theme={chartTheme}
              >
                <AnimatedGrid columns={false} numTicks={4} />
                <AnimatedAxis orientation="bottom" tickLabelProps={() => ({ fill: '#94a3b8', fontSize: 11 })} />
                <AnimatedAxis
                  orientation="left"
                  numTicks={4}
                  tickFormat={(value) => formatCurrency(value, 3)}
                  tickLabelProps={() => ({ fill: '#94a3b8', fontSize: 11 })}
                />
                <AnimatedLineSeries
                  dataKey="CPM"
                  data={data}
                  xAccessor={xAccessor}
                  yAccessor={cpmAccessor}
                  curve={curveMonotoneX}
                />
                <Tooltip
                  showDatumGlyph
                  snapTooltipToDatumX
                  renderTooltip={({ tooltipData }) => {
                    const datum = tooltipData?.nearestDatum?.datum;
                    if (!datum) return null;
                    return (
                      <div className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-[12px] text-slate-100">
                        <p className="font-semibold text-white">{datum.label}</p>
                        <p>CPM {formatCurrency(datum.cpm, 3)}</p>
                        <p>노출당 수익 {formatCurrency(datum.rpm, 5)}</p>
                      </div>
                    );
                  }}
                />
              </XYChart>
            )}
          </ParentSize>
        </ChartSection>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
        <span>최대 수익 {formatCurrency(maxRevenue)}</span>
        <span>최대 노출 {formatNumber(maxImpressions)}</span>
        <span>최대 CPM {formatCurrency(maxCpm, 3)}</span>
      </div>
    </section>
  );
}
