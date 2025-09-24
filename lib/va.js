// Vercel Analytics helper (safe wrapper)
import { track } from '@vercel/analytics';

export function vaTrack(name, props = {}) {
  try {
    track(name, props);
  } catch (e) {
    // no-op in SSR or if analytics is unavailable
  }
}

