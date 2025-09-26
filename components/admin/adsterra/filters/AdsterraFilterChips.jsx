function Chip({ label, value, onClear }) {
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-2 rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-700"
    >
      <span>{label}: {value}</span>
      <span className="text-slate-400">✕</span>
    </button>
  );
}

export default function AdsterraFilterChips({
  countryFilter,
  osFilter,
  deviceFilter,
  deviceFormatFilter,
  onCountryFilterChange,
  onOsFilterChange,
  onDeviceFilterChange,
  onDeviceFormatFilterChange,
}) {
  const hasFilters = countryFilter || osFilter || deviceFilter || deviceFormatFilter;
  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
      <span className="text-slate-500">활성 필터:</span>
      <Chip label="국가" value={countryFilter} onClear={() => onCountryFilterChange('')} />
      <Chip label="OS" value={osFilter} onClear={() => onOsFilterChange('')} />
      <Chip label="디바이스" value={deviceFilter} onClear={() => onDeviceFilterChange('')} />
      <Chip label="포맷" value={deviceFormatFilter} onClear={() => onDeviceFormatFilterChange('')} />
    </div>
  );
}
