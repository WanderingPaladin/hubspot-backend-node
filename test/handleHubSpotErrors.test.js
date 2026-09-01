const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  handleHubSpotErrors,
  isRetryable,
  getRetryDelayMs,
} = require('../src/utils/handleHubSpotErrors');
const { PayloadValidationError } = require('../src/utils/validateHubSpotPayload');
const { redact } = require('../src/utils/logger');

function axiosError({ status, data, code, message, headers } = {}) {
  const error = new Error(message || 'request failed');
  error.code = code;
  if (status) {
    error.response = { status, data, headers: headers || {} };
  }
  return error;
}

test('401 is AUTH and not retryable', () => {
  const normalized = handleHubSpotErrors(axiosError({ status: 401, data: { message: 'invalid token' } }));
  assert.equal(normalized.type, 'AUTH');
  assert.equal(isRetryable(normalized), false);
});

test('429 is RATE_LIMIT and retryable with Retry-After', () => {
  const normalized = handleHubSpotErrors(
    axiosError({ status: 429, data: { message: 'slow down' }, headers: { 'retry-after': '2' } }),
  );
  assert.equal(normalized.type, 'RATE_LIMIT');
  assert.equal(normalized.retryable, true);
  assert.equal(normalized.retryAfterMs, 2000);
});

test('500 is SERVER and retryable', () => {
  const normalized = handleHubSpotErrors(axiosError({ status: 503, data: { message: 'unavailable' } }));
  assert.equal(normalized.type, 'SERVER');
  assert.equal(normalized.retryable, true);
});

test('400 is VALIDATION and not retryable', () => {
  const normalized = handleHubSpotErrors(axiosError({ status: 400, data: { message: 'bad property' } }));
  assert.equal(normalized.type, 'VALIDATION');
  assert.equal(normalized.retryable, false);
});

test('timeouts are NETWORK and retryable', () => {
  const normalized = handleHubSpotErrors(axiosError({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' }));
  assert.equal(normalized.type, 'NETWORK');
  assert.equal(normalized.retryable, true);
});

test('validation errors are not reclassified', () => {
  const original = new PayloadValidationError('no email', ['email']);
  const normalized = handleHubSpotErrors(original);
  assert.equal(normalized, original);
});

test('getRetryDelayMs honors Retry-After over exponential backoff', () => {
  assert.equal(getRetryDelayMs(0, 500, 4000), 4000);
  assert.ok(getRetryDelayMs(2, 500) >= 2000);
});

test('official SDK ApiException shape is classified the same way', () => {
  const sdkError = new Error('Too many requests');
  sdkError.code = 429;
  sdkError.body = { message: 'slow down' };
  sdkError.headers = { 'retry-after': '3' };
  const normalized = handleHubSpotErrors(sdkError);
  assert.equal(normalized.type, 'RATE_LIMIT');
  assert.equal(normalized.status, 429);
  assert.equal(normalized.retryAfterMs, 3000);
});

test('redact strips bearer tokens', () => {
  const hidden = redact({
    Authorization: 'Bearer pat-na1-secret',
    note: 'Bearer pat-na1-secret in text',
  });
  assert.equal(hidden.Authorization, '[REDACTED]');
  assert.doesNotMatch(hidden.note, /pat-na1-secret/);
});
