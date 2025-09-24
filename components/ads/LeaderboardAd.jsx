import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const BannerFrame = dynamic(() => import('./RelishAtOptionsFrame'), { ssr: false });

function pickSize(w) {
  // Simple breakpoints: >= 1024 -> 728x90, >= 640 -> 468x60, else 320x50
  if (w >= 1024) return { width: 728, height: 90 };
  if (w >= 640) return { width: 468, height: 60 };
  return { width: 320, height: 50 };
}

export default function LeaderboardAd() {
  const [size, setSize] = useState({ width: 320, height: 50 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setSize(pickSize(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="mb-4 flex w-full items-center justify-center">
      <BannerFrame
        keyId="31f60ab9e6605fd78a985862e45a85ac"
        width={size.width}
        height={size.height}
        className="w-full"
      />
    </div>
  );
}

