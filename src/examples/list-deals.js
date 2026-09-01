const { getHubSpotDeals } = require('../services/hubSpotService');
const { runExample } = require('./_run');

runExample('getHubSpotDeals (first page)', async () => {
  return getHubSpotDeals({ limit: 10 });
});
