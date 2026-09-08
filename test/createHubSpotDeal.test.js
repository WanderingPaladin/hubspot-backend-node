const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { config } = require('../src/config');
const { dealRepository } = require('../src/repositories/dealRepository');
const { hubSpotClient } = require('../src/clients/hubSpotClient');
const { createHubSpotDeal } = require('../src/services/hubSpotService');

function hubError(status, message, details) {
  const error = new Error(message);
  error.name = 'HubSpotError';
  error.status = status;
  error.type = 'VALIDATION';
  error.retryable = false;
  error.details = details;
  return error;
}

test('createHubSpotDeal stringifies amount and sends both property names', async () => {
  const create = mock.method(dealRepository, 'create', async (properties) => ({ id: '1', properties }));

  const result = await createHubSpotDeal('Assessment Deal', 1500);

  const sent = create.mock.calls[0].arguments[0];
  assert.equal(result.id, '1');
  assert.equal(sent.amount, '1500');
  assert.equal(sent.dealname, 'Assessment Deal');
  assert.equal(sent.pipeline, config.hubspot.pipelineId);
  assert.equal(sent.dealstage, config.hubspot.stageId);
  assert.equal(sent.hs_pipeline, config.hubspot.pipelineId);
  assert.equal(sent.hs_stage, config.hubspot.stageId);
  mock.restoreAll();
});

test('createHubSpotDeal strips hs_* after PROPERTY_DOESNT_EXIST', async () => {
  const create = mock.method(dealRepository, 'create', async (properties) => {
    if (properties.hs_pipeline) {
      throw hubError(400, 'HubSpot client error (400): PROPERTY_DOESNT_EXIST', {
        errors: [{ error: 'PROPERTY_DOESNT_EXIST', name: 'hs_pipeline' }],
      });
    }
    return { id: '2', properties };
  });

  const result = await createHubSpotDeal('N', 10);
  const retry = create.mock.calls[1].arguments[0];

  assert.equal(result.id, '2');
  assert.equal(create.mock.callCount(), 2);
  assert.equal(retry.hs_pipeline, undefined);
  assert.equal(retry.hs_stage, undefined);
  assert.equal(retry.pipeline, config.hubspot.pipelineId);
  assert.equal(retry.dealstage, config.hubspot.stageId);
  mock.restoreAll();
});

test('createHubSpotDeal resolves portal pipeline IDs after INVALID_OPTION', async () => {
  const create = mock.method(dealRepository, 'create', async (properties) => {
    if (properties.dealstage === config.hubspot.stageId) {
      throw hubError(400, 'Property values were not valid', {
        errors: [
          {
            error: 'INVALID_OPTION',
            name: 'dealstage',
            message:
              'appointmentscheduled is not a valid pipeline stage ID. Valid options are: pipelineId=123 : [1, 2]',
          },
        ],
      });
    }
    return { id: '3', properties };
  });
  mock.method(hubSpotClient.pipelines, 'listDeals', async () => ({
    results: [
      {
        id: '123',
        label: 'Sales',
        default: true,
        stages: [
          { id: '1', label: 'Appointment Scheduled', metadata: { isClosed: 'false', probability: '0.2' } },
          { id: '2', label: 'Closed lost', metadata: { isClosed: 'true', probability: '0.0' } },
        ],
      },
    ],
  }));

  const result = await createHubSpotDeal('N', 10);

  assert.equal(result.id, '3');
  assert.equal(result.properties.pipeline, '123');
  assert.equal(result.properties.dealstage, '1');
  assert.equal(result.properties.hs_pipeline, undefined);
  mock.restoreAll();
});
