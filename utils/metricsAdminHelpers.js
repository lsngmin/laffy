import { getMetrics, overwriteMetrics } from './metricsStore';
import { recordMetricsAudit } from './metricsAuditLog';

function parseMetricNumber(raw) {
  if (raw === null || raw === undefined) {
    return { provided: false, value: null };
  }
  if (typeof raw === 'string' && raw.trim() === '') {
    return { provided: false, value: null };
  }

  const num = Number(raw);
  if (!Number.isFinite(num)) {
    return {
      provided: true,
      error: { code: 'not_a_number', message: '유효한 숫자가 아니에요.' },
    };
  }

  if (num < 0) {
    return {
      provided: true,
      error: { code: 'negative', message: '음수 값은 허용되지 않습니다.' },
    };
  }

  const value = Math.max(0, Math.round(num));
  return { provided: true, value };
}

function normalizeSlug(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function normalizeMetricUpdates(payload = {}) {
  const targets = [];
  const errors = [];

  const pushTarget = (slugValue, metricsSource = {}) => {
    const slug = normalizeSlug(slugValue);
    if (!slug) {
      errors.push({ code: 'missing_slug', message: 'slug이 비어 있어요.' });
      return;
    }

    const viewsResult = parseMetricNumber(metricsSource.views);
    const likesResult = parseMetricNumber(metricsSource.likes);

    if (viewsResult.error) {
      errors.push({ code: viewsResult.error.code, message: viewsResult.error.message, slug, field: 'views' });
      return;
    }

    if (likesResult.error) {
      errors.push({ code: likesResult.error.code, message: likesResult.error.message, slug, field: 'likes' });
      return;
    }

    const provided = { views: viewsResult.provided, likes: likesResult.provided };
    if (!provided.views && !provided.likes) {
      // Nothing to update for this slug.
      return;
    }

    const metrics = {};
    if (provided.views) metrics.views = viewsResult.value;
    if (provided.likes) metrics.likes = likesResult.value;

    targets.push({ slug, metrics, provided });
  };

  if (Array.isArray(payload.updates) && payload.updates.length) {
    payload.updates.forEach((update) => {
      if (!update || typeof update !== 'object') return;
      pushTarget(update.slug, update);
    });
  } else {
    const slugList = [];
    if (typeof payload.slug === 'string') slugList.push(payload.slug);
    if (Array.isArray(payload.slugs)) slugList.push(...payload.slugs);
    const uniqueSlugs = Array.from(new Set(slugList.map(normalizeSlug).filter(Boolean)));
    uniqueSlugs.forEach((slug) => {
      pushTarget(slug, { views: payload.views, likes: payload.likes });
    });
  }

  return { targets, errors };
}

export async function applyMetricUpdates({ targets = [], actor = 'unknown' }) {
  if (!Array.isArray(targets) || !targets.length) {
    return { results: [], auditEntries: [] };
  }

  const results = [];
  const auditEntries = [];

  for (const target of targets) {
    if (!target || typeof target !== 'object') continue;
    const slug = normalizeSlug(target.slug);
    if (!slug) continue;

    const payload = {};
    if (target.provided?.views) payload.views = target.metrics.views;
    if (target.provided?.likes) payload.likes = target.metrics.likes;
    if (!Object.keys(payload).length) continue;

    const before = await getMetrics(slug);
    const next = await overwriteMetrics(slug, payload);

    results.push({ slug, views: next.views ?? 0, likes: next.likes ?? 0 });
    auditEntries.push({
      slug,
      changedBy: actor,
      changedAt: new Date().toISOString(),
      before: { views: before.views ?? 0, likes: before.likes ?? 0 },
      after: { views: next.views ?? 0, likes: next.likes ?? 0 },
    });
  }

  if (auditEntries.length) {
    await recordMetricsAudit(auditEntries);
  }

  return { results, auditEntries };
}

