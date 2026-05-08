# Comunicação entre Apps

> Como os diferentes apps e packages do monorepo se comunicam em runtime.

---

## Diagrama geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        apps/web (Next.js)                        │
│                                                                  │
│  Pages ──► tRPC Client ──────────────────────────────────►      │
│  Pages ──► /api/[route] (Next API Routes → backend-proxy) ──►   │
└──────────────────────────────────────────────────────────────────┘
                │                         │
                │ tRPC (HTTP)             │ REST proxy
                ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        apps/api (NestJS)                         │
│                                                                  │
│  tRPC Router ◄──────────────────────────────────────────────    │
│  REST Controllers ◄─────────────────────────────────────────    │
│  Webhooks (Chatwoot, Evolution) ◄───────── Internet            │
│       │                                                         │
│       ├──► Prisma ──► PostgreSQL                                │
│       ├──► R2 (Cloudflare) ──► object storage                  │
│       ├──► Chatwoot API                                         │
│       ├──► Evolution API (WhatsApp)                             │
│       └──► remote-domain (use cases) ──► remote-infra           │
└─────────────────────────────────────────────────────────────────┘
                │
                │ REST (agentToken)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     apps/agent (Go + Wails)                      │
│                                                                  │
│  agent-service.exe ──► POST /api/remote/rustdesk/heartbeat      │
│  agent-service.exe ──► POST /api/remote/rustdesk/sync           │
│  agent-service.exe ──► POST /api/remote/rustdesk/ack            │
│         │                                                        │
│         │ IPC (named pipe / Unix socket)                         │
│         ▼                                                        │
│  agent-ui.exe (Wails) ──► WebView2 (React frontend local)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Web → API: tRPC

O frontend usa tRPC para chamadas type-safe. A configuração fica em:
- **servidor**: `apps/api/src/modules/trpc/trpc.router.ts`
- **cliente**: `apps/web/src/` (configuração do tRPC client)

Todas as chamadas passam por `POST /trpc/[procedure]`.

**Exemplo de procedure:**
```typescript
// servidor (api) — sub-routers registrados
companies.list               // query
companies.create             // mutation
users.list                   // query
users.update                 // mutation
users.getCurrentProfile      // query
users.getChatwootSsoLink     // query
```

Os types são automaticamente inferidos — sem geração de código manual.

---

## Web → API: REST Proxy (Next.js API Routes)

Para domínios que ainda não migraram para tRPC, o `apps/web` expõe API Routes em `/app/api/` que fazem proxy para o NestJS.

O arquivo `src/app/api/_shared/backend-proxy.ts` centraliza a lógica de proxy:
- Repassa headers de autenticação
- Encaminha para `NEXT_PUBLIC_API_URL` (ou `APP_BACKEND_API_URL`)
- Preserva método HTTP, body e query params

Rotas relevantes no proxy:
- `/api/remote/**` → administração de hosts remotos
- `/api/tickets/**` → tickets e chamados
- `/api/contacts/**` → contatos
- `/api/platform/**` → configurações e integrações
- `/api/remote-admin/**` → procedimentos remotos privilegiados

> **Domínios já migrados para tRPC (sem proxy REST):**
> - `companies` → `trpc.companies.*`
> - `users` → `trpc.users.*`

---

## API → Agent: REST com agentToken

O agente **nunca** faz push; o servidor publica comandos em uma fila que o agente lê no próximo ciclo.

**Protocolo de ciclo do agente:**

```
1. [agent] POST /api/remote/rustdesk/heartbeat
   → body: { agentToken, rustdeskId, ...stats }
   ← resposta: { ok: true, pendingCommands: [...] }

2. [agent] Processa comandos recebidos

3. [agent] POST /api/remote/rustdesk/ack
   → body: { agentToken, commandId, result }
   ← resposta: { ok: true }

4. [agent] POST /api/remote/rustdesk/sync
   → body: { agentToken, sysproUpdates: [...] }
   ← resposta: { ok: true }
```

**Intervalos:**
- Heartbeat: 30 segundos
- DesiredState: 60 segundos
- Reconcile: 45 segundos

---

## Agent → API: Bootstrap e Discovery

Antes de entrar no ciclo de heartbeat, o agente passa por dois fluxos:

### Discovery (primeiro contato)
```
[agent] POST /api/remote/rustdesk/discover
→ body: { discoveryToken, rustdeskId, hostname, ... }
← resposta: { transition: "REGISTER" | "LINK" | "ALREADY_LINKED" }
```

### Bootstrap (registro)
```
[agent] POST /api/remote/rustdesk/bootstrap
→ body: { installToken, rustdeskId, hostname, ... }
← resposta: { agentToken, rustdeskConfig, expiresAt }
```

Após bootstrap, o agente persiste `agentToken` localmente (DPAPI no Windows) e usa nos ciclos de heartbeat.

---

## Agent: IPC local (service ↔ ui)

Dentro da máquina remota, dois binários se comunicam via IPC:

| Componente         | Protocolo            | Plataforma      |
|--------------------|----------------------|-----------------|
| Windows            | Named Pipe           | `\\.\pipe\...`  |
| Outros (dev/test)  | Unix Domain Socket   | `/tmp/agent.sock` |

O `agent-service.exe` é o servidor IPC; o `agent-ui.exe` (Wails) é o cliente.

**Dados trocados via IPC:**
- Estado atual do serviço (módulos ativos, status)
- Comandos de UI → serviço (ex: forçar reconcile)
- Logs de atividade para exibição na UI

---

## Integrações externas: Webhooks

### Evolution (WhatsApp) → API
```
POST /api/integrations/evolution/webhook
→ payload Evolution (mensagem recebida, status, etc.)
→ integration-webhook-dedup.service (deduplicação)
→ process-incoming-message.usecase
→ persiste Conversation + ConversationMessage
→ sincroniza com Chatwoot se configurado
```

### Chatwoot → API
```
POST /api/integrations/chatwoot/webhook
→ payload Chatwoot (conversa atualizada, agente atribuído, etc.)
→ sincroniza status bidirecional com Evolution
→ atualiza Conversation no banco
```

---

## Fluxo de autenticação

1. Usuário faz login via `apps/web` (Better Auth)
2. Better Auth cria session cookie (HttpOnly)
3. Todas as chamadas tRPC e REST proxy incluem o cookie
4. API valida session via Better Auth middleware
5. `AuthorizationService` resolve o escopo (empresa, role, permissões)

**RBAC:**
- `User` tem `Membership` com `role` (ADMIN, SUPORTE, CLIENTE_ADMIN, CLIENTE_USER, DEVELOPER)
- `AccessProfile` agrupa `Permission`s granulares
- Cada operação sensível verifica o escopo: acesso global vs. acesso por empresa
