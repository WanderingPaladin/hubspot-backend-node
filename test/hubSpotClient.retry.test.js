const { test, mock } = require('node:test');
const assert = require('node:assert/strict');

test('hubSpotClient retries 429 then returns data', async () => {
  const { config } = require('../src/config');
  config.hubspot.accessToken = 'test-token';
  config.hubspot.maxRetries = 3;
  config.hubspot.retryBaseMs = 1;

  const { hubSpotClient } = require('../src/clients/hubSpotClient');
  const getPage = mock.fn(async () => {
    if (getPage.mock.callCount() < 2) {
      const error = new Error('rate limited');
      error.code = 429;
      error.body = { message: 'slow down' };
      error.headers = { 'retry-after': '0' };
      throw error;
    }
    return { results: [{ id: 'ok' }] };
  });

  mock.method(hubSpotClient, 'getSdk', () => ({
    crm: { contacts: { basicApi: { getPage } } },
  }));

  const result = await hubSpotClient.contacts.list({ limit: 10 });

  assert.equal(result.results[0].id, 'ok');
  assert.ok(getPage.mock.callCount() >= 2);
  mock.restoreAll();
});
