// Lightweight GA4 event helper
export function gtag() {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    // eslint-disable-next-line prefer-rest-params
    window.gtag.apply(window, arguments);
  }
}

export function event(action, params = {}) {
  gtag('event', action, params);
}

