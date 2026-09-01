const path = require('path');
const { syncDealsWithHubSpot } = require('../services/hubSpotService');
const { runExample } = require('./_run');

const source = require(path.join(__dirname, '../data/deals.json'));

runExample('syncDealsWithHubSpot', async () => {
  return syncDealsWithHubSpot(source);
});
