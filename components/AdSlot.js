import { useEffect, useState } from 'react';

const SESSION_KEY = 'laffy:in-feed-ad-shown';

export default function AdSlot() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if (window.__inFeedAdShown) {
        return;
      }

      const storage = window.sessionStorage;
      const alreadyShown = storage && storage.getItem(SESSION_KEY) === '1';

      if (alreadyShown) {
        window.__inFeedAdShown = true;
        return;
      }

      if (storage) {
        storage.setItem(SESSION_KEY, '1');
      }
      window.__inFeedAdShown = true;
      setVisible(true);
    } catch (error) {
      console.warn('AdSlot visibility check failed', error);
      setVisible(true);
    }
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-pink-500/20 p-4 shadow-lg shadow-black/30">
      <div className="rounded-xl bg-slate-950/60 p-6">
        <div className="shimmer h-4 w-24 rounded-full bg-slate-800/80" />
        <div className="mt-4 space-y-3">
          <div className="shimmer h-3 rounded-full bg-slate-800/60" />
          <div className="shimmer h-3 w-3/4 rounded-full bg-slate-800/60" />
          <div className="shimmer h-3 w-2/3 rounded-full bg-slate-800/60" />
        </div>
        <div className="mt-6 flex gap-2">
          <div className="shimmer h-9 w-28 rounded-full bg-slate-800/70" />
          <div className="shimmer h-9 w-20 rounded-full bg-slate-800/70" />
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .shimmer {
          position: relative;
          overflow: hidden;
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.18) 50%,
            rgba(255, 255, 255, 0.05) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2.4s linear infinite;
        }
      `}</style>
    </div>
  );
}
