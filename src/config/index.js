const path = require('path');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

function readToken() {
  return (
    process.env.HUBSPOT_ACCESS_TOKEN ||
    process.env.HUBSPOT_API_KEY ||
    ''
  ).trim();
}

const config = {
  hubspot: {
    accessToken: readToken(),
    apiBaseUrl: (process.env.HUBSPOT_API_BASE_URL || 'https://api.hubapi.com').replace(/\/$/, ''),
    pipelineId: process.env.HUBSPOT_PIPELINE_ID || 'default',
    stageId: process.env.HUBSPOT_STAGE_ID || 'appointmentscheduled',
    timeoutMs: Number(process.env.HUBSPOT_TIMEOUT_MS) || 15000,
    maxRetries: Number(process.env.HUBSPOT_MAX_RETRIES) || 4,
    retryBaseMs: Number(process.env.HUBSPOT_RETRY_BASE_MS) || 500,
  },
  server: {
    port: Number(process.env.PORT) || 3000,
  },
};

module.exports = { config };
