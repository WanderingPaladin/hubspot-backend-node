const path = require('path');
const { syncContactsWithHubSpot } = require('../services/hubSpotService');
const { runExample } = require('./_run');

const source = require(path.join(__dirname, '../data/contacts.json'));

runExample('syncContactsWithHubSpot', async () => {
  return syncContactsWithHubSpot(source);
});
