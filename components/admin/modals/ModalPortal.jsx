import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ModalPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = document.createElement('div');
    container.className = 'admin-modal-portal';
    document.body.appendChild(container);
    containerRef.current = container;
    setMounted(true);
    return () => {
      container.remove();
    };
  }, []);

  if (!mounted || !containerRef.current) return null;
  return createPortal(children, containerRef.current);
}
