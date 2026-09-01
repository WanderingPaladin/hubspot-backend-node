const { hubSpotClient } = require('../clients/hubSpotClient');

const DEFAULT_PROPERTIES = ['firstname', 'lastname', 'email', 'phone', 'company'];

const contactRepository = {
  async list({ limit = 100, after, properties = DEFAULT_PROPERTIES, archived = false } = {}) {
    return hubSpotClient.contacts.list({ limit, after, properties, archived });
  },

  async getById(id, { properties = DEFAULT_PROPERTIES, idProperty } = {}) {
    return hubSpotClient.contacts.getById(id, { properties, idProperty });
  },

  async findByEmail(email, { properties = DEFAULT_PROPERTIES } = {}) {
    try {
      return await this.getById(email, { properties, idProperty: 'email' });
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async search({ filters, properties = DEFAULT_PROPERTIES, limit = 10, after } = {}) {
    return hubSpotClient.contacts.search({
      filterGroups: [{ filters }],
      properties,
      limit,
      after,
    });
  },

  async create(properties) {
    return hubSpotClient.contacts.create(properties);
  },

  async update(id, properties) {
    return hubSpotClient.contacts.update(id, properties);
  },

  async delete(id) {
    await hubSpotClient.contacts.archive(id);
    return { id, deleted: true };
  },
};

module.exports = { contactRepository };
