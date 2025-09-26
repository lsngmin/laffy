import { useMemo, useState } from 'react';

export default function AdsterraPresetControls({
  placementId,
  startDate,
  endDate,
  countryFilter,
  osFilter,
  deviceFilter,
  deviceFormatFilter,
  placementLabel,
  presets,
  onSavePreset,
  onApplyPreset,
}) {
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');

  const canSave = useMemo(() => {
    return Boolean(startDate && endDate);
  }, [startDate, endDate]);

  const handleSave = () => {
    if (!canSave) return;
    const name = presetName.trim() || `${startDate} ~ ${endDate}`;
    onSavePreset({
      id: Date.now().toString(),
      name,
      placementId,
      startDate,
      endDate,
      countryFilter,
      osFilter,
      deviceFilter,
      deviceFormatFilter,
    });
    setPresetName('');
  };

  const handleApply = () => {
    if (!selectedPresetId) return;
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (preset) {
      onApplyPreset(preset);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-slate-900/70 p-4 text-xs text-slate-300">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="프리셋 이름"
            className="min-w-[10rem] flex-1 rounded-full bg-slate-950/50 px-4 py-2 text-sm text-slate-200 outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_35px_rgba(99,102,241,0.4)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            현재 조건 저장
          </button>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <select
            value={selectedPresetId}
            onChange={(event) => setSelectedPresetId(event.target.value)}
            className="min-w-[10rem] flex-1 rounded-full bg-slate-950/50 px-4 py-2 text-sm text-slate-200 outline-none"
          >
            <option value="">프리셋 선택</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} · {preset.startDate} ~ {preset.endDate} · {placementLabel(preset.placementId) || '전체'}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleApply}
            disabled={!selectedPresetId}
            className="rounded-full border border-slate-600/60 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            불러오기
          </button>
        </div>
      </div>
    </div>
  );
}
