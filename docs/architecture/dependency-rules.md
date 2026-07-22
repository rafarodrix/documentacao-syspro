# Regras de Dependencia e Fronteiras

## Matriz de workspaces

| Workspace | Responsabilidade | Pode depender de | Nao pode depender de |
| --- | --- | --- | --- |
| `apps/web` | UI Next.js, rotas e docs | contratos, UI, core, shared, config e features publicas | `apps/api` e Prisma fora da borda server-side existente |
| `apps/api` | HTTP NestJS, RBAC, webhooks e integracoes | contracts, database, core, shared e features | `apps/web` |
| `packages/contracts` | schemas e tipos de transporte | Zod | apps, Prisma, Nest, Next e React |
| `packages/core` e `features/*/domain` | regras puras e portas | contracts e shared puro | apps, Prisma, HTTP e UI |
| `packages/database` e `features/*/infra` | Prisma e adapters de persistencia | domain/contracts/database | apps e UI |
| `packages/ui` | componentes reutilizaveis | React, Radix e estilos | banco, rede e autorizacao |

## Regras executaveis

`.dependency-cruiser.cjs` bloqueia:

- imports diretos entre `apps/web` e `apps/api`;
- imports de `apps/*` por qualquer pacote;
- deep imports de internals de workspaces;
- ciclos de dependencia.

Execute `npm run quality:architecture` na raiz. Excecoes exigem justificativa local e regra estreita; nao use exclusoes globais.

## Contratos tRPC

`AppRouter` e um tipo de implementacao da API, nao um contrato independente. Enquanto existir, ele nao pode ser reexportado por `packages/contracts` nem resolvido por alias do web para `apps/api`. O plano de correcao e publicar schemas e clientes de transporte necessarios em `packages/contracts`, preservando o endpoint HTTP atual.
