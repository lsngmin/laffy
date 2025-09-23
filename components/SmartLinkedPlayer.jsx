import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

function withinCap(lastTs, capMs) {
  return typeof lastTs === 'number' && lastTs > 0 && Date.now() - lastTs < capMs;
}

function makeStorageKey(smartUrl) {
  const suffix = smartUrl ? encodeURIComponent(smartUrl) : 'default';
  return `smart_linked_player_last_open_${suffix}`;
}

export default function SmartLinkedPlayer({
  src,
  poster,
  smartUrl,
  capMinutes = 60,
  className = '',
}) {
  const videoRef = useRef(null);
  const [overlayVisible, setOverlayVisible] = useState(true);

  const capMs = useMemo(() => Math.max(0, Number(capMinutes) || 0) * 60_000, [capMinutes]);
  const storageKey = useMemo(() => makeStorageKey(smartUrl), [smartUrl]);

  useEffect(() => {
    setOverlayVisible(true);
  }, [src]);

  const handleFirstInteraction = useCallback(async () => {
    const videoElement = videoRef.current;
    const isBrowser = typeof window !== 'undefined';

    if (isBrowser) {
      try {
        const raw = window.localStorage?.getItem(storageKey) || '0';
        const last = Number(raw);

        if (!withinCap(last, capMs)) {
          const popup = window.open(smartUrl, '_blank', 'noopener,noreferrer');
          if (popup) {
            window.localStorage?.setItem(storageKey, String(Date.now()));
          } else {
            console.warn('Smart link window blocked or failed to open.');
          }
        }
      } catch (error) {
        console.warn('Smart link handling failed:', error);
      }
    }

    if (videoElement) {
      try {
        if (videoElement.paused) {
          await videoElement.play();
        }
      } catch (error) {
        console.warn('Video play() failed:', error);
      }
    }

    setOverlayVisible(false);
  }, [capMs, smartUrl, storageKey]);

  const handlePlay = useCallback(() => {
    setOverlayVisible(false);
  }, []);

  const normalizedSrc = src || '';
  const sourceType = normalizedSrc.toLowerCase().endsWith('.m3u8')
    ? 'application/x-mpegURL'
    : 'video/mp4';

  return (
    <div
      className={className}
      style={{ position: 'relative', width: '100%', margin: '0 auto' }}
    >
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        onPlay={handlePlay}
        style={{ width: '100%', height: 'auto', display: 'block', backgroundColor: '#000' }}
      >
        <source src={normalizedSrc} type={sourceType} />
      </video>

      {overlayVisible && (
        <button
          type="button"
          onClick={handleFirstInteraction}
          aria-label="Play (opens sponsored link)"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.65))',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              fontFamily: 'inherit',
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: '9999px',
                background: 'rgba(255,255,255,0.18)',
                display: 'grid',
                placeItems: 'center',
                backdropFilter: 'blur(4px)',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <small style={{ opacity: 0.85, fontSize: 12 }}>광고 링크가 새 탭으로 열립니다</small>
          </div>
        </button>
      )}
    </div>
  );
}

SmartLinkedPlayer.propTypes = {
  src: PropTypes.string.isRequired,
  poster: PropTypes.string,
  smartUrl: PropTypes.string.isRequired,
  capMinutes: PropTypes.number,
  className: PropTypes.string,
};
