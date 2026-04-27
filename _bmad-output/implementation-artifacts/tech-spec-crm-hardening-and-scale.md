# Tech Spec: CRM Commercial Module Hardening And Scale

## Status

- Proposed

## Why This Exists

- The CRM module is already usable as an internal commercial pipeline, but its current
  loading and interaction model is still optimized for a small dataset.
- Recent pagination work introduced a shared contract and first server-side support,
  but the pipeline UX still behaves like an in-memory board.
- Before expanding the module, the repository needs a clear specification for scale,
  operational consistency, and the next layer of CRM capabilities.

## Scope

- In scope:
  - lead listing and pipeline loading model
  - search and filtering behavior
  - server-side summaries and attention indicators
  - operational entities needed for commercial discipline
  - performance and coupling constraints for CRM evolution
- Out of scope:
  - full sales automation journeys
  - external marketing integrations
  - BI/reporting redesign outside CRM operational dashboards

## Source Context

- Code:
  - `apps/api/src/modules/crm/crm.controller.ts`
  - `apps/api/src/modules/crm/crm.service.ts`
  - `apps/web/src/features/crm/interface/LeadManagementPage.tsx`
  - `apps/web/src/features/crm/application/queries.ts`
  - `apps/web/src/features/crm/domain/model.ts`
  - `apps/web/src/features/crm/infrastructure/gateways/crm.gateway.ts`
  - `packages/contracts/src/crm/lead.types.ts`
  - `packages/database/prisma/schema.prisma`

## Current State

- The backend already supports paginated lead listing with the shared pagination contract.
- The frontend CRM page still loads only the first block of leads and computes search,
  board grouping, metrics, and attention filters entirely on the client.
- The lead model supports stage, owner, source, contacts, estimated values, next step,
  qualification notes, lost reason, and conversion target company.
- The CRM does not yet model first-class commercial activities, tasks, reminders,
  follow-up cadences, or an event timeline.

## Key Findings

1. The current board is functionally partial when the dataset grows beyond the first
   loaded page.
   - `getCrmLeadsData` loads `page=1&pageSize=100`.
   - `LeadManagementPage` derives stage counts, active counts, attention filters,
     and search results from `data.leads` only.
   - This causes the board to undercount and undersearch as soon as total leads exceed
     the first fetched slice.

2. Backend search is narrower than frontend expectations.
   - API search currently checks `title`, `companyName`, `tradeName`, and `city`.
   - The UI already treats contact name, owner name, next step, and lost reason as
     searchable concepts.
   - This mismatch blocks moving search behavior fully to the backend without UX drift.

3. CRM support data for contact linking is capped too early.
   - `support-data` currently returns at most 100 contacts and has no search or
     pagination strategy.
   - This will break lead creation/edit flows in larger customer datasets.

4. The domain is still lead-centric rather than pipeline-centric.
   - `nextStep` and `lostReason` exist as fields on the lead record.
   - There is no dedicated task/activity model to support follow-ups, reminders,
     ownership discipline, SLA-like cadence control, or auditability.

## Desired Outcome

- The CRM can operate correctly with larger lead volumes without misleading counts or
  incomplete search behavior.
- Pipeline UX remains fast, but it no longer depends on loading the full working set
  into memory.
- The module gains the minimum operational structures expected from larger CRMs:
  task discipline, structured reasons, summaries, and timeline visibility.

## Recommended Loading Model

- Use a hybrid strategy:
  - `page/pageSize` for administrative lists, closed leads, reports, and table views
  - incremental loading by stage/column for the active pipeline board
  - server-side summaries for counts, attention buckets, and pipeline totals
  - URL-driven filters and search state for reproducibility and refresh safety

- Rationale:
  - classic page pagination works well for CRUD grids
  - a commercial kanban does not scale well when treated as a single in-memory page
  - large CRMs typically separate list navigation from pipeline navigation

## Functional Requirements

- Lead listing:
  - support server-side filters for `q`, `stage`, `source`, `ownerUserId`, and status view
  - support server-side pagination for list views
- Pipeline board:
  - load active stages independently or in bounded blocks
  - return counts per stage regardless of how many cards are currently loaded
  - return attention summaries independent from the current client slice
- Search:
  - search must cover at least title, company name, trade name, document, contact name,
    owner name, city, next step, and lost reason
- Contact linking:
  - support searchable and paginated contact lookup for lead forms
- Stage transitions:
  - preserve optimistic UX, but back transitions with server-side rules
  - require structured reason for loss
  - prepare extension points for win reasons and validation checkpoints

## Non-Functional Requirements

- Performance:
  - the active board must not require full dataset hydration for normal navigation
  - list responses should remain bounded and predictable
- Consistency:
  - frontend counts and backend totals must represent the same filtered universe
- Evolvability:
  - CRM should not embed all operational state into the lead row itself
- Observability:
  - future activity/task/timeline actions should be traceable as explicit records

## Product-Level Refinements Required

1. Add pipeline summary endpoints.
   - counts by stage
   - overdue leads
   - leads without next step
   - leads due soon
   - pipeline value by active stage

2. Introduce commercial activity and task entities.
   - activity type
   - owner
   - due date
   - status
   - notes
   - lead reference

3. Standardize closure reasons.
   - structured loss reasons
   - optional structured win reasons
   - room for reporting by reason taxonomy

4. Separate board experience from archive experience.
   - active pipeline optimized for action
   - won/lost optimized for review, filtering, and analysis

5. Add timeline visibility.
   - lead created
   - stage changed
   - owner changed
   - proposal sent
   - task completed
   - lead lost or won

## Gaps To Address In Follow-Up Stories

1. Replace first-page-only board behavior with stage-aware incremental loading.
2. Move search semantics to the backend with parity to current UX expectations.
3. Add CRM summary contracts and API endpoints.
4. Add searchable contact lookup instead of fixed-size support data.
5. Model commercial tasks/activities as first-class entities.
6. Introduce structured transition rules for loss, win, and owner changes.

## Implementation Plan

1. Add a CRM summary contract and endpoint for counts and attention buckets.
2. Refactor the board to consume server-side summaries and filtered slices.
3. Expand `listLeads` search scope and align frontend filters to backend query params.
4. Replace `support-data` fixed contact block with searchable lookup.
5. Create follow-up stories for:
   - activity model
   - task model
   - timeline/audit model
   - structured closure reasons

## Files Likely To Change In Follow-Up Work

- `apps/api/src/modules/crm/crm.controller.ts`
- `apps/api/src/modules/crm/crm.service.ts`
- `apps/web/src/features/crm/interface/LeadManagementPage.tsx`
- `apps/web/src/features/crm/application/queries.ts`
- `apps/web/src/features/crm/infrastructure/gateways/crm.gateway.ts`
- `packages/contracts/src/crm/lead.types.ts`
- `packages/database/prisma/schema.prisma`

## Test Plan

- Add or extend coverage for:
  - server-side CRM search semantics
  - paginated lead listing with filters
  - summary/count endpoints
  - stage-based loading behavior
  - searchable contact lookup
- Manual verification:
  - compare board counts against database totals with more than 100 leads
  - verify overdue and no-next-step counters from backend summaries
  - verify search consistency between URL, API response, and rendered board

## Risks

- Continuing with client-only board logic will make the CRM appear correct while
  silently hiding records at scale.
- Adding tasks and activities later without a spec can create tight coupling between
  lead editing and commercial operations.
- Search expansion may require index review for acceptable performance.

## Open Questions

- Should the active pipeline use cursor pagination or independent `page/pageSize`
  windows per stage?
- Should won/lost remain in the same route as the active board or move to dedicated
  list/report screens?
- Which structured loss and win taxonomies are required by the commercial team?

## Definition Of Done

- BMad adaptation exists for CRM evolution and scale
- The repository has an explicit technical direction for CRM loading and refinement
- Future CRM stories can reference this document instead of restarting discovery
