# Trilink Syspro — Workspace Reference

Monorepo do portal Syspro ERP (Trilink). Produto principal: `apps/web` (Next.js 15, App Router). Runtime secundário em evolução: `apps/api` (NestJS). Agent de acesso remoto em Go: `apps/agent`.

**Stack:** Next.js 15 · TypeScript · Prisma · tRPC · better-auth · RustDesk · Turborepo · npm workspaces

---

## Estrutura

```
apps/
  web/           @dosc-syspro/web          — portal principal (Next.js 15)
  api/           @dosc-syspro/app-api      — shell HTTP (NestJS)
  mobile/        @dosc-syspro/app-mobile   — shell estrutural (futuro Expo)
  agent/                                   — agente Go (RustDesk heartbeat)

packages/
  application/   @dosc-syspro/application  — casos de uso, procedures tRPC
  contracts/     @dosc-syspro/contracts    — DTOs e schemas Zod
  config/        @dosc-syspro/config       — leitura/validação de env vars
  core/          @dosc-syspro/core         — regras puras e entidades de domínio
  database/      @dosc-syspro/database     — schema Prisma, migrations, client
  remote-domain/ @dosc-syspro/remote-domain — domínio de acesso remoto
  remote-infra/  @dosc-syspro/remote-infra — infra RustDesk API
  shared/        @dosc-syspro/shared       — helpers puros
  ui/            @dosc-syspro/ui           — primitives sem regra de negócio

tools/
  eslint-plugin-trilink-tokens/            — plugin ESLint para design tokens
```

## Arquitetura de camadas

```
core (domain) ──► application ──► database (infra)
                       │
contracts ─────────────┤
shared ────────────────┤
                       ▼
                   apps/web (interface)
                   apps/api (interface)
```

Regra: `core` não importa ninguém. `application` importa `core`, `contracts`, `database`. Apps importam `application`, `contracts`, `ui`, `shared`. O ESLint enforce essa fronteira — componentes não acessam Prisma diretamente.

## Comandos

```bash
npm install              # instalar dependências
npm run dev              # portal (Next.js)
npm run dev:api          # API (NestJS)
npm run build            # build todos os workspaces (Turborepo)
npm run lint             # lint todos os workspaces
npm run typecheck        # typecheck todos os workspaces
npm run test             # testes todos os workspaces
npm run db:generate      # gerar Prisma client
npm run db:migrate       # migration dev
npm run docs:check       # validar estrutura MDX
```

## Documentação completa

`apps/web/content/docs/admin/documentacao-portal/` — referência técnica completa do monorepo, incluindo arquitetura, packages, integrações, acesso remoto e guias de contribuição.

## Ambiente

```bash
cp apps/api/.env.example     apps/api/.env
cp apps/web/.env.example     apps/web/.env.local
cp apps/web/.env.e2e.example apps/web/.env.e2e
```

## CI

GitHub Actions — quality gate (lint + typecheck + test) e build em todo PR e push para `main`. Turbo cache ativo. Node versão em `.nvmrc`.
