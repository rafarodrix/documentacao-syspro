# @dosc-syspro/app-api

Shell HTTP dedicado do monorepo.

## Objetivo

- expor transporte HTTP para o `@dosc-syspro/api`
- desacoplar backend do runtime do `apps/web`
- preparar a ligacao gradual dos casos de uso reais fora do Next.js
- operar a integracao Evolution Go <-> Chatwoot como bridge de webhook e envio outbound

## Scripts

```bash
npm run dev -w @dosc-syspro/app-api
npm run start -w @dosc-syspro/app-api
npm run typecheck -w @dosc-syspro/app-api
```

## Deploy dedicado (backend separado)

Use `apps/api/Dockerfile` com contexto na raiz do monorepo:

```bash
docker build -f apps/api/Dockerfile -t dosc-syspro-api .
docker run --rm -p 3001:3001 --env-file .env dosc-syspro-api
```

Variaveis minimas:

- `PORT` (opcional, default local `3001`)
- `DATABASE_URL`
- `DIRECT_URL` (quando usar migrations/Prisma em runtime)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `INTERNAL_API_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_INSTANCE_TOKEN` (opcional, valida `instanceToken` do payload do webhook Evolution Go)
- `CHATWOOT_URL`
- `CHATWOOT_ACCOUNT_ID`
- `CHATWOOT_API_TOKEN`
- `CHATWOOT_INBOX_ID` (id numerico do inbox, usado na API `/api/v1/accounts/...`)
- `CHATWOOT_INBOX_IDENTIFIER` (identificador publico nao numerico, usado na API `/public/api/v1/inboxes/...`)
- `CHATWOOT_WEBHOOK_SECRET` (usado para HMAC assinatura do webhook Chatwoot)
- `CHATWOOT_WEBHOOK_MAX_SKEW_SECONDS` (opcional, default `300`)
- `INTEGRATION_WEBHOOK_DEDUP_TTL_SECONDS` (opcional, default `86400`)
- `INTEGRATION_CONFIG_ENCRYPTION_KEY` (opcional, recomendado para criptografar credenciais de conexoes; fallback usa `BETTER_AUTH_SECRET`)

## Rotas atuais

- `GET /health`
- `GET /health/integrations/chatwoot` (valida rota critica da API Chatwoot e resolucao de inbox)
- `POST /rpc/:namespace/:procedure`
- `POST /api/webhooks/evolution` (inbound Evolution Go; processa `Message` e `Receipt`)
- `POST /integrations/evolution/messages/send` (envio direto outbound via Evolution, protegido por `x-internal-api-key`)
- `GET /settings/evolution` (configuracao global do canal Evolution)
- `PUT /settings/evolution` (persistencia das configuracoes globais do canal)
- `GET /settings/integrations/connections` (listar conexoes de integracao por empresa/opcional)
- `GET /settings/integrations/connections/:id` (detalhe da conexao)
- `POST /settings/integrations/connections` (criar conexao Evolution + Chatwoot)
- `PUT /settings/integrations/connections/:id` (atualizar conexao)
- `DELETE /settings/integrations/connections/:id` (remover conexao)
- `POST /settings/integrations/connections/:id/test` (testar conectividade Evolution + Chatwoot)

Observacao sobre Evolution Go:

- envio outbound prioriza `/send/text` e `/send/media`
- o cliente possui fallback para `/message/sendText/{instance}` e `/message/sendMedia/{instance}` quando a instalacao exposta usar o contrato v2
- teste de conexao usa `GET /instance/status`
- quando `evolutionInstanceId` + `metadata.evolution.webhookUrl` estiverem definidos, o teste reaplica configuracao via `POST /instance/connect`
- recursos legados da API antiga foram removidos do fluxo principal: sync incremental de contatos, fetch extra de midia e delete remoto de mensagem
- o backend nao guarda historico completo da conversa como fonte primaria; o historico principal permanece na Evolution Go e no Chatwoot
- persistencia local usada no fluxo atual:
  - `conversation_link`
  - `message_link`
  - `integration_webhook_dedup`
  - `company_contact`

## Roadmap do modulo de contatos

Visao prevista para evolucao do modulo:

- os contatos continuarao sendo a entidade primaria de relacionamento com pessoas
- uma empresa podera prestar suporte para varios contatos e varias empresas clientes
- filiais/unidades da empresa prestadora poderao operar subconjuntos da carteira de atendimento
- no futuro, o mesmo ambiente podera liberar o modulo de gestao para clientes finais, mantendo isolamento de dados por carteira/tenant

Direcao arquitetural desejada:

- separar explicitamente empresa prestadora, empresa cliente e unidade operadora
- formalizar no banco a relacao de atendimento entre empresas
- permitir que contatos, conversas, tickets e conexoes de integracao carreguem escopo de operacao e visibilidade
- garantir que usuarios internos vejam apenas a carteira permitida e que clientes finais vejam apenas seus proprios dados

Objetivo futuro:

- operar atendimento multiempresa na mesma infraestrutura
- suportar prestadora principal + filiais
- permitir white-label ou portal de atendimento para clientes, sem mistura de dados entre carteiras

## Roteiro de teste ponta a ponta

1. Preparar ambiente

- garantir que o backend esteja no ar
- garantir que o Chatwoot esteja acessivel
- garantir que a instancia Evolution Go esteja conectada

2. Configurar variaveis no backend

- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_INSTANCE_TOKEN` se o webhook da Evolution Go enviar esse valor
- `CHATWOOT_URL`
- `CHATWOOT_ACCOUNT_ID`
- `CHATWOOT_API_TOKEN`
- `CHATWOOT_INBOX_ID` ou `CHATWOOT_INBOX_IDENTIFIER`
- `CHATWOOT_WEBHOOK_SECRET` se a assinatura HMAC estiver habilitada

3. Configurar webhook da Evolution Go

- URL:
  - oficial: `https://SEU_BACKEND/api/webhooks/evolution`
- eventos minimos:
  - `Message`
  - `Receipt`
- se usar filtro por subscribe no painel:
  - `MESSAGE`
  - `READ_RECEIPT`
  - ou `ALL`

4. Configurar webhook do Chatwoot

- URL preferencial: `https://SEU_BACKEND/api/webhooks/chatwoot`
- Alias legado aceito pelo backend: `https://SEU_BACKEND/webhooks/chatwoot`
- evento essencial para resposta outbound:
  - `message_created`
- se `CHATWOOT_WEBHOOK_SECRET` estiver configurado:
  - confirmar que o Chatwoot envia `x-chatwoot-signature`
  - confirmar que o Chatwoot envia `x-chatwoot-timestamp`

5. Validar inbound WhatsApp -> Chatwoot

- enviar uma mensagem do numero cliente para o WhatsApp conectado na Evolution Go
- confirmar que o backend recebe `Message`
- confirmar que:
  - um `CompanyContact` e criado ou reutilizado
  - um `ConversationLink` e criado ou reutilizado
  - a mensagem aparece na conversa do Chatwoot

6. Validar outbound Chatwoot -> WhatsApp

- responder a conversa dentro do Chatwoot
- confirmar que o Chatwoot dispara `message_created`
- confirmar que o backend envia via `/send/text` ou `/send/media` (ou fallback v2 quando a instalacao exposta exigir)
- confirmar que o cliente recebe no WhatsApp
- confirmar que um `MessageLink` foi criado quando houver `messageId`

7. Validar status de entrega/leitura

- apos a resposta outbound, confirmar que a Evolution Go envia `Receipt`
- confirmar que o backend recebe `Receipt`
- confirmar que o status da mensagem no Chatwoot muda para:
  - `delivered`
  - `read`

8. Validar seguranca

- se `EVOLUTION_INSTANCE_TOKEN` estiver definido:
  - confirmar que o payload da Evolution Go envia o mesmo `instanceToken`
- se `CHATWOOT_WEBHOOK_SECRET` estiver definido:
  - confirmar que a assinatura HMAC e aceita pelo backend

9. Validar banco local minimo

- `conversation_link`
- `message_link`
- `integration_webhook_dedup`
- `company_contact`

10. Sintomas comuns de falha

- mensagem chega no backend mas nao abre no Chatwoot:
  - revisar `CHATWOOT_*`
  - revisar inbox configurado
- mensagem sai do Chatwoot mas nao chega no WhatsApp:
  - revisar `EVOLUTION_API_URL`
  - revisar `EVOLUTION_API_KEY`
  - revisar `EVOLUTION_INSTANCE`
- webhook Evolution retorna `401`:
  - revisar `EVOLUTION_INSTANCE_TOKEN`
- webhook Chatwoot retorna `401`:
  - revisar `CHATWOOT_WEBHOOK_SECRET`

## Checklist operacional curto

- backend no ar
- Evolution Go conectada
- Chatwoot acessivel
- `EVOLUTION_API_URL` configurada
- `EVOLUTION_API_KEY` configurada
- `EVOLUTION_INSTANCE` configurada
- `EVOLUTION_INSTANCE_TOKEN` revisado se estiver em uso
- `CHATWOOT_URL` configurada
- `CHATWOOT_ACCOUNT_ID` configurada
- `CHATWOOT_API_TOKEN` configurada
- `CHATWOOT_INBOX_ID` ou `CHATWOOT_INBOX_IDENTIFIER` configurado
- webhook Evolution Go apontando para `/api/webhooks/evolution`
- webhook Evolution Go enviando `Message` e `Receipt`
- webhook Chatwoot apontando para `/api/webhooks/chatwoot` (ou `/webhooks/chatwoot`, mantido como alias)
- Chatwoot enviando `message_created`
- teste inbound realizado com sucesso
- teste outbound realizado com sucesso
- `Receipt` atualizando status no Chatwoot
- `conversation_link` criado
- `message_link` criado quando houver `messageId`

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
- fluxo principal operando como bridge entre Evolution Go e Chatwoot

## Limite atual

Este app ainda esta em migracao progressiva. `apps/web` segue como UI/admin, enquanto o recebimento de webhooks e a integracao operacional ficam concentrados no `apps/api`.
