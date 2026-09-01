const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateHubSpotPayload, PayloadValidationError } = require('../src/utils/validateHubSpotPayload');

test('contact create requires an identity field', () => {
  assert.throws(() => validateHubSpotPayload('contactCreate', {}), PayloadValidationError);
  const properties = validateHubSpotPayload('contactCreate', { email: 'a@b.com' });
  assert.equal(properties.email, 'a@b.com');
});

test('deal create requires dealname and amount', () => {
  assert.throws(() => validateHubSpotPayload('dealCreate', { dealname: 'X' }), /amount/);
  const properties = validateHubSpotPayload('dealCreate', { dealname: 'X', amount: 10 });
  assert.equal(properties.dealname, 'X');
});

test('association requires both ids', () => {
  assert.throws(() => validateHubSpotPayload('association', { contactId: '1' }), /dealId/);
  const payload = validateHubSpotPayload('association', { contactId: '1', dealId: '2' });
  assert.equal(payload.dealId, '2');
});

test('sync payloads must be arrays', () => {
  assert.throws(() => validateHubSpotPayload('syncContacts', {}), /contacts/);
  const ok = validateHubSpotPayload('syncContacts', { contacts: [] });
  assert.deepEqual(ok.contacts, []);
});
