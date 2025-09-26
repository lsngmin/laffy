import { useState } from 'react';

export default function AdsterraPresetControls({ presets, onSavePreset, onApplyPreset, onDeletePreset }) {
  const [name, setName] = useState('');

  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 px-4 py-3 text-xs text-slate-200">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex flex-1 items-center gap-2">
          <span className="uppercase tracking-widest text-slate-400">현재 조건 저장</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 주간-한국"
            className="flex-1 rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-100"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!name.trim()) return;
            onSavePreset(name.trim());
            setName('');
          }}
          className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 font-semibold text-slate-100 transition hover:bg-slate-700"
        >
          저장
        </button>
      </div>
      {presets.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {presets.map((preset) => (
            <div key={preset.name} className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1">
              <button
                type="button"
                onClick={() => onApplyPreset(preset)}
                className="text-xs font-semibold text-emerald-200 hover:text-emerald-100"
              >
                {preset.name}
              </button>
              <button
                type="button"
                onClick={() => onDeletePreset(preset)}
                className="text-xs text-slate-400 hover:text-rose-300"
                aria-label={`${preset.name} 삭제`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
