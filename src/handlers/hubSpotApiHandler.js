const express = require('express');
const { hubSpotService } = require('../services/hubSpotService');
const { logError, logInfo } = require('../utils/logger');
const { config } = require('../config');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function createHubSpotApiHandler() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'hubspot-backend-node' });
  });

  app.get(
    '/account',
    asyncHandler(async (_req, res) => {
      const account = await hubSpotService.getHubSpotAccount();
      res.json(account);
    }),
  );

  app.get(
    '/contacts/names',
    asyncHandler(async (_req, res) => {
      const names = await hubSpotService.getHubSpotContactNames();
      res.json({ count: names.length, names });
    }),
  );

  app.get(
    '/contacts',
    asyncHandler(async (req, res) => {
      const contacts = await hubSpotService.getHubSpotContacts({
        email: req.query.email,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        after: req.query.after,
      });
      res.json(contacts);
    }),
  );

  app.post(
    '/contacts',
    asyncHandler(async (req, res) => {
      const contact = await hubSpotService.createHubSpotContact(req.body);
      res.status(201).json(contact);
    }),
  );

  app.patch(
    '/contacts/:id',
    asyncHandler(async (req, res) => {
      const contact = await hubSpotService.updateHubSpotContact(req.params.id, req.body.properties || req.body);
      res.json(contact);
    }),
  );

  app.delete(
    '/contacts/:id',
    asyncHandler(async (req, res) => {
      const result = await hubSpotService.deleteHubSpotContact(req.params.id);
      res.json(result);
    }),
  );

  app.get(
    '/deals',
    asyncHandler(async (req, res) => {
      const deals = await hubSpotService.getHubSpotDeals({
        dealname: req.query.dealname,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        after: req.query.after,
      });
      res.json(deals);
    }),
  );

  app.post(
    '/deals',
    asyncHandler(async (req, res) => {
      const { dealName, dealname, amount, ...options } = req.body;
      const deal = await hubSpotService.createHubSpotDeal(dealName || dealname, amount, options);
      res.status(201).json(deal);
    }),
  );

  app.patch(
    '/deals/:id',
    asyncHandler(async (req, res) => {
      const deal = await hubSpotService.updateHubSpotDeal(req.params.id, req.body.properties || req.body);
      res.json(deal);
    }),
  );

  app.delete(
    '/deals/:id',
    asyncHandler(async (req, res) => {
      const result = await hubSpotService.deleteHubSpotDeal(req.params.id);
      res.json(result);
    }),
  );

  app.post(
    '/associations/contact-deal',
    asyncHandler(async (req, res) => {
      const result = await hubSpotService.associateContactToDeal(req.body.contactId, req.body.dealId);
      res.json(result);
    }),
  );

  app.post(
    '/sync/contacts',
    asyncHandler(async (req, res) => {
      const result = await hubSpotService.syncContactsWithHubSpot(req.body.contacts || req.body);
      res.json(result);
    }),
  );

  app.post(
    '/sync/deals',
    asyncHandler(async (req, res) => {
      const result = await hubSpotService.syncDealsWithHubSpot(req.body.deals || req.body);
      res.json(result);
    }),
  );

  app.use((error, _req, res, _next) => {
    const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    logError('hubSpotApiHandler request failed', {
      type: error.type,
      status,
      message: error.message,
    });
    res.status(status).json({
      error: error.message,
      type: error.type || 'UNKNOWN',
    });
  });

  return app;
}

function startHubSpotApiHandler() {
  const app = createHubSpotApiHandler();
  app.listen(config.server.port, () => {
    logInfo(`hubSpotApiHandler listening on http://localhost:${config.server.port}`);
  });
  return app;
}

if (require.main === module) {
  startHubSpotApiHandler();
}

module.exports = { createHubSpotApiHandler, startHubSpotApiHandler, hubSpotApiHandler: createHubSpotApiHandler };
