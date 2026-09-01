const { createHubSpotDeal } = require('../services/hubSpotService');
const { runExample } = require('./_run');

runExample('createHubSpotDeal', async () => {
  return createHubSpotDeal(`Assessment Deal ${Date.now()}`, 1500);
});
