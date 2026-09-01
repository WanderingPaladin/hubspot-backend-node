const { getHubSpotContacts } = require('../services/hubSpotService');
const { runExample } = require('./_run');

runExample('getHubSpotContacts (first page)', async () => {
  return getHubSpotContacts({ limit: 10 });
});
