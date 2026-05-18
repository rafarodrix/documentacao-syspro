# CLAUDE.md — Trilink Syspro Workspace

## Visão geral

Monorepo do portal Syspro ERP (Trilink). Produto principal: `apps/web` (Next.js 15, App Router). Runtime secundário em evolução: `apps/api` (NestJS). Agent de acesso remoto em Go: `apps/agent`.

**Stack principal:** Next.js 15 · TypeScript · Prisma · tRPC · better-auth · RustDesk · Turborepo · npm workspaces

---

## Estrutura de workspaces

```
apps/
  web/          @dosc-syspro/web          — portal principal (Next.js 15)
  api/          @dosc-syspro/app-api      — shell HTTP (NestJS, em evolução)
  mobile/       @dosc-syspro/app-mobile   — shell estrutural (futuro Expo)
  agent/                                  — agente Go (RustDesk heartbeat)

packages/
  application/  @dosc-syspro/application  — casos de uso, procedures tRPC
  contracts/    @dosc-syspro/contracts    — DTOs e schemas Zod de fronteira
  config/       @dosc-syspro/config       — leitura/validação de env vars
  core/         @dosc-syspro/core         — regras puras e entidades de domínio
  database/     @dosc-syspro/database     — schema Prisma, migrations, client
  remote-domain/ @dosc-syspro/remote-domain — domínio de acesso remoto
  remote-infra/  @dosc-syspro/remote-infra — infra de acesso remoto (RustDesk API)
  shared/       @dosc-syspro/shared       — helpers puros sem UI
  ui/           @dosc-syspro/ui           — primitives e componentes sem regra de negócio

tools/
  eslint-plugin-trilink-tokens/           — plugin ESLint interno para design tokens
```

---

## Arquitetura de camadas

Regra de dependência (domain → application → infra → interface):

```
core (domain) ──► application ──► database (infra)
                       │
contracts ─────────────┤
shared ────────────────┤
                       ▼
                   apps/web (interface)
                   apps/api (interface)
```

- `core` não importa ninguém
- `application` importa `core`, `contracts`, `database`
- `apps/web` e `apps/api` importam `application`, `contracts`, `ui`, `shared`
- O ESLint (`.eslintrc.json`) faz valer essa fronteira: componentes e interfaces não podem importar `@/lib/prisma` ou `@/core/infrastructure/**` diretamente

---

## Comandos principais

```bash
# Instalar dependências
npm install

# Desenvolvimento (portal principal)
npm run dev

# Desenvolvimento (API)
npm run dev:api

# Build completo (todos os workspaces via Turborepo)
npm run build

# Lint em todos os workspaces
npm run lint

# Typecheck em todos os workspaces
npm run typecheck

# Testes em todos os workspaces
npm run test

# Prisma
npm run db:generate    # gerar client
npm run db:validate    # validar schema
npm run db:migrate     # migration dev
npm run db:deploy      # migration produção
```

---

## Convenções importantes

### Features (apps/web)
- Toda feature fica em `src/features/<nome-da-feature>/`
- Camadas internas: `domain/` → `application/` → `infrastructure/` → `interface/`
- Componentes de interface não acessam Prisma diretamente — usar queries/actions da feature

### Documentação MDX
- Localização: `apps/web/content/docs/admin/documentacao-portal/`
- Cada seção tem `meta.json` (title + pages array) e `index.mdx`
- Validar com: `npm run docs:check`
- Blocos de código: usar ` ```bash ` (nunca ` ```env ` — não reconhecido pelo Shiki)
- Frontmatter com `: ` no valor deve ser quoted: `title: "API: Módulos"`

### Design System
- Usar tokens semânticos do `@dosc-syspro/ui` — não usar cores hex hardcoded
- Auditoria: `npm run lint:ds`

### Commit convention
- Formato: `tipo(escopo): descrição imperativa`
- Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`

---

## Ambiente

Cada app tem seu `.env.example`:
- `apps/api/.env.example` → copiar para `apps/api/.env`
- `apps/web/.env.example` → copiar para `apps/web/.env.local`
- `apps/web/.env.e2e.example` → copiar para `apps/web/.env.e2e`

Grupos de variáveis importantes:
- `DATABASE_URL`, `DIRECT_URL` — PostgreSQL (Prisma)
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` — autenticação
- `REMOTE_*`, `PORTAL_API_*` — módulo de acesso remoto
- `EVOLUTION_*`, `CHATWOOT_*` — integrações operacionais

---

## CI

GitHub Actions (`.github/workflows/ci.yml`): quality gate (lint + typecheck + test + build) em todo PR e push para `main`. Node versão definida em `.nvmrc`. Cache do Turborepo ativado via GitHub Actions cache.
