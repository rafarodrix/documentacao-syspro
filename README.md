# Trilink Syspro Workspace

Monorepo do portal, documentacao tecnica e shells de expansao do ecossistema Syspro ERP.

## Visao geral

Este workspace concentra:

- `apps/web`: aplicacao principal em Next.js, portal, docs e operacao
- `apps/api`: shell HTTP dedicado para evolucao do backend
- `apps/mobile`: shell estrutural para futuro runtime mobile
- `packages/*`: contratos, dominio compartilhado, banco, UI e utilitarios

Hoje o runtime principal continua sendo o `@dosc-syspro/web`, mas a base ja esta organizada para evolucao incremental de multi-app.

## Setup rapido

1. Instale as dependencias do workspace:

```bash
npm install
```

2. Crie os arquivos de ambiente a partir dos exemplos de cada app:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/web/.env.e2e.example apps/web/.env.e2e
```

3. Gere o client do Prisma quando necessario:

```bash
npm run db:generate
```

4. Rode o runtime desejado:

```bash
npm run dev
npm run dev:api
```

## Estrutura

```text
apps/
  api/
  mobile/
  web/
packages/
  api/
  config/
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
npm run test:api

npm run build:mobile
npm run dev:mobile
npm run typecheck:mobile

npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:seed:remote
```

Scripts uteis adicionais:

```bash
npm run test:e2e
npm run test:api
npm run test:packages
```

## Aplicacoes

### `apps/web`

Aplicacao principal em Next.js 15 com:

- portal autenticado
- documentacao MDX com Fumadocs
- integracoes operacionais como tickets, remoto, tax e documentos

### `apps/api`

Shell HTTP em Node para expor o pacote `@dosc-syspro/application` fora do runtime do web.

### `apps/mobile`

Shell estrutural que fixa os boundaries do mobile sobre `contracts`, `core` e `shared`.

## Packages

### `@dosc-syspro/application`

Nucleo modular do backend-for-frontend, com contexto, procedures e roteadores.

### `@dosc-syspro/contracts`

DTOs e schemas de fronteira compartilhados.

### `@dosc-syspro/config`

Leitura e validacao centralizada de configuracoes de runtime (env).

### `@dosc-syspro/core`

Regras puras e entidades extraiveis do app.

### `@dosc-syspro/database`

Schema Prisma, migrations e bootstrap do client.

### `@dosc-syspro/shared`

Helpers puros e utilitarios sem acoplamento de UI.

### `@dosc-syspro/ui`

Primitives e componentes reutilizaveis sem regra de negocio.

## Ambiente

O projeto depende de variaveis por app:

- `apps/api/.env`
- `apps/web/.env.local`
- `apps/web/.env.e2e`

Principais grupos:

- banco (`DATABASE_URL`, `DIRECT_URL`)
- auth (`BETTER_AUTH_*`)
- integracoes (`EVOLUTION_*`, `CHATWOOT_*`)
- operacao remota (`REMOTE_*`, `PORTAL_API_*`)

Sem essas variaveis, partes do portal podem abrir em modo reduzido ou falhar em fluxos autenticados e de integracao.

Arquivos versionados de referencia:

- `apps/api/.env.example`
- `apps/web/.env.example`
- `apps/web/.env.e2e.example`

## Documentacao interna

A referencia arquitetural e operacional fica em:

- `apps/web/content/docs/manuais-tecnicos`
- `_bmad-output/project-context.md`

Documentos principais:

- arquitetura do monorepo
- backlog de infraestrutura
- estrategia da plataforma remota
