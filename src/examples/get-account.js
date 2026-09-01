const { getHubSpotAccount } = require('../services/hubSpotService');
const { runExample } = require('./_run');

runExample('HubSpot account / portal', async () => {
  const account = await getHubSpotAccount();
  return {
    portalId: account.portalId,
    accountType: account.accountType,
    timeZone: account.timeZone,
    utcOffset: account.utcOffset,
    note: 'portalId is the hubId. Use it in the README submission.',
  };
});
