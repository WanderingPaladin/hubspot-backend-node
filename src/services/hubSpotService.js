const { config } = require('../config');
const { hubSpotClient } = require('../clients/hubSpotClient');
const { contactRepository } = require('../repositories/contactRepository');
const { dealRepository } = require('../repositories/dealRepository');
const { validateHubSpotPayload, PayloadValidationError } = require('../utils/validateHubSpotPayload');
const { handleHubSpotErrors } = require('../utils/handleHubSpotErrors');
const { logInfo } = require('../utils/logger');

const CONTACT_TO_DEAL_ASSOCIATION_TYPE_ID = 4;

function fullName(properties = {}) {
  return [properties.firstname, properties.lastname].filter(Boolean).join(' ').trim();
}

function toContactProperties(input = {}) {
  const source = input.properties || input;
  const properties = {};
  for (const key of ['email', 'firstname', 'lastname', 'phone', 'company', 'website', 'jobtitle']) {
    if (source[key] !== undefined) {
      properties[key] = source[key];
    }
  }
  return properties;
}

function toDealProperties(input = {}) {
  const source = input.properties || input;
  const properties = {};
  for (const key of ['dealname', 'amount', 'pipeline', 'dealstage', 'hs_pipeline', 'hs_stage', 'closedate']) {
    if (source[key] !== undefined) {
      properties[key] = source[key];
    }
  }
  if (properties.amount !== undefined) {
    properties.amount = String(properties.amount);
  }
  return properties;
}

async function paginateAll(listPage, { limit = 100, properties, maxPages = 1000 } = {}) {
  const results = [];
  let after;
  let pages = 0;

  do {
    const page = await listPage({ limit, after, properties });
    results.push(...(page.results || []));
    after = page.paging?.next?.after;
    pages += 1;
  } while (after && pages < maxPages);

  return results;
}

/**
 * Returns an array of full names (firstname + lastname) for every contact.
 * Walks GET /crm/v3/objects/contacts using paging.next.after.
 */
async function getHubSpotContactNames() {
  try {
    const contacts = await paginateAll((opts) => contactRepository.list(opts), {
      properties: ['firstname', 'lastname'],
    });
    return contacts.map((contact) => fullName(contact.properties));
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'getHubSpotContactNames' });
  }
}

/**
 * Lists paginated contact details. Optional filters: email, after, limit, properties.
 */
async function getHubSpotContacts(options = {}) {
  try {
    const { email, limit = 100, after, properties, archived } = options;
    if (email) {
      const match = await contactRepository.findByEmail(email, { properties });
      return {
        results: match ? [match] : [],
        paging: undefined,
        filter: { email },
      };
    }
    return await contactRepository.list({ limit, after, properties, archived });
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'getHubSpotContacts' });
  }
}

async function createHubSpotContact(input) {
  try {
    const properties = validateHubSpotPayload('contactCreate', input);
    return await contactRepository.create(toContactProperties({ properties }));
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'createHubSpotContact' });
  }
}

async function updateHubSpotContact(id, properties) {
  try {
    validateHubSpotPayload('contactUpdate', { id, properties });
    return await contactRepository.update(id, properties);
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'updateHubSpotContact', id });
  }
}

async function deleteHubSpotContact(id) {
  try {
    if (!id) {
      throw new PayloadValidationError('contact id is required', ['id']);
    }
    return await contactRepository.delete(id);
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'deleteHubSpotContact', id });
  }
}

async function getHubSpotDeals(options = {}) {
  try {
    const { limit = 100, after, properties, archived, dealname } = options;
    if (dealname) {
      const match = await dealRepository.findByDealName(dealname, { properties });
      return {
        results: match ? [match] : [],
        paging: undefined,
        filter: { dealname },
      };
    }
    return await dealRepository.list({ limit, after, properties, archived });
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'getHubSpotDeals' });
  }
}

/**
 * POST /crm/v3/objects/deals
 * Sends assessment fields (hs_pipeline, hs_stage) plus official names (pipeline, dealstage).
 */
async function createHubSpotDeal(dealName, amount, options = {}) {
  try {
    const pipelineId = options.hs_pipeline || options.pipeline || config.hubspot.pipelineId;
    const stageId = options.hs_stage || options.dealstage || options.stage || config.hubspot.stageId;

    const properties = validateHubSpotPayload('dealCreate', {
      dealname: dealName,
      amount,
      hs_pipeline: pipelineId,
      hs_stage: stageId,
      pipeline: pipelineId,
      dealstage: stageId,
      ...options.properties,
    });

    try {
      return await dealRepository.create(properties);
    } catch (error) {
      const invalidExtra =
        error.status === 400 &&
        /hs_pipeline|hs_stage|PROPERTY_DOESNT_EXIST|invalid.*propert/i.test(
          `${error.message} ${JSON.stringify(error.details || {})}`,
        );
      if (invalidExtra) {
        const { hs_pipeline: _p, hs_stage: _s, ...official } = properties;
        logInfo('Retrying deal create with official pipeline/dealstage properties only');
        return await dealRepository.create(official);
      }
      throw error;
    }
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'createHubSpotDeal' });
  }
}

async function updateHubSpotDeal(id, properties) {
  try {
    validateHubSpotPayload('dealUpdate', { id, properties });
    return await dealRepository.update(id, properties);
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'updateHubSpotDeal', id });
  }
}

async function deleteHubSpotDeal(id) {
  try {
    if (!id) {
      throw new PayloadValidationError('deal id is required', ['id']);
    }
    return await dealRepository.delete(id);
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'deleteHubSpotDeal', id });
  }
}

async function listContactDealAssociations(contactId) {
  return hubSpotClient.associations.listContactDeals(contactId);
}

/**
 * Idempotent association via @hubspot/api-client:
 * 1. GET existing v4 associations and skip if already linked
 * 2. createDefault (unlabeled Contact ↔ Deal)
 * 3. Fallback: v4 create with AssociationTypes.contactToDeal (typeId 4)
 */
async function associateContactToDeal(contactId, dealId) {
  try {
    validateHubSpotPayload('association', { contactId, dealId });

    try {
      const existing = await listContactDealAssociations(contactId);
      const alreadyLinked = (existing.results || []).some((row) => {
        const associatedId = row.toObjectId || row.id;
        return String(associatedId) === String(dealId);
      });
      if (alreadyLinked) {
        logInfo('Association already exists; skipping create', { contactId, dealId });
        return {
          contactId,
          dealId,
          associated: true,
          idempotent: true,
          created: false,
        };
      }
    } catch (lookupError) {
      logInfo('Could not pre-check associations; continuing with createDefault', {
        status: lookupError.status,
      });
    }

    try {
      const created = await hubSpotClient.associations.createDefaultContactToDeal(contactId, dealId);
      return {
        contactId,
        dealId,
        associated: true,
        created: true,
        idempotent: true,
        result: created,
      };
    } catch (defaultError) {
      logInfo('Default association failed; falling back to typeId 4 (contactToDeal)', {
        status: defaultError.status,
      });
      const created = await hubSpotClient.associations.createTypedContactToDeal(contactId, dealId);
      return {
        contactId,
        dealId,
        associated: true,
        created: true,
        idempotent: true,
        associationTypeId: CONTACT_TO_DEAL_ASSOCIATION_TYPE_ID,
        result: created,
      };
    }
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'associateContactToDeal', contactId, dealId });
  }
}

/**
 * Idempotent contact sync from a local source (JSON array).
 * Unique key: email. Creates when missing, updates when present.
 */
async function syncContactsWithHubSpot(contacts) {
  try {
    validateHubSpotPayload('syncContacts', { contacts });
    const summary = { created: [], updated: [], skipped: [], errors: [] };

    for (const raw of contacts) {
      const properties = toContactProperties(raw);
      try {
        if (!properties.email) {
          const created = await contactRepository.create(
            validateHubSpotPayload('contactCreate', properties),
          );
          summary.created.push({ id: created.id, email: properties.email || null });
          continue;
        }

        const existing = await contactRepository.findByEmail(properties.email);
        if (existing) {
          const updated = await contactRepository.update(existing.id, properties);
          summary.updated.push({ id: updated.id, email: properties.email });
        } else {
          const created = await contactRepository.create(properties);
          summary.created.push({ id: created.id, email: properties.email });
        }
      } catch (error) {
        const normalized = handleHubSpotErrors(error, {
          operation: 'syncContactsWithHubSpot',
          email: properties.email,
        });
        summary.errors.push({
          email: properties.email || null,
          message: normalized.message,
          type: normalized.type,
        });
      }
    }

    return summary;
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'syncContactsWithHubSpot' });
  }
}

/**
 * Idempotent deal sync. Unique key: explicit id, then dealname.
 */
async function syncDealsWithHubSpot(deals) {
  try {
    validateHubSpotPayload('syncDeals', { deals });
    const summary = { created: [], updated: [], skipped: [], errors: [] };

    for (const raw of deals) {
      const source = raw.properties || raw;
      const dealName = source.dealname;
      const amount = source.amount;
      try {
        if (source.id || source.hs_object_id) {
          const id = source.id || source.hs_object_id;
          const properties = toDealProperties(source);
          delete properties.dealname;
          const updated = await dealRepository.update(id, {
            ...properties,
            ...(dealName ? { dealname: dealName } : {}),
          });
          summary.updated.push({ id: updated.id, dealname: dealName });
          continue;
        }

        if (!dealName) {
          summary.skipped.push({ reason: 'missing dealname', source });
          continue;
        }

        const existing = await dealRepository.findByDealName(dealName);
        if (existing) {
          const updated = await dealRepository.update(existing.id, toDealProperties(source));
          summary.updated.push({ id: updated.id, dealname: dealName });
        } else {
          const created = await createHubSpotDeal(dealName, amount, {
            pipeline: source.pipeline,
            dealstage: source.dealstage,
            hs_pipeline: source.hs_pipeline,
            hs_stage: source.hs_stage,
            properties: toDealProperties(source),
          });
          summary.created.push({ id: created.id, dealname: dealName });
        }
      } catch (error) {
        const normalized = handleHubSpotErrors(error, {
          operation: 'syncDealsWithHubSpot',
          dealname: dealName,
        });
        summary.errors.push({
          dealname: dealName || null,
          message: normalized.message,
          type: normalized.type,
        });
      }
    }

    return summary;
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'syncDealsWithHubSpot' });
  }
}

async function getHubSpotAccount() {
  try {
    return await hubSpotClient.get('/account-info/v3/details', undefined, {
      operation: 'getHubSpotAccount',
    });
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'getHubSpotAccount' });
  }
}

async function getHubSpotDealPipelines() {
  try {
    return await hubSpotClient.pipelines.listDeals();
  } catch (error) {
    throw handleHubSpotErrors(error, { operation: 'getHubSpotDealPipelines' });
  }
}

const hubSpotService = {
  getHubSpotContactNames,
  getHubSpotContacts,
  createHubSpotContact,
  updateHubSpotContact,
  deleteHubSpotContact,
  getHubSpotDeals,
  createHubSpotDeal,
  updateHubSpotDeal,
  deleteHubSpotDeal,
  associateContactToDeal,
  syncContactsWithHubSpot,
  syncDealsWithHubSpot,
  getHubSpotAccount,
  getHubSpotDealPipelines,
};

module.exports = {
  hubSpotService,
  getHubSpotContactNames,
  getHubSpotContacts,
  createHubSpotContact,
  updateHubSpotContact,
  deleteHubSpotContact,
  getHubSpotDeals,
  createHubSpotDeal,
  updateHubSpotDeal,
  deleteHubSpotDeal,
  associateContactToDeal,
  syncContactsWithHubSpot,
  syncDealsWithHubSpot,
  getHubSpotAccount,
  getHubSpotDealPipelines,
};
