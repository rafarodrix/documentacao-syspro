# Trilink Syspro Workspace

Monorepo do portal, documentacao tecnica e shells de expansao do ecossistema Syspro ERP.

## Visao geral

Este workspace concentra:

- `apps/web`: aplicacao principal em Next.js, portal, docs e operacao
- `apps/api`: shell HTTP dedicado para evolucao do backend
- `apps/mobile`: shell estrutural para futuro runtime mobile
- `packages/*`: contratos, dominio compartilhado, banco, UI e utilitarios

Hoje o runtime principal continua sendo o `@dosc-syspro/web`, mas a base ja esta organizada para evolucao incremental de multi-app.

## Estrutura

```text
apps/
  api/
  mobile/
  web/
packages/
  api/
  contracts/
  core/
  database/
  shared/
  ui/
```

## Principios

- regra de negocio nao fica em componente React
- features do web evoluem em `src/features/<feature>`
- adapters de infraestrutura ficam isolados
- contratos compartilhados saem de telas e entram em packages quando estabilizam
- a expansao para API e mobile deve reaproveitar contratos e dominio, nao duplicar fluxo

## Scripts principais

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
```

Scripts especificos do workspace:

```bash
npm run build:api
npm run dev:api
npm run typecheck:api

npm run build:mobile
npm run dev:mobile
npm run typecheck:mobile

npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:seed:remote
```

## Aplicacoes

### `apps/web`

Aplicacao principal em Next.js 15 com:

- portal autenticado
- documentacao MDX com Fumadocs
- integracoes operacionais como tickets, remoto, tax e documentos

### `apps/api`

Shell HTTP em Node para expor o pacote `@dosc-syspro/api` fora do runtime do web.

### `apps/mobile`

Shell estrutural que fixa os boundaries do mobile sobre `contracts`, `core` e `shared`.

## Packages

### `@dosc-syspro/api`

Nucleo modular do BFF, com contexto, procedures e roteadores.

### `@dosc-syspro/contracts`

DTOs e schemas de fronteira compartilhados.

### `@dosc-syspro/core`

Regras puras e entidades extraiveis do app.

### `@dosc-syspro/database`

Schema Prisma, migrations e bootstrap do client.

### `@dosc-syspro/shared`

Helpers puros e utilitarios sem acoplamento de UI.

### `@dosc-syspro/ui`

Primitives e componentes reutilizaveis sem regra de negocio.

## Ambiente

O projeto depende de variaveis em `.env`, principalmente para:

- banco (`DATABASE_URL`, `DIRECT_URL`)
- auth (`BETTER_AUTH_*`)
- integracoes externas como Zammad

Sem essas variaveis, partes do portal podem abrir em modo reduzido ou falhar em fluxos autenticados e de integracao.

## Documentacao interna

A referencia arquitetural e operacional fica em:

- `apps/web/content/docs/manuais-tecnicos`

Documentos principais:

- arquitetura do monorepo
- backlog de infraestrutura
- estrategia da plataforma remota
- integracao com Zammad
