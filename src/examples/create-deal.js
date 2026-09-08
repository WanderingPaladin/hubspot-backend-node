const { createHubSpotDeal } = require('../services/hubSpotService');
const { runExample } = require('./_run');

runExample('createHubSpotDeal', async () => {
  const deal = await createHubSpotDeal(`Assessment Deal ${Date.now()}`, 1500);
  return {
    id: deal.id,
    dealname: deal.properties?.dealname,
    amount: deal.properties?.amount,
    pipeline: deal.properties?.pipeline,
    dealstage: deal.properties?.dealstage,
  };
});
