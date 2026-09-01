class PayloadValidationError extends Error {
  constructor(message, fields = []) {
    super(message);
    this.name = 'PayloadValidationError';
    this.type = 'VALIDATION';
    this.retryable = false;
    this.status = 400;
    this.fields = fields;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireFields(payload, fields) {
  const missing = fields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === '';
  });
  if (missing.length) {
    throw new PayloadValidationError(`Missing required field(s): ${missing.join(', ')}`, missing);
  }
}

/**
 * Validate payloads before they are sent to HubSpot.
 * @param {'contactCreate'|'contactUpdate'|'dealCreate'|'dealUpdate'|'association'|'syncContacts'|'syncDeals'} kind
 * @param {object} payload
 */
function validateHubSpotPayload(kind, payload) {
  if (!isPlainObject(payload)) {
    throw new PayloadValidationError('Payload must be an object');
  }

  switch (kind) {
    case 'contactCreate': {
      const properties = payload.properties || payload;
      if (!properties.email && !properties.firstname && !properties.lastname) {
        throw new PayloadValidationError(
          'A contact needs at least one of: email, firstname, lastname',
          ['email', 'firstname', 'lastname'],
        );
      }
      return properties;
    }
    case 'contactUpdate': {
      requireFields(payload, ['id']);
      if (!isPlainObject(payload.properties) || !Object.keys(payload.properties).length) {
        throw new PayloadValidationError('Update requires a non-empty properties object', ['properties']);
      }
      return payload;
    }
    case 'dealCreate': {
      const properties = payload.properties || payload;
      requireFields(properties, ['dealname']);
      if (properties.amount === undefined || properties.amount === null || properties.amount === '') {
        throw new PayloadValidationError('Deal amount is required', ['amount']);
      }
      return properties;
    }
    case 'dealUpdate': {
      requireFields(payload, ['id']);
      if (!isPlainObject(payload.properties) || !Object.keys(payload.properties).length) {
        throw new PayloadValidationError('Update requires a non-empty properties object', ['properties']);
      }
      return payload;
    }
    case 'association': {
      requireFields(payload, ['contactId', 'dealId']);
      return payload;
    }
    case 'syncContacts': {
      if (!Array.isArray(payload.contacts)) {
        throw new PayloadValidationError('syncContactsWithHubSpot expects { contacts: [] }', ['contacts']);
      }
      return payload;
    }
    case 'syncDeals': {
      if (!Array.isArray(payload.deals)) {
        throw new PayloadValidationError('syncDealsWithHubSpot expects { deals: [] }', ['deals']);
      }
      return payload;
    }
    default:
      throw new PayloadValidationError(`Unknown payload kind: ${kind}`);
  }
}

module.exports = { validateHubSpotPayload, PayloadValidationError };
