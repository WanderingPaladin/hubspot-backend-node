const { createHubSpotContact } = require('../services/hubSpotService');
const { runExample } = require('./_run');

const stamp = Date.now();

runExample('createHubSpotContact', async () => {
  return createHubSpotContact({
    email: `riley.assessment+${stamp}@example.com`,
    firstname: 'Riley',
    lastname: 'Assessment',
    company: 'HubSpot Node Assessment',
  });
});
