const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

test('hubSpotClient retries 429 then returns data', async () => {
  const axios = require('axios');
  const request = mock.fn(async () => {
    if (request.mock.callCount() < 2) {
      const error = new Error('rate limited');
      error.response = { status: 429, data: { message: 'slow down' }, headers: { 'retry-after': '0' } };
      throw error;
    }
    return { data: { id: 'ok' } };
  });

  mock.method(axios, 'create', () => ({ request }));

  const { config } = require('../src/config');
  config.hubspot.accessToken = 'test-token';
  config.hubspot.maxRetries = 3;
  config.hubspot.retryBaseMs = 1;

  const { hubSpotClient } = require('../src/clients/hubSpotClient');
  const result = await hubSpotClient.get('/crm/v3/objects/contacts');

  assert.equal(result.id, 'ok');
  assert.ok(request.mock.callCount() >= 2);
  mock.restoreAll();
});
