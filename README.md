# Trilink Syspro Workspace

Monorepo do portal Syspro ERP da Trilink.

## Visao geral

O workspace concentra:

- `apps/web`: portal principal em Next.js 15, documentacao MDX e operacao
- `apps/api`: shell HTTP em NestJS para modulos de backend
- `apps/agent`: agente Windows em Go + Wails para acesso remoto
- `apps/mobile`: shell estrutural para evolucao futura
- `packages/*`: contratos, dominio compartilhado, banco, UI e utilitarios

## Setup rapido

```bash
npm install
npm run db:generate
npm run dev
```

Arquivos de ambiente esperados:

- `apps/api/.env`
- `apps/web/.env.local`
- `apps/web/.env.e2e`

Arquivos de referencia versionados:

- `apps/api/.env.example`
- `apps/web/.env.example`
- `apps/web/.env.e2e.example`

## Estrutura

```text
apps/
  agent/
  api/
  mobile/
  web/
packages/
  config/
  contracts/
  core/
  database/
  remote-domain/
  remote-infra/
  shared/
  ui/
tools/
  eslint-plugin-trilink-tokens/
```

## Principios

- regra de negocio nao fica em componente React
- features do web evoluem em `src/features/<feature>`
- adapters de infraestrutura ficam isolados
- contratos compartilhados saem de telas e entram em packages quando estabilizam
- apps e packages reaproveitam contratos e dominio, sem duplicar fluxo

## Scripts principais

```bash
npm run dev
npm run dev:api
npm run build
npm run lint
npm run typecheck
npm run test
npm run docs:check
```

Scripts uteis:

```bash
npm run test:web
npm run test:api
npm run test:packages
npm run test:e2e
npm run db:validate
npm run db:migrate
npm run db:seed:remote
```

## Aplicacoes

### `apps/web`

- portal autenticado
- documentacao MDX com Fumadocs
- integracoes operacionais como tickets, remoto, tax e documentos

### `apps/api`

- backend modular em NestJS
- tRPC server, REST e integracoes operacionais

### `apps/agent`

- agente Windows em Go
- integracao com RustDesk, heartbeat e operacoes locais

### `apps/mobile`

- shell estrutural para evolucao futura

## Packages

### `@dosc-syspro/contracts`

DTOs e schemas de fronteira compartilhados.

### `@dosc-syspro/config`

Leitura e validacao centralizada de configuracoes de runtime.

### `@dosc-syspro/core`

Regras puras e entidades compartilhadas.

### `@dosc-syspro/database`

Schema Prisma, migrations e bootstrap do client.

### `@dosc-syspro/remote-domain`

Casos de uso e contratos do modulo remoto.

### `@dosc-syspro/remote-infra`

Implementacoes de infraestrutura do dominio remoto.

### `@dosc-syspro/shared`

Helpers puros e utilitarios sem acoplamento de UI.

### `@dosc-syspro/ui`

Primitives e componentes reutilizaveis sem regra de negocio.

## Documentacao interna

A referencia arquitetural e operacional fica em:

- `apps/web/content/docs/admin/documentacao-portal`
- `apps/web/content/docs/cliente`
- `apps/web/content/docs/suporte`
