import { useCallback, useEffect, useRef, useState } from 'react';

async function writeToClipboard(text) {
  if (!text) return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.error('Clipboard API write failed', error);
  }

  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand?.('copy') ?? false;
    document.body.removeChild(textarea);
    return Boolean(success);
  } catch (error) {
    console.error('Fallback clipboard write failed', error);
    return false;
  }
}

export default function useClipboard(timeoutMs = 1800) {
  const [copiedValue, setCopiedValue] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (value) => {
      if (!value) return false;
      const success = await writeToClipboard(value);
      if (!success) {
        return false;
      }
      setCopiedValue(value);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopiedValue('');
      }, timeoutMs);
      return true;
    },
    [timeoutMs]
  );

  return { copiedValue, copy };
}
