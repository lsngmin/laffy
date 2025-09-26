import { assertAdmin } from '../_auth';

function resolveActor(req, body) {
  const headerActor = typeof req.headers['x-admin-user'] === 'string' ? req.headers['x-admin-user'].trim() : '';
  const bodyActor = typeof body?.actor === 'string' ? body.actor.trim() : '';
  const queryActor = typeof req.query.actor === 'string' ? req.query.actor.trim() : '';
  return headerActor || bodyActor || queryActor || 'unknown';
}

function parseCsv(csvText) {
  if (typeof csvText !== 'string') {
    return { rows: [], errors: [{ code: 'missing_csv', message: 'CSV 데이터가 비어 있어요.' }] };
  }
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return { rows: [], errors: [{ code: 'empty_csv', message: 'CSV 내용이 없습니다.' }] };
  }

  const [headerLine, ...dataLines] = lines;
  const header = headerLine.split(',').map((value) => value.replace(/^"|"$/g, '').trim());
  const slugIndex = header.findIndex((value) => value.toLowerCase() === 'slug');
  const viewsIndex = header.findIndex((value) => value.toLowerCase() === 'views');
  const likesIndex = header.findIndex((value) => value.toLowerCase() === 'likes');

  if (slugIndex === -1) {
    return { rows: [], errors: [{ code: 'missing_slug_column', message: 'slug 컬럼이 필요합니다.' }] };
  }

  const rows = [];
  const errors = [];

  dataLines.forEach((line, index) => {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);

    const normalize = (value) => value.replace(/^"|"$/g, '').trim();
    const slug = normalize(parts[slugIndex] || '');
    if (!slug) {
      errors.push({ code: 'missing_slug', message: `slug이 비어 있어요. (행 ${index + 2})` });
      return;
    }

    const row = { slug };
    if (viewsIndex !== -1 && parts.length > viewsIndex) row.views = normalize(parts[viewsIndex]);
    if (likesIndex !== -1 && parts.length > likesIndex) row.likes = normalize(parts[likesIndex]);
    rows.push(row);
  });

  return { rows, errors };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  if (!assertAdmin(req, res)) return;

  try {
    const body = req.body || {};
    const { csv } = body;
    const { rows, errors } = parseCsv(csv);

    if (!rows.length) {
      return res.status(400).json({ error: '처리할 행이 없습니다.', details: errors });
    }

    const { normalizeMetricUpdates, applyMetricUpdates } = await import('../../../../utils/metricsAdminHelpers');
    const { targets, errors: payloadErrors } = normalizeMetricUpdates({ updates: rows });

    const combinedErrors = [...errors, ...payloadErrors];
    if (!targets.length) {
      return res.status(400).json({ error: '유효한 업데이트가 없습니다.', details: combinedErrors });
    }

    const actor = resolveActor(req, body);
    const { results } = await applyMetricUpdates({ targets, actor });
    return res.status(200).json({ results, skipped: rows.length - results.length, errors: combinedErrors });
  } catch (error) {
    console.error('[admin:metrics:import] Failed to process CSV', error);
    return res.status(500).json({ error: 'CSV 업로드 처리에 실패했어요.' });
  }
}

