const { test } = require('node:test');
const assert = require('node:assert/strict');

test('assessment-named functions and modules exist', () => {
  const service = require('../src/services/hubSpotService');
  for (const name of [
    'getHubSpotContactNames',
    'getHubSpotContacts',
    'createHubSpotContact',
    'updateHubSpotContact',
    'deleteHubSpotContact',
    'getHubSpotDeals',
    'createHubSpotDeal',
    'updateHubSpotDeal',
    'deleteHubSpotDeal',
    'associateContactToDeal',
    'syncContactsWithHubSpot',
    'syncDealsWithHubSpot',
    'hubSpotService',
  ]) {
    assert.equal(typeof service[name], name === 'hubSpotService' ? 'object' : 'function', name);
  }

  const { hubSpotClient } = require('../src/clients/hubSpotClient');
  assert.equal(typeof hubSpotClient.request, 'function');
  assert.equal(typeof hubSpotClient.getSdk, 'function');
  assert.equal(typeof hubSpotClient.contacts.create, 'function');
  assert.equal(typeof hubSpotClient.deals.create, 'function');
  assert.equal(typeof hubSpotClient.associations.createDefaultContactToDeal, 'function');
  assert.equal(typeof require('../src/repositories/contactRepository').contactRepository.create, 'function');
  assert.equal(typeof require('../src/repositories/dealRepository').dealRepository.create, 'function');
  assert.equal(typeof require('../src/utils/validateHubSpotPayload').validateHubSpotPayload, 'function');
  assert.equal(typeof require('../src/utils/handleHubSpotErrors').handleHubSpotErrors, 'function');
  assert.equal(typeof require('../src/handlers/hubSpotApiHandler').hubSpotApiHandler, 'function');
});
