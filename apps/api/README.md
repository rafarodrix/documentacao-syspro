# @dosc-syspro/app-api

Shell HTTP dedicado do monorepo.

## Objetivo

- expor transporte HTTP para os casos de uso e contratos compartilhados do workspace
- desacoplar backend do runtime do `apps/web`
- concentrar webhooks, integracoes operacionais e autenticacao de servico
- operar a integracao Evolution Go <-> Chatwoot e os endpoints administrativos do portal

## Papel na arquitetura

- `apps/api` e o adapter HTTP/NestJS
- a superficie de contratos e routers compartilhaveis vive em `packages/api`
- contratos tipados compartilhados vivem em `packages/contracts`
- utilitarios transversais reutilizados por `web` e `api` vivem em `packages/shared`
- persistencia e schema Prisma vivem em `packages/database`

Em outras palavras: `apps/api` deixou de ser o lugar para utilitario transversal consumido pelo `web`; esse papel foi movido para pacotes neutros.

## Refatoracoes recentes

- extracao de utilitarios compartilhaveis para `packages/shared`:
  - `logger`
  - `request-auth`
  - `action-rate-limit`
  - `action-error-handler`
- remocao do acoplamento direto do `apps/web` com modulos internos de `packages/api`
- consolidacao do RBAC em perfis persistidos
- introducao de perfis de acesso persistidos no banco:
  - `permission`
  - `access_profile`
  - `access_profile_permission`
  - `user_access_profile`
- perfis de sistema (`ADMIN`, `DEVELOPER`, `SUPORTE`, `CLIENTE_ADMIN`, `CLIENTE_USER`) passam a existir no banco e servir como fallback real de autorizacao
- edicao de perfis de sistema liberada no fluxo administrativo, mantendo chave fixa para preservar o vinculo com o role legado
- sincronizacao do catalogo de autorizacao ajustada para:
  - garantir existencia dos perfis padrao
  - nao sobrescrever permissoes ja persistidas de perfis existentes
- portal passou a ser a fonte de verdade para:
  - `empresa -> conexao/inbox Chatwoot`
  - `usuario interno -> agente Chatwoot`
- configuracao exata da instancia Evolution (`instance`, `instanceId`, `instanceToken`) passou a ficar em `Configuracoes > WhatsApp / Evolution Go`

## Responsabilidades atuais

- expor endpoints HTTP e RPC do sistema
- validar sessao e permissoes no backend
- responder por `settings`, `authorization`, integracoes e webhooks
- centralizar a fonte efetiva de autorizacao usada pelo portal
- manter o bridge operacional entre Evolution Go e Chatwoot

## Scripts

```bash
npm run dev -w @dosc-syspro/app-api
npm run start -w @dosc-syspro/app-api
npm run typecheck -w @dosc-syspro/app-api
npm run test -w @dosc-syspro/app-api
```

## Deploy dedicado

Use `apps/api/Dockerfile` com contexto na raiz do monorepo:

```bash
docker build -f apps/api/Dockerfile -t dosc-syspro-api .
docker run --rm -p 3001:3001 --env-file .env dosc-syspro-api
```

Observacao: em producao o container pode subir em outra porta de runtime, como `3000`, conforme o `PORT` injetado pelo ambiente.

## Variaveis minimas

- `PORT` (opcional)
- `DATABASE_URL`
- `DIRECT_URL` (quando usar migrations/Prisma em runtime)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `INTERNAL_API_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `CHATWOOT_URL`
- `CHATWOOT_ACCOUNT_ID`
- `CHATWOOT_API_TOKEN`
- `CHATWOOT_INBOX_ID`
- `CHATWOOT_INBOX_IDENTIFIER`
- `CHATWOOT_WEBHOOK_SECRET`
- `CHATWOOT_WEBHOOK_MAX_SKEW_SECONDS` (opcional, default `300`)
- `INTEGRATION_WEBHOOK_DEDUP_TTL_SECONDS` (opcional, default `86400`)
- `INTEGRATION_CONFIG_ENCRYPTION_KEY` (opcional; fallback usa `BETTER_AUTH_SECRET`)

## Rotas relevantes

- `GET /health`
- `GET /health/integrations/chatwoot`
- `POST /rpc/:namespace/:procedure`
- `POST /api/webhooks/evolution`
- `POST /api/webhooks/chatwoot`
- `POST /integrations/evolution/messages/send`
- `GET /settings/evolution`
- `PUT /settings/evolution`
- `GET /settings/integrations/connections`
- `GET /settings/integrations/connections/:id`
- `POST /settings/integrations/connections`
- `PUT /settings/integrations/connections/:id`
- `DELETE /settings/integrations/connections/:id`
- `POST /settings/integrations/connections/:id/test`
- endpoints de `settings` e `authorization` usados pelo portal para RBAC persistido

## Autorizacao e RBAC

O backend e a fonte de verdade da autorizacao.

Fluxo atual:

- o usuario continua possuindo um `role` legado
- esse `role` aponta para um perfil persistido de mesma chave em `access_profile`
- permissoes efetivas sao resolvidas a partir de:
  - perfil base do role
  - vinculos adicionais em `user_access_profile`
  - escopo global ou por empresa

Consequencias praticas:

- permissoes de `DEVELOPER` e `SUPORTE` nao sao mais apenas hardcoded em memoria
- a edicao de perfis impacta o comportamento real do sistema
- o frontend consulta o contexto central de autorizacao em vez de depender so de matriz local

## Headers de sessao aceitos

- `x-user-id`
- `x-user-role`
- `x-company-ids`
- `x-request-id`

## Seguranca de servico (`web -> api`)

- header obrigatorio: `x-internal-api-key`
- variavel obrigatoria: `INTERNAL_API_KEY`

## Evolution Go e Chatwoot

Observacoes operacionais:

- envio outbound prioriza `/send/text` e `/send/media`
- ha fallback para contrato v2 quando a instalacao exposta exigir
- teste de conexao usa `GET /instance/status`
- quando `evolutionInstanceId` + `metadata.evolution.webhookUrl` estiverem definidos, o teste pode reaplicar configuracao via `POST /instance/connect`
- o backend nao guarda historico completo da conversa como fonte primaria
- `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` continuam vindo do runtime
- `instance`, `instanceId` e `instanceToken` devem ser preenchidos em `Configuracoes > WhatsApp / Evolution Go`
- o casamento exato do webhook da Evolution nao deve mais depender de `EVOLUTION_INSTANCE` e `EVOLUTION_INSTANCE_TOKEN` no `.env`

Persistencia local usada no fluxo atual:

- `conversation_link`
- `message_link`
- `integration_webhook_dedup`
- `company_contact`

## Portal x Chatwoot

- a relacao oficial `empresa -> conta/inbox Chatwoot` vive em `settings/integrations/connections`
- conexao persistida no banco deve ser vinculada a uma `companyId`
- cada empresa pode ter no maximo uma conexao ativa
- a mesma inbox do Chatwoot nao deve ficar ativa em empresas diferentes
- usuarios internos do portal (`ADMIN`, `DEVELOPER`, `SUPORTE`) sao provisionados e atualizados automaticamente no Chatwoot quando criados, alterados ou desativados no portal
- `CHATWOOT_PLATFORM_API_TOKEN` e obrigatorio para provisionamento de agente, vinculo na conta e SSO
- webhooks continuam sendo apenas transporte de eventos; cadastro de usuario e associacao empresa/inbox ficam sob controle do portal

## Limites atuais

- `apps/api` ainda esta em migracao progressiva
- parte dos adapters de dominio remoto ainda e exportada via `packages/api`, embora o `web` ja consuma isso por `packages/remote-infra`
- ainda existem fluxos no `web` com fallback por role legado; a direcao correta e reduzir isso e depender cada vez mais do contexto central de autorizacao do backend
