import {
  ADSTERRA_ALL_PLACEMENTS_VALUE,
  ADSTERRA_PLACEMENT_PRESETS,
  ADSTERRA_REQUIRED_PLACEMENT_SUMMARY,
} from '../../../hooks/admin/useAdsterraStats';
import AdsterraFilterChips from './filters/AdsterraFilterChips';
import AdsterraPresetControls from './AdsterraPresetControls';

const PLACEMENT_LABEL_LIST = ADSTERRA_PLACEMENT_PRESETS.map(
  ({ id, label }) => `${label}(${id})`
);
const PLACEMENT_SUMMARY_TEXT = PLACEMENT_LABEL_LIST.join(' + ');
const PLACEMENT_ERROR_TEXT = PLACEMENT_LABEL_LIST.join(' 또는 ');
const PLACEMENT_MONITOR_TEXT = ADSTERRA_PLACEMENT_PRESETS.map(
  ({ id, label }) => `${label} (ID ${id})`
).join('과 ');

export default function AdsterraControls({
  domainName,
  domainId,
  loadingPlacements,
  loadingStats,
  status,
  error,
  placements,
  placementId,
  onPlacementChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRefreshPlacements,
  onFetchStats,
  onResetDates,
  canFetchStats,
  countryFilter,
  onCountryFilterChange,
  countryOptions,
  osFilter,
  onOsFilterChange,
  osOptions,
  deviceFilter,
  onDeviceFilterChange,
  deviceOptions,
  deviceFormatFilter,
  onDeviceFormatFilterChange,
  deviceFormatOptions,
  placementLabel,
  onApplyPreset,
  onSavePreset,
  presets,
}) {
  const fieldClass =
    'w-full rounded-2xl border border-slate-700/70 bg-slate-900/80 px-4 py-2.5 text-sm text-slate-100 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.12)] transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-40';
  const helperClass = 'text-[11px] leading-relaxed text-slate-400';
  const noPlacements = placements.length === 0;

  return (
    <div className="space-y-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900/85 to-indigo-950/70 p-6 shadow-2xl shadow-indigo-950/40 ring-1 ring-slate-800/70">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400/80">Adsterra Revenue Mission Control</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">미래지향 수익 허브</h2>
          <p className="mt-3 text-sm text-slate-300">
            연결된 도메인{' '}
            <span className="font-semibold text-white">{domainName || '—'}</span>
            {domainId ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] text-cyan-200/80">
                #{domainId}
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-500">ID 미설정</span>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            환경 변수에 저장된 토큰으로 인증돼 {PLACEMENT_MONITOR_TEXT} 플레이스먼트를 집중 모니터링합니다.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 text-xs text-slate-300 lg:items-end">
          <button
            type="button"
            onClick={onRefreshPlacements}
            disabled={loadingPlacements}
            className="inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-slate-900/80 px-4 py-2 text-[12px] font-semibold text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,0.15)] transition hover:border-cyan-300/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingPlacements ? '플레이스먼트 정리 중…' : '플레이스먼트 동기화'}
          </button>
          <span className={helperClass}>
            전체 보기에서는 {ADSTERRA_REQUIRED_PLACEMENT_SUMMARY} 데이터를 함께 분석해요.
          </span>
        </div>
      </div>

      {(status || error) && (
        <div className="grid gap-3 md:grid-cols-2">
          {status && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 shadow-inner shadow-emerald-500/20">
              {status}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 shadow-inner shadow-rose-500/30">
              {error}
            </div>
          )}
        </div>
      )}

      <AdsterraPresetControls
        placementId={placementId}
        startDate={startDate}
        endDate={endDate}
        countryFilter={countryFilter}
        osFilter={osFilter}
        deviceFilter={deviceFilter}
        deviceFormatFilter={deviceFormatFilter}
        placementLabel={placementLabel}
        onApplyPreset={onApplyPreset}
        onSavePreset={onSavePreset}
        presets={presets}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2 xl:col-span-1">
          <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-400">수익 포맷 (플레이스먼트)</label>
          <select
            value={placementId}
            onChange={(event) => onPlacementChange(event.target.value)}
            disabled={loadingPlacements || noPlacements}
            className={fieldClass}
          >
            <option value={ADSTERRA_ALL_PLACEMENTS_VALUE}>전체 보기 · {PLACEMENT_SUMMARY_TEXT}</option>
            {placements.map((placement) => {
              const rawId =
                placement?.id ??
                placement?.ID ??
                placement?.placement_id ??
                placement?.placementId ??
                placement?.value;
              const optionValue = rawId !== undefined && rawId !== null ? String(rawId) : '';
              if (!optionValue) return null;
              const label =
                placement?.title ||
                placement?.alias ||
                placement?.placement ||
                placement?.name ||
                placement?.ad_format ||
                `#${optionValue}`;
              return (
                <option key={optionValue} value={optionValue}>
                  {label}
                </option>
              );
            })}
          </select>
          {noPlacements && !loadingPlacements && (
            <p className="mt-2 text-[11px] text-rose-200/80">
              {PLACEMENT_ERROR_TEXT} 플레이스먼트를 찾지 못했어요. 도메인 구성을 확인해 주세요.
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-400">시작일</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            max={endDate || undefined}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-400">종료일</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            min={startDate || undefined}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 shadow-inner shadow-slate-950/50">
        <p className={helperClass}>
          필터 옵션은 Adsterra 통계 API가 반환한 원시 데이터를 기반으로 자동 완성돼요. 서버가 필터 파라미터를 제공하지 않으므로,
          이 화면에서 선택한 조건은 모두 클라이언트에서 실시간으로 적용됩니다.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-400">국가 필터</label>
          <select
            value={countryFilter}
            onChange={(event) => onCountryFilterChange(event.target.value)}
            className={fieldClass}
          >
            <option value="">전체</option>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-400">OS 필터</label>
          <select
            value={osFilter}
            onChange={(event) => onOsFilterChange(event.target.value)}
            className={fieldClass}
          >
            <option value="">전체</option>
            {osOptions.map((os) => (
              <option key={os} value={os}>
                {os}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-400">디바이스 필터</label>
          <select
            value={deviceFilter}
            onChange={(event) => onDeviceFilterChange(event.target.value)}
            className={fieldClass}
          >
            <option value="">전체</option>
            {deviceOptions.map((device) => (
              <option key={device} value={device}>
                {device}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-slate-400">디바이스 포맷</label>
          <select
            value={deviceFormatFilter}
            onChange={(event) => onDeviceFormatFilterChange(event.target.value)}
            className={fieldClass}
          >
            <option value="">전체</option>
            {deviceFormatOptions.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </div>
      </div>

      <AdsterraFilterChips
        countryFilter={countryFilter}
        osFilter={osFilter}
        deviceFilter={deviceFilter}
        deviceFormatFilter={deviceFormatFilter}
        onCountryFilterChange={onCountryFilterChange}
        onOsFilterChange={onOsFilterChange}
        onDeviceFilterChange={onDeviceFilterChange}
        onDeviceFormatFilterChange={onDeviceFormatFilterChange}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onFetchStats}
          disabled={!canFetchStats || loadingStats}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-[0_15px_35px_rgba(14,165,233,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingStats ? '통계 불러오는 중…' : '통계 다시 불러오기'}
        </button>
        <button
          type="button"
          onClick={onResetDates}
          className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-300/60 hover:text-white"
        >
          기간 초기화
        </button>
      </div>
    </div>
  );
}
