export const HeartIcon = ({ filled = false, className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.36 5.36 0 0 0-7.58-.2l-1.26 1.25-1.26-1.25a5.36 5.36 0 0 0-7.58.2 5.67 5.67 0 0 0 .28 7.86L11 20.2a1.5 1.5 0 0 0 2.08 0l7.56-7.73a5.67 5.67 0 0 0 .2-7.86Z" />
  </svg>
);

export const EyeIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const ClockIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const ShareIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="18" cy="5.5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="18.5" r="2.5" />
    <path d="M8.25 11.25 15.7 7.15" />
    <path d="M8.25 12.75 15.7 16.85" />
  </svg>
);


export const SparkIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3v3" />
    <path d="M12 18v3" />
    <path d="M4.5 7.5 7 9" />
    <path d="M17 15l2.5 1.5" />
    <path d="m4.5 16.5 2.5-1.5" />
    <path d="M17 9l2.5-1.5" />
    <circle cx="12" cy="12" r="4.5" />
  </svg>
);

export const PlayIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M6.5 4.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1.5.86l11.5-6.5a1 1 0 0 0 0-1.72L7 4.64a1 1 0 0 0-.5-.14Z" />
  </svg>
);

export const CompassIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2.2 5.2-5.3 2.3 2.2-5.2 5.3-2.3Z" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const BookmarkIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6.5 4.5A2.5 2.5 0 0 1 9 2h6a2.5 2.5 0 0 1 2.5 2.5v16l-5.5-3-5.5 3v-16Z" />
  </svg>
);

export const SparklesIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 4.5 13.2 8l3.3 1-3.3 1-1.2 3.5-1.2-3.5-3.3-1 3.3-1L12 4.5Z" />
    <path d="M5 5.5 5.6 7l1.5.5-1.5.5L5 9.5l-.5-1.5L3 7.5l1.5-.5L5 5.5Z" />
    <path d="M18.5 14.5 19.2 16l1.5.5-1.5.5-.7 1.5-.6-1.5-1.5-.5 1.5-.5.6-1.5Z" />
  </svg>
);
