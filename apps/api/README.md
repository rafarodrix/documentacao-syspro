# @dosc-syspro/app-api

Shell HTTP dedicado do monorepo.

## Objetivo

- expor transporte HTTP para os casos de uso e contratos compartilhados do workspace
- desacoplar backend do runtime do `apps/web`
- concentrar webhooks, integrações operacionais e autenticação de serviço
- operar a integração Evolution Go <-> Chatwoot e os endpoints administrativos do portal

## Papel na arquitetura

- `apps/api` e o adapter HTTP/NestJS
- a superfície de contratos e routers compartilháveis vive em `packages/application`
- contratos tipados compartilhados vivem em `packages/contracts`
- utilitários transversais reutilizados por `web` e `api` agora vivem em `packages/shared`
- persistência e schema Prisma vivem em `packages/database`

Em outras palavras: `apps/api` deixou de ser o lugar para utilitário transversal consumido pelo `web`; esse papel foi movido para pacotes neutros.

## Refatorações recentes

- extração de utilitários compartilháveis para `packages/shared`:
  - `logger`
  - `request-auth`
  - `action-rate-limit`
  - `action-error-handler`
- remoção do acoplamento direto do `apps/web` com esses módulos internos de `packages/application`
- consolidação do RBAC em perfis persistidos
- introdução de perfis de acesso persistidos no banco:
  - `permission`
  - `access_profile`
  - `access_profile_permission`
  - `user_access_profile`
- perfis de sistema (`ADMIN`, `DEVELOPER`, `SUPORTE`, `CLIENTE_ADMIN`, `CLIENTE_USER`) passam a existir no banco e servir como fallback real de autorização
- edição de perfis de sistema liberada no fluxo administrativo, mantendo chave fixa para preservar o vínculo com o role legado
- sincronização do catálogo de autorização ajustada para:
  - garantir existência dos perfis padrão
  - não sobrescrever permissões já persistidas de perfis existentes

## Responsabilidades atuais

- expor endpoints HTTP e RPC do sistema
- validar sessão e permissões no backend
- responder por `settings`, `authorization`, integrações e webhooks
- centralizar a fonte efetiva de autorização usada pelo portal
- manter o bridge operacional entre Evolution Go e Chatwoot

## Scripts

```bash
npm run dev -w @dosc-syspro/app-api
npm run start -w @dosc-syspro/app-api
npm run typecheck -w @dosc-syspro/app-api
npm run test -w @dosc-syspro/app-api
```

## Deploy dedicado

Use `apps/api/deploy/Dockerfile` com contexto na raiz do monorepo:

```bash
docker build -f apps/api/deploy/Dockerfile -t dosc-syspro-api .
docker run --rm -p 3001:3000 --env-file apps/api/.env dosc-syspro-api
```

## Variáveis mínimas

Exemplo versionado:

- `apps/api/.env.example`
- `PORT` (opcional, default local `3001`)
- `DATABASE_URL`
- `DIRECT_URL` (quando usar migrations/Prisma em runtime)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `INTERNAL_API_KEY`
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_INSTANCE`
- `EVOLUTION_INSTANCE_TOKEN` (opcional)
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

## Autorização e RBAC

O backend e a fonte de verdade da autorização.

Fluxo atual:

- o usuário continua possuindo um `role` legado
- esse `role` aponta para um perfil persistido de mesma chave em `access_profile`
- permissões efetivas são resolvidas a partir de:
  - perfil base do role
  - vínculos adicionais em `user_access_profile`
  - escopo global ou por empresa

Consequências práticas:

- permissões de `DEVELOPER` e `SUPORTE` não são mais apenas hardcoded em memória
- a edição de perfis impacta o comportamento real do sistema
- o frontend consulta o contexto central de autorização em vez de depender só de matriz local

## Headers de sessão aceitos

- `x-user-id`
- `x-user-role`
- `x-company-ids`
- `x-request-id`

## Segurança de serviço (`web -> api`)

- header obrigatório: `x-internal-api-key`
- variável obrigatória: `INTERNAL_API_KEY`

## Evolution Go e Chatwoot

Observações operacionais:

- envio outbound prioriza `/send/text` e `/send/media`
- há fallback para contrato v2 quando a instalação exposta exigir
- teste de conexão usa `GET /instance/status`
- quando `evolutionInstanceId` + `metadata.evolution.webhookUrl` estiverem definidos, o teste pode reaplicar configuração via `POST /instance/connect`
- o backend não guarda histórico completo da conversa como fonte primária

Persistência local usada no fluxo atual:

- `conversation_link`
- `message_link`
- `integration_webhook_dedup`
- `company_contact`

## Portal x Chatwoot

- a relação oficial `empresa -> conta/inbox Chatwoot` vive em `settings/integrations/connections`
- conexão persistida no banco deve ser vinculada a uma `companyId`
- cada empresa pode ter no máximo uma conexão ativa
- a mesma inbox do Chatwoot não deve ficar ativa em empresas diferentes
- usuarios internos do portal (`ADMIN`, `DEVELOPER`, `SUPORTE`) são provisionados e atualizados automaticamente no Chatwoot quando criados, alterados ou desativados no portal
- `CHATWOOT_PLATFORM_API_TOKEN` s© obrigatorio para provisionamento de agente, vínculo na conta e SSO
- webhooks continuam sendo apenas transporte de eventos; cadastro de usuário e associação empresa/inbox ficam sob controle do portal

## Limites atuais

- `apps/api` ainda está em migração progressiva
- a superfície de aplicação compartilhada fica em `packages/application`, enquanto os adapters concretos do remoto agora vivem em `packages/features/remote/infra`
- ainda existem fluxos no `web` com fallback por role legado; a direção correta é reduzir isso e depender cada vez mais do contexto central de autorização do backend
