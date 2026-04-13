# Classificacao de `apps/web/src/app/api`

## Decisao

O `apps/api` e o backend canonico.

O `apps/web` deve ser um consumidor fino:

- UI
- server actions/gateways
- BFF minimo apenas quando houver motivo tecnico real

Regra pratica:

- Se a regra e de negocio, persistencia, autorizacao central, integracao externa ou contrato principal do produto: vai para `apps/api`
- Se o endpoint existe apenas para atender o frontend no mesmo dominio, reaproveitar cookie/sessao, SSE, callback de agente ou adaptacao fina de transporte: pode ficar em `apps/web/src/app/api`

## Manter No `web/api`

Essas rotas fazem sentido no portal web como BFF, callback ou endpoint publico do proprio app:

- `auth/[...all]`
- `docs/feedback`
- `docs/views`
- `og/docs`
- `platform/notifications`
- `platform/session-role`
- `platform/tickets/customer-emails`
- `platform/tickets/[id]/quick-actions`
- `remote/**`
- `revalidate`
- `sefaz/check`

Motivos principais:

- uso direto por componentes client-side
- necessidade de cookie/sessao do portal
- SSE/event stream
- endpoints consumidos por agentes ou instaladores apontando para o dominio do portal
- adaptadores finos de payload

## Manter Minimo No `web/api`

Essas rotas devem continuar existindo apenas na forma explicita atual, sem voltar a catch-all:

- `companies/lookup-cnpj`
- `contacts`
- `contacts/[id]`
- `contacts/sync`
- `tax/ncm-lookup`
- `tax/sync-jobs`
- `tax/sync-chunk`
- `tickets/[id]`
- `users`
- `users/[id]`
- `users/me/chatwoot/sso`

Observacao:

- elas existem porque ainda ha consumo real do browser no proprio `web`
- qualquer expansao nova deve preferir `apps/api` + gateway server-side antes de criar nova rota em `web/api`

## Ja Removido Do `web/api`

Esses blocos ja nao devem voltar:

- `dashboard`
- `settings`
- `remote-admin`
- catch-all de `companies`
- catch-all de `contacts`
- catch-all de `tax`
- catch-all de `tickets`
- catch-all de `users`
- legado de integracao de tickets removida

## Candidatos A Migracao Futura

Essas rotas ainda podem sair do `web/api` se a UI cliente for migrada para outra estrategia:

- `companies/lookup-cnpj`
- `contacts*`
- `tax/*`
- `tickets/[id]`
- `users*`
- `platform/notifications`
- `platform/session-role`
- `platform/tickets/*`

Condicao para migrar:

- parar de depender de `fetch("/api/...")` no browser
- passar a consumir via server components, server actions ou gateways diretos para `apps/api`

## Provavel Consolidacao No `apps/api`

Itens que merecem avaliacao para irem ao backend canonico se ainda crescerem:

- `docs/feedback`
- `platform/notifications`
- `platform/session-role`
- `platform/tickets/customer-emails`
- `platform/tickets/[id]/quick-actions`
- `scripts`
- `search`
- `sugerir-tributacao`
- `visualizar-danfe`

Critico:

- se qualquer uma dessas rotas ganhar regra de negocio relevante, persistencia propria ou contrato reutilizavel, ela deve sair de `web/api` e virar modulo/endpoint de `apps/api`

## Convencoes Daqui Pra Frente

1. Nao criar mais `[[...all]]` em `apps/web/src/app/api`
2. Toda nova rota em `web/api` precisa ter justificativa de BFF
3. Todo consumo server-side deve preferir gateway direto para `apps/api`
4. Toda logica reutilizavel deve morar em `features/*`, nunca em `app/api`
5. Se uma rota de `web/api` comecar a acumular regra de negocio, promover para `apps/api`
