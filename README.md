# hubspot-backend-node

This is the Node.js + HubSpot take-home. Contacts, deals, associations. Real API calls, not mocks.

Section 1 (callbacks, promises, CommonJS, streams) is under `src/fundamentals/` and `src/utils/streams.js`. Everything else talks to HubSpot through `hubSpotClient`.

I used `@hubspot/api-client` because that's the official client. Also `dotenv` and `express`. Built-ins for the rest (`fs`, `stream`, `path`, `node:test`).

## Layout

The brief said not to submit a single `.js` file, which I wouldn't have done anyway. Split by what each piece is responsible for:

```
src/
  config/          token, pipeline, timeouts — from env
  clients/         hubSpotClient (SDK + retries)
  repositories/    contactRepository, dealRepository (CRUD only)
  services/        hubSpotService (the named functions from the test)
  utils/           validateHubSpotPayload, handleHubSpotErrors, streams, logger
  handlers/        hubSpotApiHandler — small Express app if you want HTTP
  examples/        node src/examples/create-contact.js etc.
  fundamentals/    callbacks.js, asyncAwait.js, utils_module.js, main.js
  data/            local JSON for the sync scripts
test/              unit tests, no token needed
.env.example
```

`hubSpotClient` / `hubSpotService` / `contactRepository` / `dealRepository` / `validateHubSpotPayload` / `handleHubSpotErrors` / `hubSpotApiHandler` are the names from the test. That's not a coincidence.

Repositories just call the client. The service does pagination, name formatting, sync, and the association "already linked?" check. I turned the SDK's own retries off (`numberOfApiCallRetries: 0`) so 401/403 never retry and 429 uses `Retry-After`. That's in `handleHubSpotErrors`.

CommonJS everywhere. Section 1 asked for `utils_module.js` / `main.js` that way, and I didn't want two module systems in one repo.

## Private app

Use your own HubSpot portal. I didn't bake a hubId into this repo.

1. HubSpot → Settings → Integrations → Private Apps
2. New app, whatever name
3. Scopes I used:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
   - optional: `crm.schemas.contacts.read`, `crm.schemas.deals.read` if you want properties/pipelines
4. Copy the token (`pat-na1-...`). Put it in `.env`. Don't commit it.

`HUBSPOT_API_KEY` still works as a fallback if `HUBSPOT_ACCESS_TOKEN` isn't set. HubSpot killed hapikeys though — use a private app token.

After the token is in `.env`:

```bash
npm run example:account
```

That returns `portalId`. Same value as Settings → Account & Setup → Account defaults, or `GET https://api.hubapi.com/account-info/v3/details`.

UI: `https://app.hubspot.com/contacts/{portalId}`  
API: `https://api.hubapi.com`

## Install

```bash
npm install
cp .env.example .env
```

Then edit `.env`:

- `HUBSPOT_ACCESS_TOKEN` (or `HUBSPOT_API_KEY`)
- `HUBSPOT_API_BASE_URL` — leave it at `https://api.hubapi.com`
- `HUBSPOT_PIPELINE_ID` / `HUBSPOT_STAGE_ID` — stock portals are usually `default` / `appointmentscheduled`. If create-deal blows up, hit `GET /crm/v3/pipelines/deals` and paste real ids
- `HUBSPOT_TIMEOUT_MS`, `HUBSPOT_MAX_RETRIES`, `HUBSPOT_RETRY_BASE_MS`
- `PORT` if you run the Express handler (3000 by default)

## Run

Fundamentals:

```bash
npm run fundamentals:callbacks
npm run fundamentals:async
npm run fundamentals:modules
npm run fundamentals:streams
```

HubSpot (needs a token):

```bash
npm run example:account
npm run example:list-contact-names
npm run example:list-contacts
npm run example:create-contact
npm run example:list-deals
npm run example:create-deal
npm run example:associate
npm run example:sync-contacts
npm run example:sync-deals
```

Same thing without the npm scripts:

```bash
node src/examples/create-contact.js
node src/examples/create-deal.js
node src/examples/associate-contact-deal.js
```

The create/sync examples use emails like `riley.assessment+…@example.com` so they're easy to find and delete later.

Express:

```bash
npm start
```

```bash
curl -s http://localhost:3000/health
curl -s http://localhost:3000/contacts/names
curl -s http://localhost:3000/contacts?limit=5
curl -s -X POST http://localhost:3000/deals \
  -H 'Content-Type: application/json' \
  -d '{"dealName":"API Deal","amount":1500}'
```

Tests (no HubSpot):

```bash
npm test
```

## Functions from the test

All in `src/services/hubSpotService.js`. They hit HubSpot for real.

- `getHubSpotContactNames` — every contact, paginated, returns `["First Last", ...]`
- `getHubSpotContacts` — one page (`limit` / `after`), optional `email` filter
- `createHubSpotContact` — POST
- `updateHubSpotContact` — PATCH
- `deleteHubSpotContact` — DELETE (HubSpot archives the record)
- `getHubSpotDeals` — paginated list
- `createHubSpotDeal(dealName, amount)` — POST `dealname`, `amount`, `hs_pipeline`, `hs_stage`
- `updateHubSpotDeal` — PATCH
- `deleteHubSpotDeal` — DELETE / archive
- `associateContactToDeal` — v4 default association; typeId 4 if that fails
- `syncContactsWithHubSpot` — local JSON, match on email, create or update
- `syncDealsWithHubSpot` — same idea, id then dealname

The test asked for `hs_pipeline` / `hs_stage` on deal create. HubSpot's actual property names are `pipeline` and `dealstage`. I send both, from `HUBSPOT_PIPELINE_ID` / `HUBSPOT_STAGE_ID`. If HubSpot 400s on the `hs_*` ones, I retry with only `pipeline` / `dealstage`.

Associations: look up existing links first. If the contact is already on that deal, skip. Otherwise `createDefault`. Fallback is typeId 4 (`AssociationTypes.contactToDeal`).

Sync: email for contacts, id then dealname for deals. Exists → patch. Doesn't → create.

## Errors

`handleHubSpotErrors` normalizes whatever came back. `hubSpotClient` retries when `retryable` is true. Logger strips tokens / Authorization (`src/utils/logger.js`).

- network / timeout (`ECONNABORTED`, `ETIMEDOUT`, …) → retry
- 401 / 403 → don't retry, check the token and scopes
- 400 / 404 / other 4xx → don't retry
- 429 → retry, honor `Retry-After`
- 5xx → backoff, then give up

Service methods are all try/catch. Failures come out as `HubSpotError`.

## Docs I used

Pagination is `paging.next.after` on the next GET. Max page size 100.

- Contacts — https://developers.hubspot.com/docs/api/crm/contacts — `/crm/v3/objects/contacts`
- Contact by email — same guide, `idProperty=email`
- Deals — https://developers.hubspot.com/docs/api-reference/latest/crm/objects/deals/guide — `/crm/v3/objects/deals`
- Deal search — `/crm/v3/objects/deals/search`
- Associations — https://developers.hubspot.com/docs/api-reference/legacy/crm/associations/associate-records/guide — `PUT /crm/v4/objects/contacts/{id}/associations/default/deals/{id}`
- Typed association (contact → deal = typeId 4) — `PUT /crm/v3/objects/contacts/{id}/associations/deals/{id}/4`
- Pipelines — https://developers.hubspot.com/docs/api/crm/pipelines — `GET /crm/v3/pipelines/deals`
- Properties — https://developers.hubspot.com/docs/api/crm/properties — `GET /crm/v3/properties/deals`
- Account / portalId — https://developers.hubspot.com/docs/api-reference/account-management-account-info-v3/guide — `GET /account-info/v3/details`
- Rate limits — https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines — 429 + `Retry-After`
