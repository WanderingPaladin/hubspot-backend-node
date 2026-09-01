const axios = require('axios');
const { config } = require('../config');
const { handleHubSpotErrors, isRetryable, getRetryDelayMs } = require('../utils/handleHubSpotErrors');
const { logWarn } = require('../utils/logger');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assertToken() {
  if (!config.hubspot.accessToken) {
    const error = new Error(
      'Missing HUBSPOT_ACCESS_TOKEN or HUBSPOT_API_KEY. Copy .env.example to .env and add a Private App token.',
    );
    error.name = 'HubSpotError';
    error.type = 'AUTH';
    error.retryable = false;
    error.status = 401;
    throw error;
  }
}

function createAxiosInstance() {
  return axios.create({
    baseURL: config.hubspot.apiBaseUrl,
    timeout: config.hubspot.timeoutMs,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

async function sendWithRetry(instance, requestConfig, context) {
  let attempt = 0;
  const maxRetries = config.hubspot.maxRetries;

  while (true) {
    try {
      const response = await instance.request(requestConfig);
      return response.data;
    } catch (error) {
      const normalized = handleHubSpotErrors(error, {
        ...context,
        method: requestConfig.method,
        url: requestConfig.url,
        attempt,
      });

      if (isRetryable(normalized) && attempt < maxRetries) {
        const delayMs = getRetryDelayMs(
          attempt,
          config.hubspot.retryBaseMs,
          normalized.retryAfterMs,
        );
        logWarn(`Retrying HubSpot request in ${delayMs}ms`, {
          attempt: attempt + 1,
          maxRetries,
          type: normalized.type,
          url: requestConfig.url,
        });
        await sleep(delayMs);
        attempt += 1;
        continue;
      }

      throw normalized;
    }
  }
}

/**
 * Central HubSpot HTTP client. All CRM calls go through request().
 * Auth is a Private App Bearer token (HUBSPOT_ACCESS_TOKEN).
 */
const hubSpotClient = {
  async request({ method, url, params, data, context = {} }) {
    assertToken();
    const instance = createAxiosInstance();
    return sendWithRetry(
      instance,
      {
        method,
        url,
        params,
        data,
        headers: {
          Authorization: `Bearer ${config.hubspot.accessToken}`,
        },
      },
      context,
    );
  },

  get(url, params, context) {
    return this.request({ method: 'GET', url, params, context });
  },

  post(url, data, params, context) {
    return this.request({ method: 'POST', url, data, params, context });
  },

  patch(url, data, params, context) {
    return this.request({ method: 'PATCH', url, data, params, context });
  },

  put(url, data, params, context) {
    return this.request({ method: 'PUT', url, data, params, context });
  },

  delete(url, params, context) {
    return this.request({ method: 'DELETE', url, params, context });
  },
};

module.exports = { hubSpotClient };
