# Project Context

This file adapts the BMad `project-context.md` pattern to the Trilink Syspro workspace.
It is the compact implementation guide that AI agents should load before proposing or
writing code in this repository.

## Project Type

- Existing monorepo in active evolution.
- Primary runtimes:
  - `apps/web`: Next.js 15 portal + docs + operational flows
  - `apps/api`: NestJS HTTP shell for backend and integrations
  - `packages/*`: shared contracts, domain, database, utilities, UI

## Technology Stack And Versions

- Node.js workspace managed by `npm`
- TypeScript 5.x
- Next.js 15 + React 19 in `apps/web`
- NestJS in `apps/api`
- Prisma 5.x for persistence
- Zod for boundary schemas where contracts stabilize
- Vitest for unit/integration coverage
- Playwright for E2E coverage in `apps/web`

## Repository Priorities

- Keep the current monorepo evolution incremental.
- Do not force premature extraction just because a package boundary exists.
- Respect the documented staged architecture:
  - disciplined modular monolith
  - structural monorepo
  - domain extraction
  - multi-app expansion

Primary architectural source:

- `apps/web/content/docs/manuais-tecnicos/documentacao-tecnica-arquitetura/arquitetura/arquitetura-aplicacao-monorepo.mdx`

Primary backlog source:

- `apps/web/content/docs/manuais-tecnicos/backlog-e-pendencias/backlog-infra-monorepo.mdx`

## Critical Implementation Rules

### Code Organization

- Business rules do not live inside React components.
- In `apps/web`, feature code belongs in `src/features/<feature>`.
- In `apps/api`, keep transport, orchestration, and external integration concerns separated.
- Shared contracts and reusable pure logic should move to `packages/*` only when stable.
- Avoid duplicate flows across `apps/web`, `apps/api`, and future `apps/mobile`.

### Repository Structure Targets

- `apps/web`: UI, admin, portal, docs, and legacy BFF behavior still in transition
- `apps/api`: central backend runtime in NestJS
- `apps/mobile`: mobile shell/app runtime
- `packages/*`: shared contracts, domain, persistence, utilities, and UI primitives

### Naming Conventions

- React components: `PascalCase.tsx`
- Hooks, actions, services, gateways, controllers, and utility modules: `kebab-case.ts`
- Local type files: `types.ts`
- Tests: `*.test.ts` or `*.test.tsx`
- Controlled exception:
  - vendored UI components in `apps/web/src/components/ui/*` may stay in `kebab-case.tsx`
  - `index.ts` and `index.tsx` are acceptable only as module entrypoints
- Avoid duplicate naming styles for the same responsibility:
  - do not keep both `ThemeProvider.tsx` and `theme-provider.tsx` for equivalent roles

### Runtime Boundaries

- `apps/web` is the main production runtime today.
- `apps/api` is a dedicated shell and should absorb backend/integration behavior progressively.
- `packages/contracts` is for boundary DTOs/schemas that are stable enough to be shared.
- `packages/core` and `packages/shared` should contain logic that is not tied to framework runtime.
- Do not commit generated artifacts under source folders:
  - compiled `*.js` in `src`
  - `node_modules`
  - test outputs and similar generated files

### Integration Design

- Treat integrations as explicit adapters, not scattered direct calls.
- Prefer structured logs on critical external flows.
- Resolve integration context centrally instead of duplicating connection lookup logic.
- Security-sensitive integration code must handle signatures, secrets, and replay windows explicitly.

### Documentation And Source Of Truth

- Do not create competing architecture docs in random folders.
- Official long-form technical docs stay under:
  - `apps/web/content/docs/manuais-tecnicos`
- BMad artifacts in `_bmad-output` are working documents for planning and implementation handoff.
- If implementation changes real architecture or operational behavior, update the official docs too.

### Delivery Strategy

- Prefer small, reviewable changes tied to a concrete story or technical spec.
- For broad refactors, define scope first, then implement by slices.
- Preserve existing user changes and local worktree changes unless explicitly asked otherwise.

### Feature Architecture In `apps/web`

- Each feature under `apps/web/src/features/*` should keep these layers when applicable:
  - `application/`
  - `domain/`
  - `infrastructure/`
  - `interface/`
- UI hooks belong in `interface/hooks/`
- Shared feature helpers belong in:
  - `application/utils/` for use-case-oriented helpers
  - `infrastructure/*` for adapter-technical helpers

## Testing Expectations

- Run the smallest meaningful test set for the area touched.
- For `apps/api`, prefer targeted tests around service/controller behavior when available.
- For `apps/web`, keep Vitest for logic and Playwright for critical route journeys.
- If a change is hard to validate automatically, document the manual verification path.

### Common Commands

- Web:
  - `npm run test -w @dosc-syspro/web`
  - `npm run test:e2e -w @dosc-syspro/web`
- API app:
  - `npm run typecheck -w @dosc-syspro/app-api`
  - `npm run test -w @dosc-syspro/app-api`
- Package API:
  - `npm run test -w @dosc-syspro/api`

### Pull Request Checklist

- Run `typecheck` for the touched scope.
- Run tests for the touched scope.
- Confirm no generated files were added accidentally.
- Update technical documentation when behavior or architecture changes.

## Current High-Value Areas

- Integration hardening around Chatwoot and Evolution flows
- Observability and metrics for critical routes/jobs/integrations
- Remote platform completion and operational hardening
- Progressive consolidation of contracts, CI, and multi-app boundaries

## How Agents Should Work Here

- Start from the existing code and docs before proposing abstraction.
- Read the relevant feature/module files and the matching manual or backlog entry.
- Prefer implementation plans that fit the repo's current maturity, not an idealized clean-slate architecture.
- When working on integrations, cross-check:
  - controller behavior
  - context resolution
  - persistence impact
  - operational docs
