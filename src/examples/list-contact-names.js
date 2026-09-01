const { getHubSpotContactNames } = require('../services/hubSpotService');
const { runExample } = require('./_run');

runExample('getHubSpotContactNames', async () => {
  const names = await getHubSpotContactNames();
  return { count: names.length, names };
});
