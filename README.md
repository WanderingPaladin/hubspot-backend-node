# HubSpot CRM Integration (Node.js)

Modular Node.js project that talks to a real HubSpot portal (Private App token) to manage Contacts, Deals, and Associations. It also includes the Section 1 Node.js fundamentals demos.

Mocks are not used for HubSpot. Every CRM function goes through `hubSpotClient`, which wraps the official `@hubspot/api-client`.

## Why this structure

Responsibilities are split so HubSpot transport, CRUD, business rules, and runnable examples do not live in one file:

| Folder | Role |
| --- | --- |
| `src/config` | Environment and defaults (`HUBSPOT_ACCESS_TOKEN`, pipeline/stage, timeouts) |
| `src/clients` | `hubSpotClient` — official `@hubspot/api-client` plus retries |
| `src/repositories` | `contactRepository` / `dealRepository` — object CRUD only |
| `src/services` | `hubSpotService` — named operations (list names, sync, associate) |
| `src/utils` | `validateHubSpotPayload`, `handleHubSpotErrors`, streams |
| `src/handlers` | `hubSpotApiHandler` — small Express API for the same operations |
| `src/examples` | One-command scripts (`node src/examples/create-contact.js`) |
| `src/fundamentals` | Callbacks, Promises/async-await, CommonJS modules |
| `src/data` | Local JSON sources for idempotent sync |
| `test` | Unit tests that do not need a HubSpot token |

The assessment names (`hubSpotClient`, `hubSpotService`, `contactRepository`, `dealRepository`, `validateHubSpotPayload`, `handleHubSpotErrors`, `hubSpotApiHandler`) map 1:1 to those files.

## Libraries

| Package | Why |
| --- | --- |
| `@hubspot/api-client` | Official HubSpot Node client for Contacts, Deals, Associations, and Pipelines |
| `dotenv` | Load `.env` without putting secrets in code |
| `express` | Optional `hubSpotApiHandler` HTTP surface |

Node.js built-ins used: `fs`, `stream`, `path`, `node:test`.

`hubSpotClient` uses the generated CRM APIs (`crm.contacts.basicApi`, `crm.deals.basicApi`, `crm.associations.v4`, `crm.pipelines`). `apiRequest` is only used for account-info. SDK built-in retries are turned off (`numberOfApiCallRetries: 0`) so `handleHubSpotErrors` owns the assessment policy: no retry on 401/403/4xx, exponential backoff + `Retry-After` on 429/5xx.

## Portal / hubId

This repository does not embed a portal id (that value belongs to the evaluator’s or candidate’s account).

After you add a token:

```bash
npm run example:account
```

The response includes `portalId` (hubId). You can also read it in HubSpot under **Settings → Account & Setup → Account defaults**, or from the account-info API:

`GET https://api.hubapi.com/account-info/v3/details`

Portal UI base URL: `https://app.hubspot.com/contacts/{portalId}`  
API base URL: `https://api.hubapi.com`

## Configure a Private App

1. In HubSpot, go to **Settings → Integrations → Private Apps**.
2. Create a private app (name it e.g. `node-crm-assessment`).
3. On the **Scopes** tab, enable at least:

   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`

   Optional but useful: `crm.schemas.contacts.read`, `crm.schemas.deals.read` (properties / pipelines).

4. Create the app and copy the **access token**. It looks like `pat-na1-...`.
5. Never commit the token. Put it in `.env` only.

Legacy `HUBSPOT_API_KEY` (hapikey) is accepted as an alias for the Bearer token if `HUBSPOT_ACCESS_TOKEN` is unset. HubSpot has sunset hapikeys; use a Private App token.

## Install and configure

```bash
npm install
cp .env.example .env
# edit .env and set HUBSPOT_ACCESS_TOKEN, plus pipeline/stage if your portal is not on defaults
```

`.env.example` variables:

- `HUBSPOT_ACCESS_TOKEN` (or `HUBSPOT_API_KEY`)
- `HUBSPOT_API_BASE_URL` (default `https://api.hubapi.com`)
- `HUBSPOT_PIPELINE_ID` (official deal property `pipeline`)
- `HUBSPOT_STAGE_ID` (official deal property `dealstage`)
- `HUBSPOT_TIMEOUT_MS`, `HUBSPOT_MAX_RETRIES`, `HUBSPOT_RETRY_BASE_MS`
- `PORT` for the Express handler

Default pipeline/stage values (`default` / `appointmentscheduled`) match a stock HubSpot sales pipeline. If create-deal fails with a property error, list pipelines:

`GET /crm/v3/pipelines/deals`  
and put a real `pipeline` id and `dealstage` id in `.env`.

## Run

### Section 1 — Node.js fundamentals

```bash
npm run fundamentals:callbacks
npm run fundamentals:async
npm run fundamentals:modules
npm run fundamentals:streams
```

### Section 2 — HubSpot examples (real API calls)

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

Or directly:

```bash
node src/examples/create-contact.js
node src/examples/create-deal.js
node src/examples/associate-contact-deal.js
```

### Express handler

```bash
npm start
```

Then:

```bash
curl -s http://localhost:3000/health
curl -s http://localhost:3000/contacts/names
curl -s http://localhost:3000/contacts?limit=5
curl -s -X POST http://localhost:3000/deals \
  -H 'Content-Type: application/json' \
  -d '{"dealName":"API Deal","amount":1500}'
```

### Tests (no HubSpot token required)

```bash
npm test
```

## Required functions

All of these live in `src/services/hubSpotService.js` and perform real HTTP calls:

| Function | HubSpot call |
| --- | --- |
| `getHubSpotContactNames` | Paginated `GET /crm/v3/objects/contacts` → `["First Last", ...]` |
| `getHubSpotContacts` | Paginated list; optional `email` filter via `idProperty=email` |
| `createHubSpotContact` | `POST /crm/v3/objects/contacts` |
| `updateHubSpotContact` | `PATCH /crm/v3/objects/contacts/{id}` |
| `deleteHubSpotContact` | `DELETE /crm/v3/objects/contacts/{id}` |
| `getHubSpotDeals` | Paginated `GET /crm/v3/objects/deals` |
| `createHubSpotDeal(dealName, amount)` | `POST /crm/v3/objects/deals` with `dealname`, `amount`, `hs_pipeline`, `hs_stage` (and official `pipeline` / `dealstage`) |
| `updateHubSpotDeal` | `PATCH /crm/v3/objects/deals/{id}` |
| `deleteHubSpotDeal` | `DELETE /crm/v3/objects/deals/{id}` |
| `associateContactToDeal` | Idempotent `PUT` v4 default association; v3 fallback typeId `4` (Contact to deal) |
| `syncContactsWithHubSpot` | Local JSON → create/update by `email` |
| `syncDealsWithHubSpot` | Local JSON → create/update by `id` or `dealname` |

## Official documentation (endpoints used)

| Area | Docs | REST path |
| --- | --- | --- |
| Contacts | https://developers.hubspot.com/docs/api/crm/contacts | `/crm/v3/objects/contacts` |
| Contact search / email id | same guide (`idProperty=email`, `/search`) | `/crm/v3/objects/contacts/{email}?idProperty=email` |
| Deals | https://developers.hubspot.com/docs/api-reference/latest/crm/objects/deals/guide | `/crm/v3/objects/deals` |
| Deal search | same guide + CRM search | `/crm/v3/objects/deals/search` |
| Associations | https://developers.hubspot.com/docs/api-reference/legacy/crm/associations/associate-records/guide | `PUT /crm/v4/objects/contacts/{id}/associations/default/deals/{id}` |
| Associations (typed) | same guide (Contact to deal = typeId **4**) | `PUT /crm/v3/objects/contacts/{id}/associations/deals/{id}/4` |
| Pipelines | https://developers.hubspot.com/docs/api/crm/pipelines | `GET /crm/v3/pipelines/deals` |
| Properties | https://developers.hubspot.com/docs/api/crm/properties | `GET /crm/v3/properties/deals` |
| Account / portalId | https://developers.hubspot.com/docs/api-reference/account-management-account-info-v3/guide | `GET /account-info/v3/details` |
| Usage / rate limits | https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines | HTTP `429` + `Retry-After` |

Pagination follows the contacts guide: read `paging.next.after` and send it as `after` on the next `GET`. Max page size is 100.

## Deal properties: `hs_pipeline` / `hs_stage`

The brief asks for `properties.dealname`, `properties.amount`, `hs_pipeline`, and `hs_stage` on create.

Official deal properties are `dealname`, `amount`, `pipeline`, and `dealstage` (see the Deals API guide). `createHubSpotDeal` sends **both** pairs, populated from `HUBSPOT_PIPELINE_ID` / `HUBSPOT_STAGE_ID`. If HubSpot rejects `hs_pipeline` / `hs_stage` as unknown, the client retries once with only the official names.

## Associations and idempotency

`associateContactToDeal(contactId, dealId)` (via `@hubspot/api-client`):

1. `crm.associations.v4.basicApi.getPage('contacts', contactId, 'deals')` — if the deal is already linked, return success without writing.
2. Otherwise `createDefault('contacts', contactId, 'deals', dealId)` (unlabeled default association; safe to repeat).
3. Fallback: `create(..., [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: AssociationTypes.contactToDeal }])` (typeId **4**).

Sync is idempotent by unique key (`email` for contacts, `id` then `dealname` for deals): existing records are patched; missing records are created.

## Error handling

`handleHubSpotErrors` classifies failures and `hubSpotClient` retries when `retryable` is true (exponential backoff + jitter, or `Retry-After` on 429). Tokens and `Authorization` headers are never logged (`src/utils/logger.js`).

| Case | HTTP / code | Retry | Notes |
| --- | --- | --- | --- |
| Network / timeout | `ECONNABORTED`, `ETIMEDOUT`, `ECONNRESET`, … | Yes | No HTTP status from the SDK / transport |
| Auth | 401 / 403 | No | Check token and scopes |
| Validation / not found | 400 / 404 / other 4xx | No | Payload or missing record |
| Rate limit | 429 | Yes | Honor `Retry-After` |
| Server | 5xx | Yes | Backoff, then fail |

Every service method wraps calls in `try/catch` and rethrows a normalized `HubSpotError`.

## Technical decisions

- **CommonJS** for the whole project so Section 1 (`utils_module.js` / `main.js`) and HubSpot code share one module system.
- **Official `@hubspot/api-client`** for Contacts, Deals, Associations, and Pipelines so calls match HubSpot’s generated API.
- **Custom retries on top of the SDK** (`numberOfApiCallRetries: 0`) so 401/403 never retry and 429 honors `Retry-After`.
- **Repositories vs service**: repositories only call the client; the service owns pagination loops, name formatting, sync, and association idempotency.
- **Bearer Private App token** is the supported auth method (current HubSpot recommendation).
- **Example scripts** create clearly prefixed test data (`riley.assessment+…@example.com`) so a portal can be cleaned up after evaluation.

## Project layout

```
src/
  clients/hubSpotClient.js
  config/index.js
  data/contacts.json
  data/deals.json
  examples/
  fundamentals/          callbacks.js, asyncAwait.js, utils_module.js, main.js
  handlers/hubSpotApiHandler.js
  repositories/contactRepository.js
  repositories/dealRepository.js
  services/hubSpotService.js
  utils/handleHubSpotErrors.js
  utils/validateHubSpotPayload.js
  utils/streams.js
  utils/logger.js
test/
.env.example
```
