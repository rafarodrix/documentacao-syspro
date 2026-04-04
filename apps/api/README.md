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
- `POST /webhooks/evolution` (inbound Evolution Go + orquestracao de conversa/ticket)
- `GET /conversations` (listagem de conversas por filtro)
- `GET /conversations/:conversationId` (detalhe de conversa)
- `GET /conversations/:conversationId/messages` (mensagens da conversa)
- `POST /conversations/send` (outbound WhatsApp para conversa existente)
- `POST /conversations/resolve` (encerrar atendimento)
- `POST /conversations/link` (vincular conversa a empresa/contato)
- `POST /conversations/start-outbound` (iniciar atendimento outbound)

## Headers de sessao aceitos

- `x-user-id`
- `x-user-role`
- `x-company-ids`
- `x-request-id`

## Seguranca de servico (`web -> api`)

- Header obrigatorio: `x-internal-api-key`
- Variavel obrigatoria: `INTERNAL_API_KEY` (deve estar igual no `apps/web` e `apps/api`)

## Estado atual

- shell HTTP pronto
- consumo direto do `packages/api`
- authz e error mapping reaproveitados do core do BFF
- webhook inbound WhatsApp movido para `apps/api`
- envio outbound de mensagens de conversa movido para `apps/api`
- listagem/mensagens/resolucao/vinculo/start outbound de conversas movidos para `apps/api`

## Limite atual

Este app ainda esta em migracao progressiva. `apps/web` segue como UI/admin e proxy de entrada de webhook.
