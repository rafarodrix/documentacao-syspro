# @dosc-syspro/app-api

Shell HTTP dedicado do monorepo.

## Objetivo

- expor transporte HTTP para o `@dosc-syspro/api`
- desacoplar backend do runtime do `apps/web`
- preparar a ligacao gradual dos casos de uso reais fora do Next.js

## Scripts

```bash
npm run dev -w @dosc-syspro/app-api
npm run start -w @dosc-syspro/app-api
npm run typecheck -w @dosc-syspro/app-api
```

## Rotas atuais

- `GET /health`
- `POST /rpc/:namespace/:procedure`

## Headers de sessao aceitos

- `x-user-id`
- `x-user-role`
- `x-company-ids`
- `x-request-id`

## Estado atual

- shell HTTP pronto
- consumo direto do `packages/api`
- authz e error mapping reaproveitados do core do BFF
- parte dos handlers ainda retorna `not-wired` enquanto a ligacao com casos de uso nao for concluida

## Limite atual

Este app ainda nao substitui o backend do portal. Ele existe para abrir o boundary correto e permitir a migracao progressiva.
