const { logError, logWarn, redact } = require('./logger');

const NETWORK_CODES = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNABORTED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
]);

function getStatus(error) {
  if (error.response?.status != null) {
    return error.response.status;
  }
  if (typeof error.statusCode === 'number') {
    return error.statusCode;
  }
  if (typeof error.code === 'number') {
    return error.code;
  }
  return undefined;
}

function getBody(error) {
  return error.response?.data ?? error.body;
}

function getHeaders(error) {
  return error.response?.headers || error.headers || {};
}

function readRetryAfterMs(error) {
  const header = getHeaders(error)['retry-after'] || getHeaders(error)['Retry-After'];
  if (!header) {
    return undefined;
  }
  const asSeconds = Number(header);
  if (!Number.isNaN(asSeconds)) {
    return asSeconds * 1000;
  }
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return undefined;
}

function hubSpotMessage(error) {
  const data = getBody(error);
  if (!data) {
    return error.message || 'Unknown HubSpot error';
  }
  if (typeof data === 'string') {
    return data;
  }
  return data.message || data.error || JSON.stringify(redact(data));
}

/**
 * Normalize a HubSpot SDK (ApiException) or HTTP failure, log a sanitized
 * record, and return a structured Error the client can use for retry decisions.
 *
 * Classification (see README for the full policy):
 * - Network / timeout  → retryable
 * - 401 / 403          → not retryable (auth / scopes)
 * - 429                → retryable (honor Retry-After)
 * - 5xx                → retryable
 * - other 4xx          → not retryable (validation / not found)
 */
function handleHubSpotErrors(error, context = {}) {
  if (error && (error.name === 'HubSpotError' || error.name === 'PayloadValidationError')) {
    return error;
  }

  const status = getStatus(error);
  const code = typeof error.code === 'string' ? error.code : undefined;
  const retryAfterMs = readRetryAfterMs(error);

  let type = 'UNKNOWN';
  let retryable = false;
  let message = hubSpotMessage(error);

  if (status == null) {
    type = 'NETWORK';
    retryable =
      NETWORK_CODES.has(code) ||
      /timeout/i.test(error.message || '') ||
      error.message === 'Network Error';
    message = retryable
      ? `Network error or timeout talking to HubSpot (${code || 'NO_RESPONSE'})`
      : `HubSpot request failed before a response was received (${code || error.message})`;
  } else if (status === 401 || status === 403) {
    type = 'AUTH';
    retryable = false;
    message = `Authentication/authorization failed (${status}). Check HUBSPOT_ACCESS_TOKEN and private-app scopes.`;
  } else if (status === 429) {
    type = 'RATE_LIMIT';
    retryable = true;
    message = 'HubSpot rate limit reached (429). Retrying with backoff.';
  } else if (status >= 500) {
    type = 'SERVER';
    retryable = true;
    message = `HubSpot server error (${status}).`;
  } else if (status >= 400) {
    type = 'VALIDATION';
    retryable = false;
    message = `HubSpot client error (${status}): ${hubSpotMessage(error)}`;
  }

  const normalized = new Error(message);
  normalized.name = 'HubSpotError';
  normalized.type = type;
  normalized.status = status;
  normalized.code = code;
  normalized.retryable = retryable;
  normalized.retryAfterMs = retryAfterMs;
  normalized.details = redact(getBody(error));
  normalized.context = redact(context);

  const logPayload = {
    type,
    status,
    code,
    retryable,
    retryAfterMs,
    context: normalized.context,
    details: normalized.details,
  };

  if (retryable) {
    logWarn(message, logPayload);
  } else {
    logError(message, logPayload);
  }

  return normalized;
}

function isRetryable(error) {
  return Boolean(error && error.retryable);
}

function getRetryDelayMs(attempt, baseMs, retryAfterMs) {
  if (retryAfterMs != null) {
    return retryAfterMs;
  }
  const exp = baseMs * 2 ** attempt;
  const jitter = Math.floor(Math.random() * Math.min(250, exp / 4));
  return exp + jitter;
}

module.exports = {
  handleHubSpotErrors,
  isRetryable,
  getRetryDelayMs,
};
