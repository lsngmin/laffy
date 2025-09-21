const ORIENTATION_MAP = {
  landscape: 'aspect-video',
  portrait: 'aspect-[9/16]',
  square: 'aspect-square'
};

export const getOrientationClass = (orientation) => ORIENTATION_MAP[orientation] || 'aspect-video';

export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatRelativeTime = (date, locale = 'en') => {
  if (!date) return null;
  const target = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(target.getTime())) return null;

  const diff = target.getTime() - Date.now();
  const divisions = [
    { amount: 60, unit: 'second' },
    { amount: 60, unit: 'minute' },
    { amount: 24, unit: 'hour' },
    { amount: 7, unit: 'day' },
    { amount: 4.34524, unit: 'week' },
    { amount: 12, unit: 'month' },
    { amount: Number.POSITIVE_INFINITY, unit: 'year' }
  ];

  let duration = diff / 1000;
  let unit = 'second';

  for (const division of divisions) {
    if (Math.abs(duration) < division.amount) {
      unit = division.unit;
      break;
    }
    duration /= division.amount;
    unit = division.unit;
  }

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  return formatter.format(Math.round(duration), unit);
};

export const formatCount = (value, locale = 'en') => {
  if (!Number.isFinite(value)) return null;
  const formatter = new Intl.NumberFormat(locale, {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1
  });
  return formatter.format(value);
};
