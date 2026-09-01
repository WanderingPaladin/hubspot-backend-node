const { hubSpotClient } = require('../clients/hubSpotClient');

const DEALS_PATH = '/crm/v3/objects/deals';
const DEFAULT_PROPERTIES = ['dealname', 'amount', 'pipeline', 'dealstage', 'hs_pipeline', 'hs_stage'];

const dealRepository = {
  async list({ limit = 100, after, properties = DEFAULT_PROPERTIES, archived = false } = {}) {
    return hubSpotClient.get(
      DEALS_PATH,
      {
        limit,
        after,
        properties: properties.join(','),
        archived,
      },
      { operation: 'dealRepository.list' },
    );
  },

  async getById(id, { properties = DEFAULT_PROPERTIES } = {}) {
    return hubSpotClient.get(
      `${DEALS_PATH}/${encodeURIComponent(id)}`,
      { properties: properties.join(',') },
      { operation: 'dealRepository.getById' },
    );
  },

  async search({ filters, properties = DEFAULT_PROPERTIES, limit = 10, after } = {}) {
    return hubSpotClient.post(
      `${DEALS_PATH}/search`,
      {
        filterGroups: [{ filters }],
        properties,
        limit,
        after,
      },
      undefined,
      { operation: 'dealRepository.search' },
    );
  },

  async findByDealName(dealname, { properties = DEFAULT_PROPERTIES } = {}) {
    const page = await this.search({
      filters: [{ propertyName: 'dealname', operator: 'EQ', value: dealname }],
      properties,
      limit: 1,
    });
    return page.results?.[0] || null;
  },

  async create(properties) {
    return hubSpotClient.post(
      DEALS_PATH,
      { properties },
      undefined,
      { operation: 'dealRepository.create' },
    );
  },

  async update(id, properties) {
    return hubSpotClient.patch(
      `${DEALS_PATH}/${encodeURIComponent(id)}`,
      { properties },
      undefined,
      { operation: 'dealRepository.update' },
    );
  },

  async delete(id) {
    await hubSpotClient.delete(
      `${DEALS_PATH}/${encodeURIComponent(id)}`,
      undefined,
      { operation: 'dealRepository.delete' },
    );
    return { id, deleted: true };
  },
};

module.exports = { dealRepository };
