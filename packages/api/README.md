# @dosc-syspro/api

Shell modular do BFF do monorepo.

Objetivo:
- concentrar contexto, middlewares e roteadores do backend-for-frontend
- desacoplar transporte do `apps/web`
- preparar migracao futura para tRPC ou outro transporte sem reescrever os fluxos de dominio

Estado atual:
- contexto padronizado
- procedimentos com authz/log/error mapping
- roteadores modulares por dominio
- composicao central do `appRouter`

Este pacote ainda nao esta plugado em runtime no `apps/web`.
A decisao foi manter o rollout seguro: primeiro a estrutura modular, depois a ligacao do transporte.