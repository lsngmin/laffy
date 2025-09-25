import { useEffect } from 'react';
import { registerPageviewTracker } from '@/lib/analyticsBridge';

export default function usePageviewTracker({ eventName, match, getPayload, enabled = true }) {
  useEffect(() => {
    if (!enabled || !eventName) return undefined;
    const cleanup = registerPageviewTracker({ eventName, match, getPayload });
    return cleanup;
  }, [enabled, eventName, match, getPayload]);
}
