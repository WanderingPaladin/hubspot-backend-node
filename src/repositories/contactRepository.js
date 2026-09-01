const { hubSpotClient } = require('../clients/hubSpotClient');

const CONTACTS_PATH = '/crm/v3/objects/contacts';
const DEFAULT_PROPERTIES = ['firstname', 'lastname', 'email', 'phone', 'company'];

const contactRepository = {
  async list({ limit = 100, after, properties = DEFAULT_PROPERTIES, archived = false } = {}) {
    return hubSpotClient.get(
      CONTACTS_PATH,
      {
        limit,
        after,
        properties: properties.join(','),
        archived,
      },
      { operation: 'contactRepository.list' },
    );
  },

  async getById(id, { properties = DEFAULT_PROPERTIES, idProperty } = {}) {
    return hubSpotClient.get(
      `${CONTACTS_PATH}/${encodeURIComponent(id)}`,
      {
        properties: properties.join(','),
        idProperty,
      },
      { operation: 'contactRepository.getById' },
    );
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
    return hubSpotClient.post(
      `${CONTACTS_PATH}/search`,
      {
        filterGroups: [{ filters }],
        properties,
        limit,
        after,
      },
      undefined,
      { operation: 'contactRepository.search' },
    );
  },

  async create(properties) {
    return hubSpotClient.post(
      CONTACTS_PATH,
      { properties },
      undefined,
      { operation: 'contactRepository.create' },
    );
  },

  async update(id, properties) {
    return hubSpotClient.patch(
      `${CONTACTS_PATH}/${encodeURIComponent(id)}`,
      { properties },
      undefined,
      { operation: 'contactRepository.update' },
    );
  },

  async delete(id) {
    await hubSpotClient.delete(
      `${CONTACTS_PATH}/${encodeURIComponent(id)}`,
      undefined,
      { operation: 'contactRepository.delete' },
    );
    return { id, deleted: true };
  },
};

module.exports = { contactRepository };
