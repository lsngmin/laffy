import { useCallback, useEffect, useRef, useState } from 'react';

export default function useClipboard(timeoutMs = 1800) {
  const [copiedSlug, setCopiedSlug] = useState('');
  const timeoutRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const copy = useCallback(
    async (slug, routePath) => {
      if (!routePath) return false;
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const absoluteUrl = origin ? new URL(routePath, origin).toString() : routePath;
        const canUseClipboard =
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === 'function';

        if (canUseClipboard) {
          await navigator.clipboard.writeText(absoluteUrl);
        } else if (typeof document !== 'undefined') {
          const textarea = document.createElement('textarea');
          textarea.value = absoluteUrl;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'absolute';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          if (typeof document.execCommand === 'function') {
            document.execCommand('copy');
          } else {
            throw new Error('Clipboard API unavailable');
          }
          document.body.removeChild(textarea);
        } else {
          return false;
        }

        clearTimer();
        setCopiedSlug(slug || routePath);
        timeoutRef.current = setTimeout(() => {
          setCopiedSlug('');
          timeoutRef.current = null;
        }, timeoutMs);
        return true;
      } catch (error) {
        console.error('Copy failed', error);
        return false;
      }
    },
    [clearTimer, timeoutMs]
  );

  return { copiedSlug, copy };
}
