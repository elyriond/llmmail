const axios = require('axios');

function normalizeDomain(domain) {
  if (!domain) {
    return null;
  }

  const trimmed = domain.trim();
  if (!trimmed) {
    return null;
  }

  // Remove protocol if provided
  const withoutProtocol = trimmed.replace(/^\s*https?:\/\//i, '');
  // Drop any trailing slash
  let withoutTrailingSlash = withoutProtocol.replace(/\/+$/, '');

  if (/^dressipi\./i.test(withoutTrailingSlash)) {
    withoutTrailingSlash = `www.${withoutTrailingSlash}`;
  } else if (!/^www\./i.test(withoutTrailingSlash) && withoutTrailingSlash.includes('.dressipi.')) {
    withoutTrailingSlash = `www.${withoutTrailingSlash}`;
  }

  return withoutTrailingSlash;
}

/**
 * Fetch related items from Dressipi API.
 * Allows specifying either a full Dressipi domain (e.g. dressipi.anntaylor.com)
 * or a customer name (e.g. anntaylor).
 *
 * @param {object} params
 * @param {string} [params.customerName] - Customer subdomain, e.g. "anntaylor".
 * @param {string} [params.domain] - Full Dressipi domain, e.g. "dressipi.anntaylor.com".
 * @param {string} params.itemId - Seed item identifier.
 * @param {object} [params.queryOptions] - Additional query parameters to forward.
 * @returns {Promise<object>} API response data.
 */
async function fetchItemDetail(baseUrl, garmentId) {
  const url = new URL(`/api/items/${encodeURIComponent(garmentId)}`, baseUrl);
  url.searchParams.set('garment_format', 'detailed');

  const response = await axios.get(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'LLM-Mail/1.0 (+https://localhost)',
    },
    timeout: 15000,
    responseType: 'json',
  });

  return response.data;
}

async function fetchRelatedItems({ customerName, domain, itemId, queryOptions = {} }) {
  if (!itemId) {
    throw new Error('itemId is required to fetch related items');
  }

  let base = null;

  const normalizedDomain = normalizeDomain(domain);
  if (normalizedDomain) {
    base = `https://${normalizedDomain}`;
  } else if (customerName) {
    base = `https://www.dressipi.${customerName}.com`;
  } else {
    throw new Error('Either domain or customerName must be provided');
  }

  const url = new URL(`/api/items/${encodeURIComponent(itemId)}/related`, base);
  const params = new URLSearchParams({
    exclude_current_garment: 'true',
    garment_format: 'detailed',
    ...queryOptions,
  });
  url.search = params.toString();

  const response = await axios.get(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'LLM-Mail/1.0 (+https://localhost)',
    },
    timeout: 15000,
    maxRedirects: 2,
    validateStatus: (status) => status >= 200 && status < 400,
    responseType: 'text',
    transformResponse: [(data) => data],
  });

  const contentType = response.headers['content-type'] || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    const preview = typeof response.data === 'string'
      ? response.data.slice(0, 200)
      : '[non-JSON payload]';
    throw new Error(`Unexpected response from Dressipi (content-type: ${contentType}). Preview: ${preview}`);
  }

  let payload;
  try {
    payload = JSON.parse(response.data);
  } catch (parseError) {
    throw new Error(`Failed to parse Dressipi response as JSON. Preview: ${response.data.slice(0, 200)}`);
  }

  if (payload?.source?.garment_id) {
    try {
      payload.seed_detail = await fetchItemDetail(base, payload.source.garment_id);
    } catch (seedError) {
      payload.seed_detail_error = seedError.message;
    }
  }

  return payload;
}

module.exports = {
  fetchRelatedItems,
  fetchItemDetail,
};
