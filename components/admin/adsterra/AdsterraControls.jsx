import { ADSTERRA_ALL_PLACEMENTS_VALUE } from '../../../hooks/admin/useAdsterraStats';
import AdsterraFilterChips from './filters/AdsterraFilterChips';
import AdsterraPresetControls from './AdsterraPresetControls';

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
  return (
    <div className="space-y-4 rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800/70">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">연결된 도메인</p>
          <p className="text-sm font-semibold text-white">
            {domainName}
            <span className="ml-2 text-xs font-normal text-slate-400">{domainId ? `#${domainId}` : '—'}</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">환경 변수에 저장된 토큰으로 자동 연결돼요.</p>
        </div>
        <div className="flex flex-col gap-1 text-xs text-slate-400 md:items-end">
          <button
            type="button"
            onClick={onRefreshPlacements}
            disabled={loadingPlacements}
            className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            플레이스먼트 새로고침
          </button>
          {loadingPlacements && <span>플레이스먼트를 불러오는 중입니다…</span>}
        </div>
      </div>

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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2 xl:col-span-1">
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">광고 포맷 (플레이스먼트)</label>
          <select
            value={placementId}
            onChange={(event) => onPlacementChange(event.target.value)}
            disabled={loadingPlacements}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 disabled:opacity-40"
          >
            <option value={ADSTERRA_ALL_PLACEMENTS_VALUE}>전체 보기 (도메인 전체)</option>
            <option value="">플레이스먼트를 선택해 주세요</option>
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
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">시작일</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            max={endDate || undefined}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">종료일</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            min={startDate || undefined}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">국가 필터</label>
          <select
            value={countryFilter}
            onChange={(event) => onCountryFilterChange(event.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">OS 필터</label>
          <select
            value={osFilter}
            onChange={(event) => onOsFilterChange(event.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">디바이스 필터</label>
          <select
            value={deviceFilter}
            onChange={(event) => onDeviceFilterChange(event.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
          <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">디바이스 포맷</label>
          <select
            value={deviceFormatFilter}
            onChange={(event) => onDeviceFormatFilterChange(event.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingStats ? '통계 불러오는 중…' : '통계 다시 불러오기'}
        </button>
        <button
          type="button"
          onClick={onResetDates}
          className="inline-flex items-center justify-center rounded-full border border-slate-600/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800/60"
        >
          기간 초기화
        </button>
      </div>

      {status && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-100">{status}</div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div>
      )}
    </div>
  );
}
