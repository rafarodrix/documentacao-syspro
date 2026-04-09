# Tech Spec: Chatwoot And Evolution Integration Hardening

## Status

- Proposed

## Why This Exists

- The Chatwoot <-> Evolution path is now a critical operational integration.
- The repository already has controller logic, context resolution, Prisma persistence,
  and internal docs, but the real behavior is split across code and documentation.
- This flow needs a tighter specification before more changes are made so future
  implementation work stays consistent.

## Scope

- In scope:
  - webhook validation and trust boundaries
  - integration context resolution rules
  - message processing expectations for Chatwoot webhook events
  - contact synchronization side effects
  - logging and operational diagnostics
- Out of scope:
  - replacing Chatwoot or Evolution vendors
  - redesigning the full contacts domain
  - frontend portal UX changes outside integration diagnostics

## Source Context

- Docs:
  - `apps/web/content/docs/manuais-tecnicos/integrações/evolutiongo-chatwoot.mdx`
  - `apps/web/content/docs/manuais-tecnicos/backlog-e-pendencias/backlog-infra-monorepo.mdx`
- Code:
  - `apps/api/src/modules/integrations/chatwoot/chatwoot-webhook.controller.ts`
  - `apps/api/src/modules/settings/integration-context.service.ts`
  - `apps/api/src/modules/contacts/contacts.service.ts`
  - `apps/api/src/modules/settings/integration-connections.service.ts`

## Current State

- `ChatwootWebhookController` already validates HMAC signature and timestamp when a
  webhook secret exists for the resolved integration context.
- `IntegrationContextService` resolves Chatwoot context using account ID, inbox ID,
  and inbox identifier with env fallback.
- `message_created` is handed off to the outgoing-message use case.
- `contact_created` and `contact_updated` may write to local contact tables.
- Logging exists, but the operational contract is still implicit and not fully
  described as a stable spec.

## Desired Outcome

- The integration has an explicit technical contract for incoming webhook handling.
- Future changes can be implemented against a stable checklist instead of ad hoc edits.
- Security, replay protection, context resolution, and side effects are documented as
  first-class requirements.

## Functional Requirements

- Resolve the integration connection from webhook payload fields in this order:
  - account match
  - inbox ID match
  - inbox identifier match
  - fallback candidate only when no stronger discriminator exists
- For `message_created`:
  - validate signature when secret is configured
  - reject stale timestamps
  - reject missing raw body when signature validation is required
  - hand off payload to the message processing use case with resolved connection context
- For `contact_updated`:
  - update the local contact name only when a linked conversation/contact mapping exists
- For `contact_created`:
  - create a pending local contact only when the normalized phone number does not exist
- For unsupported events:
  - log and ignore without failing the webhook endpoint

## Non-Functional Requirements

- Security:
  - all signature comparisons must remain timing-safe
  - replay window must stay bounded by configurable max skew
- Observability:
  - every critical stage should emit structured logs with flow, stage, event, and key IDs
- Resilience:
  - non-applicable events should not create operational noise or retries
- Consistency:
  - docs and code should describe the same trust and routing model

## Data And Contract Notes

- Chatwoot webhook routing depends on:
  - `account.id` or `account_id`
  - `inbox.id` or `inbox_id`
  - `inbox.identifier` or related conversation metadata
- Secret material may come from:
  - persisted `integrationConnection`
  - env fallback runtime config
- Contact sync currently depends on:
  - `conversationLink.chatwootContactId`
  - `conversationLink.whatsappNumber`
  - `companyContact.whatsapp`

## Gaps To Address In Follow-Up Stories

1. Define idempotency behavior for duplicate `message_created` deliveries.
2. Standardize normalized event payload typing instead of relying on broad `any`.
3. Clarify whether the official architecture is still backend-orchestrated for both
   directions or partially delegated to native Evolution Chatwoot integration.
4. Add explicit operational runbook for debugging signature mismatch, stale timestamp,
   and missing connection resolution.
5. Decide whether contact sync belongs in the webhook controller or should move behind
   dedicated application services.

## Implementation Plan

1. Freeze this spec as the working contract for the integration.
2. Review code against each requirement before new feature work.
3. Create follow-up stories for:
   - payload typing
   - idempotency
   - observability metrics
   - doc/code alignment
4. Implement the follow-up stories in small slices with targeted verification.

## Files Likely To Change In Follow-Up Work

- `apps/api/src/modules/integrations/chatwoot/chatwoot-webhook.controller.ts`
- `apps/api/src/modules/settings/integration-context.service.ts`
- `apps/api/src/modules/contacts/contacts.service.ts`
- `apps/web/content/docs/manuais-tecnicos/integrações/evolutiongo-chatwoot.mdx`

## Test Plan

- Add or extend controller/service coverage for:
  - valid signature
  - invalid signature
  - stale timestamp
  - missing raw body
  - connection resolution by account/inbox/inbox identifier
  - contact create/update side effects
- Manual verification:
  - send representative Chatwoot webhook payloads
  - confirm structured logs for each major stage
  - confirm ignored events return success without side effects

## Risks

- Existing docs may no longer match the current code path in both directions.
- Multi-connection resolution can drift if payload assumptions change upstream.
- Contact sync behavior may produce hidden coupling between integration and contacts domain.

## Open Questions

- Should duplicate webhook delivery be tolerated by idempotent persistence or by a
  deduplication table?
- Which document becomes the official source of truth for the final architecture:
  backend-orchestrated flow, native Evolution flow, or a hybrid?
- Should contact synchronization be expanded into a dedicated sync service?

## Definition Of Done

- BMad adaptation exists in the repository
- This integration has a first concrete technical spec
- Future stories can reference these artifacts instead of restarting discovery from zero
