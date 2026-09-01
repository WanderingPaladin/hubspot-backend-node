const { Client, AssociationTypes } = require('@hubspot/api-client');
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

function toPlain(value) {
  if (value == null || typeof value !== 'object') {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

async function parseApiRequestResponse(response) {
  const text = typeof response.text === 'function' ? await response.text() : '';
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (response.status >= 400) {
    const error = new Error((data && data.message) || text || `HTTP ${response.status}`);
    error.code = response.status;
    error.body = data;
    error.headers = response.headers;
    throw error;
  }

  return data;
}

/**
 * Official @hubspot/api-client wrapper.
 * Typed CRM methods are used for Contacts, Deals, Associations, and Pipelines.
 * apiRequest covers endpoints the generated client does not expose (account-info).
 * Retries stay here so 401/403 never retry and 429 honors Retry-After.
 */
const hubSpotClient = {
  AssociationTypes,

  getSdk() {
    assertToken();
    const options = {
      accessToken: config.hubspot.accessToken,
      numberOfApiCallRetries: 0,
    };
    if (config.hubspot.apiBaseUrl && config.hubspot.apiBaseUrl !== 'https://api.hubapi.com') {
      options.basePath = config.hubspot.apiBaseUrl;
    }
    return new Client(options);
  },

  async withRetry(fn, context = {}) {
    let attempt = 0;
    const maxRetries = config.hubspot.maxRetries;

    while (true) {
      try {
        return toPlain(await fn(this.getSdk()));
      } catch (error) {
        if (error && error.name === 'HubSpotError') {
          throw error;
        }
        const normalized = handleHubSpotErrors(error, { ...context, attempt });
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
            operation: context.operation,
          });
          await sleep(delayMs);
          attempt += 1;
          continue;
        }
        throw normalized;
      }
    }
  },

  contacts: {
    list({ limit = 100, after, properties, archived = false } = {}) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.contacts.basicApi.getPage(limit, after, properties, undefined, undefined, archived),
        { operation: 'contacts.list' },
      );
    },
    getById(id, { properties, idProperty } = {}) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.contacts.basicApi.getById(String(id), properties, undefined, undefined, undefined, idProperty),
        { operation: 'contacts.getById' },
      );
    },
    search(publicObjectSearchRequest) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.contacts.searchApi.doSearch(publicObjectSearchRequest),
        { operation: 'contacts.search' },
      );
    },
    create(properties) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.contacts.basicApi.create({ properties }),
        { operation: 'contacts.create' },
      );
    },
    update(id, properties) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.contacts.basicApi.update(String(id), { properties }),
        { operation: 'contacts.update' },
      );
    },
    archive(id) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.contacts.basicApi.archive(String(id)),
        { operation: 'contacts.archive' },
      );
    },
  },

  deals: {
    list({ limit = 100, after, properties, archived = false } = {}) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.deals.basicApi.getPage(limit, after, properties, undefined, undefined, archived),
        { operation: 'deals.list' },
      );
    },
    getById(id, { properties } = {}) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.deals.basicApi.getById(String(id), properties),
        { operation: 'deals.getById' },
      );
    },
    search(publicObjectSearchRequest) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.deals.searchApi.doSearch(publicObjectSearchRequest),
        { operation: 'deals.search' },
      );
    },
    create(properties) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.deals.basicApi.create({ properties }),
        { operation: 'deals.create' },
      );
    },
    update(id, properties) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.deals.basicApi.update(String(id), { properties }),
        { operation: 'deals.update' },
      );
    },
    archive(id) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.deals.basicApi.archive(String(id)),
        { operation: 'deals.archive' },
      );
    },
  },

  associations: {
    listContactDeals(contactId) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.associations.v4.basicApi.getPage('contacts', String(contactId), 'deals'),
        { operation: 'associations.listContactDeals' },
      );
    },
    createDefaultContactToDeal(contactId, dealId) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.associations.v4.basicApi.createDefault(
          'contacts',
          String(contactId),
          'deals',
          String(dealId),
        ),
        { operation: 'associations.createDefaultContactToDeal' },
      );
    },
    createTypedContactToDeal(contactId, dealId) {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.associations.v4.basicApi.create(
          'contacts',
          String(contactId),
          'deals',
          String(dealId),
          [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: AssociationTypes.contactToDeal,
            },
          ],
        ),
        { operation: 'associations.createTypedContactToDeal' },
      );
    },
  },

  pipelines: {
    listDeals() {
      return hubSpotClient.withRetry(
        (sdk) => sdk.crm.pipelines.pipelinesApi.getAll('deals'),
        { operation: 'pipelines.listDeals' },
      );
    },
  },

  /**
   * Escape hatch for official paths the generated client does not wrap
   * (e.g. GET /account-info/v3/details).
   */
  async request({ method, url, path, params, data, context = {} }) {
    return this.withRetry(async (sdk) => {
      const response = await sdk.apiRequest({
        method,
        path: path || url,
        qs: params,
        body: data,
        defaultJson: true,
      });
      return parseApiRequestResponse(response);
    }, { ...context, method, url: path || url });
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
