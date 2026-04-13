# @dosc-syspro/sdk

Nucleo modular do BFF do monorepo.

## Objetivo

- concentrar contexto, middlewares e roteadores do backend-for-frontend
- desacoplar transporte do `apps/web`
- preparar migracao futura para tRPC ou outro transporte sem reescrever os fluxos de dominio

## Estado atual

- contexto padronizado
- procedimentos com authz, log e error mapping
- roteadores modulares por dominio
- composicao central do `appRouter`
- shell HTTP em `apps/api` consumindo este pacote

## Exportacoes atuais

- `@dosc-syspro/sdk`
- `@dosc-syspro/sdk/context`
- `@dosc-syspro/sdk/router`
- `@dosc-syspro/sdk/routers/*`

Este pacote continua isolado do runtime do `apps/web`. A decisao foi manter o rollout seguro: primeiro o nucleo modular, depois o shell HTTP dedicado, e so entao a ligacao dos casos de uso reais.
