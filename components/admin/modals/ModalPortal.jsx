import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ModalPortal({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;
  const container = typeof document !== 'undefined' ? document.body : null;
  if (!container) return null;
  return createPortal(children, container);
}
