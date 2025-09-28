/**
 * NOTE: This component is archived and not currently used in the admin UI.
 */
import { useEffect, useMemo, useState } from 'react';
import ModalPortal from './ModalPortal';

function parseCsvPreview(text) {
  if (typeof text !== 'string') {
    return { rows: [], errors: ['CSV 데이터가 비어 있어요.'] };
  }

  const lines = text.split(/\r?\n/);
  if (!lines.length) {
    return { rows: [], errors: ['CSV 내용이 없습니다.'] };
  }

  const [headerLine, ...dataLines] = lines;
  const header = headerLine.split(',').map((value) => value.replace(/^"|"$/g, '').trim().toLowerCase());
  const slugIndex = header.indexOf('slug');
  const viewsIndex = header.indexOf('views');
  const likesIndex = header.indexOf('likes');

  if (slugIndex === -1) {
    return { rows: [], errors: ['slug 컬럼이 필요합니다.'] };
  }

  const rows = [];
  const errors = [];

  dataLines.forEach((line, index) => {
    if (!line.trim()) return;
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current);

    const normalize = (value) => value.replace(/^"|"$/g, '').trim();
    const slug = normalize(cells[slugIndex] || '');
    if (!slug) {
      errors.push(`행 ${index + 2}: slug이 비어 있습니다.`);
      return;
    }

    const row = { slug };
    if (viewsIndex !== -1 && cells.length > viewsIndex) row.views = normalize(cells[viewsIndex]);
    if (likesIndex !== -1 && cells.length > likesIndex) row.likes = normalize(cells[likesIndex]);
    rows.push(row);
  });

  return { rows, errors };
}

export default function AnalyticsCsvUploadModal({ open, onClose, onUpload }) {
  const [csvText, setCsvText] = useState('');
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [status, setStatus] = useState('idle');
  const [serverMessage, setServerMessage] = useState('');

  useEffect(() => {
    if (!open) {
      setCsvText('');
      setRows([]);
      setErrors([]);
      setStatus('idle');
      setServerMessage('');
    }
  }, [open]);

  const summary = useMemo(() => {
    if (!rows.length) return '미리보기 없음';
    return `${rows.length}개의 행이 준비되었습니다.`;
  }, [rows.length]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const preview = parseCsvPreview(text);
      setCsvText(text);
      setRows(preview.rows);
      setErrors(preview.errors);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleUpload = async () => {
    if (!rows.length || typeof onUpload !== 'function') return;
    try {
      setStatus('loading');
      setServerMessage('');
      const result = await onUpload({ csvText, rows });
      const updatedCount = Array.isArray(result?.results) ? result.results.length : 0;
      const skipped = typeof result?.skipped === 'number' ? result.skipped : rows.length - updatedCount;
      setStatus('success');
      setServerMessage(`업데이트 완료: ${updatedCount}개 적용, ${Math.max(skipped, 0)}개 건너뜀.`);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (error) {
      console.error('CSV upload failed', error);
      setStatus('error');
      setServerMessage(error?.message || '업로드에 실패했어요.');
    }
  };

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm px-4 py-10">
        <div className="w-full max-w-2xl rounded-3xl border border-slate-800/70 bg-slate-950/95 shadow-[0_32px_80px_rgba(15,23,42,0.7)]">
          <div className="flex items-center justify-between border-b border-slate-800/70 px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-white">CSV 업로드</h3>
              <p className="text-xs text-slate-400">downloadAnalyticsCsv로 받은 포맷과 동일해야 합니다.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              닫기
            </button>
          </div>
          <div className="grid gap-4 px-6 py-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">CSV 파일 선택</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="mt-2 w-full rounded-2xl border border-slate-700/60 bg-slate-900/80 px-4 py-2 text-sm text-slate-200"
              />
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">미리보기</p>
              <p className="mt-1 text-slate-400">{summary}</p>
              {errors.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-rose-300">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
              {rows.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-slate-800/60">
                  <table className="min-w-full text-[11px] text-slate-200">
                    <thead className="bg-slate-900/80 uppercase tracking-[0.2em] text-slate-400">
                      <tr>
                        <th className="px-3 py-2 text-left">slug</th>
                        <th className="px-3 py-2 text-right">views</th>
                        <th className="px-3 py-2 text-right">likes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 10).map((row) => (
                        <tr key={row.slug} className="odd:bg-slate-900/40">
                          <td className="px-3 py-2 text-left">{row.slug}</td>
                          <td className="px-3 py-2 text-right">{row.views ?? ''}</td>
                          <td className="px-3 py-2 text-right">{row.likes ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 10 && (
                    <p className="px-3 py-2 text-[10px] text-slate-500">외 {rows.length - 10}개 행…</p>
                  )}
                </div>
              )}
            </div>
            {serverMessage && (
              <div
                className={`rounded-2xl px-4 py-3 text-xs ${
                  status === 'error'
                    ? 'border border-rose-500/40 bg-rose-500/10 text-rose-100'
                    : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                }`}
              >
                {serverMessage}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-600/60 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!rows.length || errors.length > 0 || status === 'loading'}
                className="rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'loading' ? '업로드 중…' : '업로드 실행'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

