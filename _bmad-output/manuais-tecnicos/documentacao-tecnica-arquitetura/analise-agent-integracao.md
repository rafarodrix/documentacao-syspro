# Análise de Integração: apps/agent ↔ Web e Backend

**Data:** 2026-04-26
**Escopo:** `apps/agent` (Go), `apps/api` (NestJS), `apps/web` (Next.js)

---

## Visão Geral do Agent

O `apps/agent` é um **agente desktop Windows** escrito em Go, distribuído como instalador `.exe`/`.msi` via InnoSetup. Roda como serviço de sistema (`agent-service`) com uma UI de bandeja (`agent-ui`). Não compartilha código com o monorepo TypeScript — comunica-se exclusivamente via HTTP.

### Módulos internos

```
agent/
  cmd/
    agent/         → binário CLI simples
    agent-service/ → serviço Windows principal (sem UI)
    agent-ui/      → bandeja do sistema + webview
  internal/
    core/          → serviços: agent, desiredstate, heartbeat, identity, registration, reconcile
    domain/        → structs Go: DesiredState, RemoteContracts, Device, Event
    infra/
      config/      → loader de env vars
      http/        → PortalClient (todas as chamadas ao portal)
      ipc/         → servidor/cliente IPC local (agent-service ↔ agent-ui)
      storage/     → estado local em JSON criptografado (DPAPI no Windows)
      platform/    → identidade Windows (SID, hostname)
      tray/        → systray
      webview/     → Chatwoot embed + setup progress page
    modules/
      remote/      → ciclo discover → bootstrap → sync → ack (RustDesk)
      backup/      → módulo Firebird backup (gbak)
      device/      → inventário do dispositivo
      support/     → integração Chatwoot
      tunnel/      → stub (não implementado)
```

---

## Canais de Comunicação

### Agent → Portal (HTTP)

Todas as chamadas saem do `PortalClient` (`internal/infra/http/portal_client.go`). A variável `PORTAL_BASE_URL` aponta para `apps/web` em produção (`http://localhost:3000` em dev).

| Endpoint chamado pelo agent | Autenticação | Destino real |
|---|---|---|
| `POST /api/agents/register` | `x-internal-api-key` | `apps/api` (proxy via web) |
| `POST /api/agents/heartbeat` | `x-internal-api-key` | `apps/api` (proxy via web) |
| `GET /api/agents/{deviceId}/desired-state` | `x-internal-api-key` | `apps/api` (proxy via web) |
| `POST /api/remote/agents/discover` | `x-internal-api-key` | `apps/web` nativo (application package) |
| `POST /api/remote/rustdesk/bootstrap` | `x-internal-api-key` | `apps/web` nativo |
| `POST /api/remote/rustdesk/sync` | `x-internal-api-key` | `apps/web` nativo |
| `POST /api/remote/rustdesk/ack` | `x-internal-api-key` | `apps/web` nativo |
| `POST /api/integrations/chatwoot/agent-context/sync` | `x-internal-api-key` | `apps/api` (proxy via web) |

**Todos** os requests carregam `Authorization: Bearer {PORTAL_API_KEY}` + `x-internal-api-key: {PORTAL_API_KEY}` — ambos com o mesmo valor.

### Agent UI → Agent Service (IPC local)

Comunicação interna via TCP `127.0.0.1:48721` (configurável via `AGENT_IPC_ADDRESS`). A UI consulta o serviço para exibir status e eventos de telemetria na bandeja/webview.

---

## Fluxo de Ciclo de Vida do Agent

```
1. REGISTER
   agent → POST /api/agents/register
         → NestJS AgentsController.register()
         → valida payload (deviceId, hostname, os, agentVersion)
         → loga evento, retorna { registered: true }

2. HEARTBEAT (loop periódico)
   agent → POST /api/agents/heartbeat
         → NestJS AgentsController.heartbeat()
         → loga evento, retorna { received: true }
         (sem persistência em banco ainda)

3. DESIRED STATE (loop periódico)
   agent → GET /api/agents/{deviceId}/desired-state
         → NestJS AgentsService.buildDesiredState()
         → lê RemoteModuleSettings + ChatwootConfig
         → retorna DesiredState com flags: remote.enabled, support.enabled, etc.

4. RECONCILE (baseado no DesiredState)
   se remote.enabled:
     → DISCOVER → BOOTSTRAP → SYNC → ACK
   se support.enabled:
     → abre webview com widget Chatwoot
```

---

## Fluxo Remote (RustDesk)

```
DISCOVER
  agent → POST /api/remote/agents/discover
        → apps/web (nativo, via @dosc-syspro/application remoteRouter)
        → domain: processDiscover
        → retorna: bootstrapFlow, installToken, hostId, transition

  bootstrapFlow:
    pending_link          → aguarda operador linkar host no portal
    linked_host_detected  → pronto para bootstrap com installToken
    host_bootstrap_required → bootstrap obrigatório
    token_invalid         → rebootstrap necessário

BOOTSTRAP
  agent → POST /api/remote/rustdesk/bootstrap
        → apps/web (nativo)
        → domain: processBootstrap
        → retorna: agentToken, alias, serverHost, publicKey, serverConfig, defaultPassword

  agent persiste agentToken em storage local criptografado (DPAPI)

SYNC (loop principal após bootstrap)
  agent → POST /api/remote/rustdesk/sync
        → apps/web (nativo)
        → domain: processSync
        → retorna: compliance, commandQueue, expectedConfig

  CommandQueue pode conter:
    REAPPLY_ALIAS    → agent reaplicar alias no RustDesk local
    REAPPLY_CONFIG   → agent reconfigurar serverHost/apiHost/publicKey
    UPGRADE_CLIENT   → agent baixar e instalar nova versão do RustDesk
    ROTATE_TOKEN_REQUIRED → agent invalidar token e rebootstrap

ACK
  agent → POST /api/remote/rustdesk/ack
        → apps/web (nativo)
        → domain: processAck
        → confirma execução de cada comando do CommandQueue
```

---

## Separação de Responsabilidades: Web vs API para o Agent

| Responsabilidade | Onde está | Observação |
|---|---|---|
| Register + Heartbeat + DesiredState | `apps/api` (NestJS) | Roteado via proxy web |
| Remote (discover/bootstrap/sync/ack) | `apps/web` (nativo, BFF) | Usa `@dosc-syspro/application` |
| Persistência do estado remote | `packages/database` via `remote-infra` | Acessado pelo `apps/web` |
| Contratos de registro/heartbeat/desiredstate | `@dosc-syspro/contracts/agent` | Compartilhado TypeScript |
| Contratos remote | `@dosc-syspro/remote-domain` | Compartilhado TypeScript |
| Contratos Go (domain/) | `apps/agent/internal/domain/` | **Duplicados em Go** — sem geração automática |

---

## Problemas e Riscos Identificados

### A1 — Contratos duplicados Go ↔ TypeScript sem fonte única de verdade

**Severidade:** Alta

Os contratos de protocolo existem em dois lugares sem sincronização automática:

```
TypeScript (@dosc-syspro/contracts/agent):
  agentRegisterPayloadSchema → { deviceId, hostname, os, identitySource, agentVersion }
  agentHeartbeatPayloadSchema → { deviceId, agentVersion, at }
  AgentDesiredState → { version, remote, tunnel, backup, support, device }

Go (apps/agent/internal/domain/):
  RemoteDiscoverRequest, RemoteBootstrapRequest, RemoteSyncRequest, RemoteAckRequest
  DesiredState, RemoteDesiredState, TunnelDesiredState, ...
```

Se um campo for adicionado no TypeScript, o Go precisa ser atualizado manualmente — e vice-versa. Não há validação automática de compatibilidade.

**Risco:** Divergência silenciosa entre o que o backend espera e o que o agent envia.

### A2 — Register e Heartbeat sem persistência em banco

**Severidade:** Média

`AgentsService.register()` e `AgentsService.heartbeat()` apenas logam o evento e retornam sucesso. Não há persistência no banco de dados:

```typescript
// agents.service.ts - apenas loga
this.logger.log({ event: 'agent.registered', deviceId: payload.deviceId, ... });
return { success: true, data: { registered: true, ... } };
```

Consequências:
- Não há histórico de registros de agentes
- Não há visibilidade de quais agentes estão online (último heartbeat)
- Dashboard de fleet não pode exibir status real dos agentes
- O `desired-state` funciona, mas sem correlação com agentes conhecidos

### A3 — Agent aponta para `apps/web` mas parte das rotas vai para `apps/api`

**Severidade:** Média

O agent configura apenas um `PORTAL_BASE_URL`. Rotas de `/api/agents/*` são proxy para `apps/api`, enquanto rotas de `/api/remote/*` são processadas diretamente no `apps/web`. Isso é transparente para o agent, mas cria uma dependência implícita: **se `apps/api` estiver fora do ar, register/heartbeat/desired-state falham, mas remote continua funcionando**.

Não há documentação no `.env.example` distinguindo quais endpoints requerem `apps/api` ativo.

### A4 — `PORTAL_AGENT_API_ENABLED=false` como default

**Severidade:** Baixa

O config loader define `AgentAPIEnabled: false` por padrão:

```go
AgentAPIEnabled: getEnvBool("PORTAL_AGENT_API_ENABLED", false),
```

Com `false`, o agent **ignora completamente** register, heartbeat e desired-state, usando estado local como fallback. Isso significa que em deploys sem a variável configurada, o agent opera em modo desconectado silenciosamente — sem aviso visível.

### A5 — Autenticação dupla (Authorization + x-internal-api-key) com o mesmo valor

**Severidade:** Baixa

O `PortalClient` envia:
```go
req.Header.Set("Authorization", "Bearer "+c.cfg.Portal.APIKey)
req.Header.Set("x-internal-api-key", c.cfg.Portal.APIKey)
```

O backend valida apenas `x-internal-api-key`. O header `Authorization: Bearer` não é verificado por nenhum endpoint do agente — é enviado sem uso. Cria confusão sobre qual mecanismo é o real.

---

## Tabela Resumo

| # | Problema | Severidade | Ação sugerida |
|---|---|---|---|
| A1 | Contratos Go/TS duplicados sem sincronização | Alta | Documentar contrato de versão; avaliar geração de JSON Schema |
| A2 | Register/Heartbeat sem persistência no banco | Média | Criar tabela `AgentDevice` e `AgentHeartbeat` |
| A3 | Rotas do agent divididas entre web e api sem documentação | Média | Documentar no `.env.example` e no `backend-proxy.ts` |
| A4 | `PORTAL_AGENT_API_ENABLED=false` por default | Baixa | Mudar default para `true`; logar aviso quando desabilitado |
| A5 | `Authorization: Bearer` enviado mas não validado | Baixa | Remover header não utilizado do `PortalClient` |

---

## O que está bem

- **Separação de responsabilidades no Go**: `domain/` não importa infra; `core/` não importa `infra/http/`; `PortalClient` implementa interfaces locais de cada módulo — padrão ports & adapters correto
- **Resiliência no HTTP**: retry automático com backoff em status 5xx/429
- **Fallback de desired state**: quando a API está inacessível, o agent usa estado local — não trava
- **Storage criptografado**: `agentToken` e credenciais persistidas com DPAPI (Windows) — dado sensível protegido no disco
- **Fila de ACK persistente**: se o ack falhar, é enfileirado localmente e reenviado no próximo ciclo — garante entrega
- **`schemaVersion`** em cada payload de protocolo remote (discover/sync/ack) — permite evolução do contrato com retrocompatibilidade
- **IPC local tipado**: comunicação entre serviço e UI é via struct Go, não strings soltas

---

## Próximos Passos Sugeridos

1. **Imediato (A4):** Mudar `AgentAPIEnabled` default para `true` no `loader.go`
2. **Imediato (A5):** Remover `Authorization: Bearer` do `doRequestOnce` — é ruído sem efeito
3. **Curto prazo (A3):** Adicionar seção no `.env.example` distinguindo rotas web-nativas vs proxy-api
4. **Médio prazo (A2):** Criar modelo `AgentDevice` no schema Prisma + endpoint de upsert no register
5. **Médio prazo (A1):** Publicar JSON Schema dos contratos a partir dos schemas Zod (`@dosc-syspro/contracts/agent`) e usar no agent Go para validação em testes
