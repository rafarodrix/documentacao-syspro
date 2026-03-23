# @dosc-syspro/app-api

Shell do backend dedicado do monorepo.

Objetivo:
- materializar a pasta `apps/api`
- expor um transporte HTTP minimo para o `@dosc-syspro/api`
- preparar separacao futura entre web e backend sem reescrever roteadores

Rotas atuais:
- `GET /health`
- `POST /rpc/:namespace/:procedure`

Headers de sessao aceitos:
- `x-user-id`
- `x-user-role`
- `x-company-ids`
- `x-request-id`

Estado atual:
- shell HTTP pronto
- consumo direto do `packages/api`
- authz e error mapping reaproveitados do core do BFF
- handlers ainda retornam `not-wired` enquanto a ligacao com casos de uso nao for conectada