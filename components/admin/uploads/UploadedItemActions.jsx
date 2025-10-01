import { useCallback, useEffect, useMemo, useState } from 'react';

function guessImageExtension(sourceUrl, contentType) {
  const knownExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp'];
  const normalizedType = typeof contentType === 'string' ? contentType.toLowerCase() : '';
  if (normalizedType.startsWith('image/')) {
    const subtype = normalizedType.split('/')[1]?.split(';')[0] || '';
    if (subtype === 'jpeg') return 'jpg';
    if (knownExtensions.includes(subtype)) return subtype;
  }

  const normalizedUrl = typeof sourceUrl === 'string' ? sourceUrl.toLowerCase() : '';
  const match = normalizedUrl.match(/\.([a-z0-9]{3,4})(?:\?|#|$)/);
  if (match) {
    const ext = match[1];
    if (ext === 'jpeg') return 'jpg';
    if (knownExtensions.includes(ext)) return ext;
  }

  return '';
}

function sanitizeFilename(value) {
  if (!value) return 'content-image';
  return value.replace(/[^a-zA-Z0-9-_]/g, '_') || 'content-image';
}

export default function UploadedItemActions({
  item,
  hasToken,
  copied,
  onCopy,
  onEdit,
  onDelete,
  onMoveToPending,
  moveToPendingStatus = 'idle',
}) {
  const canCopy = Boolean(item?.routePath);
  const handleCopy = useCallback(() => {
    if (!canCopy) return;
    onCopy(item);
  }, [canCopy, item, onCopy]);

  const downloadSource = useMemo(() => {
    if (!item) return '';
    const candidates = [item.thumbnail, item.preview, item.poster, item.src];
    return candidates.find((value) => typeof value === 'string' && value.trim()) || '';
  }, [item]);

  const [downloadStatus, setDownloadStatus] = useState('idle');

  useEffect(() => {
    if (downloadStatus !== 'success' && downloadStatus !== 'error') return undefined;
    const timer = setTimeout(() => {
      setDownloadStatus('idle');
    }, 3000);
    return () => clearTimeout(timer);
  }, [downloadStatus]);

  const handleDownload = useCallback(async () => {
    if (!downloadSource || downloadStatus === 'pending') return;
    if (typeof window === 'undefined') return;

    try {
      setDownloadStatus('pending');
      const response = await fetch(downloadSource);
      if (!response.ok) {
        throw new Error(`download_failed_${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const extension = guessImageExtension(downloadSource, response.type);
      const baseName = sanitizeFilename(item?.slug || 'content-image');
      const filename = extension ? `${baseName}.${extension}` : baseName;

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);

      setDownloadStatus('success');
    } catch (error) {
      console.error('Failed to download preview image', error);
      setDownloadStatus('error');
    }
  }, [downloadSource, downloadStatus, item?.slug]);

  const moveStatus = typeof moveToPendingStatus === 'string' ? moveToPendingStatus : 'idle';
  const canMoveToPending = hasToken && typeof onMoveToPending === 'function' && Boolean(item?.slug);
  const handleMoveToPending = useCallback(() => {
    if (!canMoveToPending) return;
    onMoveToPending(item);
  }, [canMoveToPending, item, onMoveToPending]);

  const moveLabel = (() => {
    if (moveStatus === 'pending') return '게시 대기로 이동 중…';
    if (moveStatus === 'success') return '게시 대기 이동 완료';
    if (moveStatus === 'error') return '이동 실패, 다시 시도';
    return '게시 대기 이동';
  })();

  const downloadLabel = (() => {
    if (downloadStatus === 'pending') return '다운로드 중…';
    if (downloadStatus === 'success') return '다운로드 완료';
    if (downloadStatus === 'error') return '다운로드 실패';
    return '이미지 다운로드';
  })();

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <button
        type="button"
        onClick={handleCopy}
        disabled={!canCopy}
        className={`group relative overflow-hidden rounded-xl border px-4 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ${
          copied
            ? 'border-emerald-400/70 text-emerald-100'
            : 'border-slate-700/70 text-slate-200 hover:border-sky-400/60 hover:text-white'
        } ${canCopy ? '' : 'cursor-not-allowed opacity-50'}`}
      >
        <span
          className={`absolute inset-0 -z-10 bg-gradient-to-r from-emerald-400/20 via-teal-400/15 to-cyan-400/25 transition ${
            copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-hidden="true"
        />
        <span className="relative z-10">{copied ? '링크 복사 완료' : '링크 복사'}</span>
      </button>
      {copied && <span className="sr-only" aria-live="polite">링크가 복사되었습니다.</span>}
      <button
        type="button"
        onClick={handleDownload}
        disabled={!downloadSource || downloadStatus === 'pending'}
        className={`group relative overflow-hidden rounded-xl border px-4 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200 ${
          downloadStatus === 'error'
            ? 'border-rose-500/70 text-rose-100'
            : 'border-sky-500/60 text-sky-100 hover:border-sky-400/70 hover:text-white'
        } ${downloadSource ? '' : 'cursor-not-allowed opacity-50'}`}
      >
        <span
          className={`absolute inset-0 -z-10 bg-gradient-to-r from-sky-500/20 via-cyan-500/15 to-indigo-500/20 transition ${
            downloadStatus === 'pending' || downloadStatus === 'success' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-hidden="true"
        />
        <span className="relative z-10">{downloadLabel}</span>
      </button>
      {downloadStatus === 'success' && (
        <span className="sr-only" aria-live="polite">
          이미지를 다운로드했습니다.
        </span>
      )}
      {hasToken && !item._error && (
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="group relative overflow-hidden rounded-xl border border-emerald-400/40 px-4 py-1.5 text-sm font-semibold text-emerald-100 shadow-[0_12px_30px_rgba(16,185,129,0.2)] transition hover:border-emerald-300/70 hover:text-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
        >
          <span className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-400/20 via-teal-400/15 to-cyan-400/20 opacity-70 group-hover:opacity-100" aria-hidden="true" />
          <span className="relative z-10">메타 수정</span>
        </button>
      )}
      {hasToken && (
        <button
          type="button"
          onClick={handleMoveToPending}
          disabled={!canMoveToPending || moveStatus === 'pending'}
          className={`group relative overflow-hidden rounded-xl border px-4 py-1.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
            moveStatus === 'error'
              ? 'border-rose-500/70 text-rose-100'
              : 'border-amber-400/60 text-amber-100 hover:border-amber-300/70 hover:text-amber-50'
          } ${canMoveToPending ? '' : 'cursor-not-allowed opacity-50'}`}
        >
          <span
            className={`absolute inset-0 -z-10 bg-gradient-to-r from-amber-400/25 via-orange-400/20 to-amber-500/25 transition ${
              moveStatus === 'pending' || moveStatus === 'success' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            aria-hidden="true"
          />
          <span className="relative z-10">{moveLabel}</span>
        </button>
      )}
      {moveStatus === 'success' && (
        <span className="sr-only" aria-live="polite">
          게시 대기 상태로 이동이 완료되었습니다.
        </span>
      )}
      <button
        type="button"
        disabled={!hasToken}
        onClick={() => onDelete(item)}
        className="group relative ml-auto overflow-hidden rounded-xl border border-rose-500/60 px-4 py-1.5 text-sm font-semibold text-rose-100 transition hover:border-rose-400/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:cursor-not-allowed disabled:border-rose-900 disabled:text-rose-400"
      >
        <span className="absolute inset-0 -z-10 bg-gradient-to-r from-rose-500/30 via-amber-500/20 to-rose-400/30 opacity-70 group-hover:opacity-100" aria-hidden="true" />
        <span className="relative z-10">삭제</span>
      </button>
    </div>
  );
}
