const API_BASE_URL = 'https://api3.adsterratools.com/publisher';

function buildUrl(endpoint) {
  const trimmed = typeof endpoint === 'string' ? endpoint.trim() : '';
  if (!trimmed) {
    throw new Error('Endpoint is required');
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const normalized = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  return `${API_BASE_URL}/${normalized}`;
}

export async function fetchAdsterraJson(endpoint, token) {
  const apiToken = typeof token === 'string' ? token.trim() : '';
  if (!apiToken) {
    throw new Error('Missing Adsterra API token.');
  }

  const url = buildUrl(endpoint);
  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiToken,
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = null;
    }
  }

  if (!response.ok) {
    const message = data?.message || `Adsterra request failed with status ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const ADSTERRA_API_BASE_URL = API_BASE_URL;
