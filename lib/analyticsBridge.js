import { vaTrack } from '@/lib/va';

const pageviewHandlers = new Set();

export function registerPageviewTracker(config) {
  if (!config || typeof window === 'undefined') return () => {};
  const handler = {
    eventName: config.eventName,
    match: typeof config.match === 'function' ? config.match : () => true,
    getPayload: typeof config.getPayload === 'function' ? config.getPayload : () => ({}),
  };
  pageviewHandlers.add(handler);
  return () => {
    pageviewHandlers.delete(handler);
  };
}

let beforeSendBridge;

export function getAnalyticsBeforeSend() {
  if (!beforeSendBridge) {
    beforeSendBridge = function beforeSend(event) {
      if (!event || event.type !== 'pageview') return event;
      pageviewHandlers.forEach((handler) => {
        try {
          if (!handler.eventName) return;
          if (!handler.match(event)) return;
          const payload = handler.getPayload(event);
          if (!payload) return;
          vaTrack(handler.eventName, payload);
        } catch (err) {
          // Silent guard to avoid blocking Vercel analytics
        }
      });
      return event;
    };
  }
  return beforeSendBridge;
}
