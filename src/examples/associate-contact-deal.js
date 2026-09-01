const {
  createHubSpotContact,
  createHubSpotDeal,
  associateContactToDeal,
} = require('../services/hubSpotService');
const { runExample } = require('./_run');

runExample('associateContactToDeal', async () => {
  const stamp = Date.now();
  const contact = await createHubSpotContact({
    email: `riley.assessment.assoc+${stamp}@example.com`,
    firstname: 'Assoc',
    lastname: 'Contact',
  });
  const deal = await createHubSpotDeal(`Assessment Assoc Deal ${stamp}`, 900);
  const first = await associateContactToDeal(contact.id, deal.id);
  const second = await associateContactToDeal(contact.id, deal.id);
  return { contactId: contact.id, dealId: deal.id, first, second };
});
