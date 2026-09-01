const { hubSpotClient } = require('../clients/hubSpotClient');

const DEFAULT_PROPERTIES = ['dealname', 'amount', 'pipeline', 'dealstage', 'hs_pipeline', 'hs_stage'];

const dealRepository = {
  async list({ limit = 100, after, properties = DEFAULT_PROPERTIES, archived = false } = {}) {
    return hubSpotClient.deals.list({ limit, after, properties, archived });
  },

  async getById(id, { properties = DEFAULT_PROPERTIES } = {}) {
    return hubSpotClient.deals.getById(id, { properties });
  },

  async search({ filters, properties = DEFAULT_PROPERTIES, limit = 10, after } = {}) {
    return hubSpotClient.deals.search({
      filterGroups: [{ filters }],
      properties,
      limit,
      after,
    });
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
    return hubSpotClient.deals.create(properties);
  },

  async update(id, properties) {
    return hubSpotClient.deals.update(id, properties);
  },

  async delete(id) {
    await hubSpotClient.deals.archive(id);
    return { id, deleted: true };
  },
};

module.exports = { dealRepository };
