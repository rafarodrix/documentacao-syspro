# Revisão: Arquitetura Remote - Gaps e Melhorias

## Análise Comparativa: Documentação vs. Implementação

A documentação atual (`arquitetura-remote.mdx`) cobre bem os fluxos principais de **discover, bootstrap, sync e ack**, mas há **9 gaps significativos** entre o que está documentado e o que foi implementado em produção.

### Resumo Executivo

| Aspecto | Status Atual | Implementação | Severidade |
|---------|------------|---------------|-----------|
| Fluxo discover/bootstrap/sync/ack | ✅ Documentado | ✅ Implementado | - |
| Lifecycle do agentToken (rotate/revoke) | ❌ Não documentado | ✅ Implementado | 🔴 Alta |
| Sessions (create/list/start/stop) | ⚠️ Brevemente mencionado | ✅ Implementado | 🟡 Alta |
| Address Book (CRUD de credenciais) | ❌ Não documentado | ✅ Implementado | 🟡 Alta |
| Host Admin (link/create/update/delete) | ❌ Não documentado | ✅ Implementado | 🟡 Média |
| Heartbeat (fluxo alternativo) | ❌ Não documentado | ✅ Implementado | 🟡 Média |
| Transições de estado discover | ⚠️ Menciona 3 estados | ✅ Implementado | 🟡 Média |
| Observabilidade e logging estruturado | ❌ Não documentado | ✅ Implementado | 🟡 Média |
| Validação de token e compliance | ⚠️ Parcial | ✅ Implementado | 🟡 Média |

---

## Gap #1: Lifecycle do AgentToken (ALTA PRIORIDADE)

### Situação Atual
Documentação menciona apenas "emissão" de agentToken no bootstrap. Não documenta:
- Expiração de tokens
- Rotação de tokens
- Revogação de tokens (manual ou por expiração)
- Detecção de token inválido/expirado no sync
- Comportamento quando token é rotacionado durante sync
- Compliance checks após bootstrap

### Implementação
```typescript
// packages/remote-domain/src/use-cases/process-bootstrap.ts
agentTokenExpiresAt: deps.port.getAgentTokenExpiresAt(persisted.agentTokenIssuedAt)?.toISOString() ?? null

// Em remoteHostAdminPort
rotateHostAgentToken(input): Promise<RotateHostAgentTokenOutput>
revokeHostAgentToken(input): Promise<RevokeHostAgentTokenOutput>

// Em process-sync validation
if (!tokenContext) throw new Error("AGENT_TOKEN_INVALID")
if (isAgentTokenExpired(tokenContext)) throw new Error("AGENT_TOKEN_EXPIRED")
```

### O que falta documentar
- TTL do agentToken (valor em horas/dias)
- Fluxo de rotação: quando e por quê
- UI para rotação/revogação no portal
- Comportamento em sync quando token expirado
- Relação com compliance checks

### Impacto
- Operadores não sabem como renovar tokens
- DevOps não consegue fazer troubleshooting de token expirado
- Não fica claro o pipeline de segurança

---

## Gap #2: Sessions (ALTA PRIORIDADE)

### Situação Atual
Documentação menciona brevemente:
```
- sessao manual criada
- transicao `REQUESTED -> STARTED -> ENDED`
- bloqueio de exclusao de host com sessao aberta
- bloqueio de sessao duplicada por ticket/host
```

Não explica:
- O quê é uma sessão
- Fluxo completo criar → listar → iniciar → parar
- Quem cria (agente? portal?)
- Diferença entre listSessions (scope global vs host vs ticket)
- Integração com RustDesk ID

### Implementação
```typescript
// packages/remote-domain/src/contracts.ts
createSession(input: CreateSessionInput) // actor, scope, hostId, ticketId
listSessions(input: ListSessionsInput) // scope: "global" | "host" | "ticket"
startSession(input: StartSessionInput)
stopSession(input: StopSessionInput)
```

### O que falta documentar
- Diagrama de lifecycle: REQUESTED -> STARTED -> ENDED
- Quem inicia/para sessões (agente RustDesk ou portal?)
- Campos obrigatórios por scope
- Exemplo prático: criar sessão para ticket, listar, parar após resolução
- Restrições (não pode ter 2 ativas para mesmo host)

---

## Gap #3: Address Book + Credenciais (ALTA PRIORIDADE)

### Situação Atual
Completamente ausente da documentação. Dados não revelam:
- O quê é address book
- Quando é usado (discovery de máquinas?)
- CRUD de credenciais
- Permissões de acesso

### Implementação
```typescript
// packages/remote-domain/src/ports.ts
listAddressBook(input: ListAddressBookInput)
listAddressBookCredentials(input: ListAddressBookCredentialsInput)
createAddressBookCredential(input: CreateAddressBookCredentialInput)
rotateAddressBookCredential(input: RotateAddressBookCredentialInput)
revokeAddressBookCredential(input: RevokeAddressBookCredentialInput)
```

### O que falta documentar
- Definição de Address Book no contexto RustDesk
- Caso de uso: automação de discovery
- Fluxo CRUD com exemplos
- Integração com gateway remoto

---

## Gap #4: Host Admin Port (MÉDIA PRIORIDADE)

### Situação Atual
Apenas 1 operação mencionada indiretamente: `linkDiscoveredHost`. Não documenta:
- CRUD completo (create, read, update, delete)
- Quando criar vs. link
- Transição de discovered → host
- Deleção com validações

### Implementação
```typescript
// packages/api/src/remote-host-admin-port.ts
linkDiscoveredHost(input): Promise<LinkDiscoveredHostOutput>
createHost(input): Promise<CreateHostOutput>
updateHost(input): Promise<UpdateHostOutput>
deleteHost(input): Promise<DeleteHostOutput>
```

### O que falta documentar
- Diferença: create direto vs. link discovered
- Fluxo recomendado (descobrir → linkar é melhor?)
- Validações na deleção (não deletar com sessão aberta)
- Dados preservados/limpos na deleção

---

## Gap #5: Heartbeat (MÉDIA PRIORIDADE)

### Situação Atual
"Heartbeat" é mencionado apenas como "sync recorrente". Não está claro:
- Se há uma rota específica `/heartbeat`
- Diferença entre heartbeat e sync
- Frequência esperada
- Payload mínimo

### Implementação
```typescript
// packages/remote-domain/src/use-cases/process-heartbeat.ts
export async function processHeartbeat(payload, deps)

// Define em contracts.ts
export const processHeartbeatInputSchema = z.object({
  agentToken: z.string().min(1),
  // pode incluir sysproUpdates[]
})
```

### O que falta documentar
- Existência de rota alternativa `POST /api/remote/heartbeat`
- Frequência recomendada (30s? 5m? 1h?)
- Quando usar heartbeat vs. sync (payload mínimo vs. full)

---

## Gap #6: Transições de Estado Discover (MÉDIA PRIORIDADE)

### Situação Atual
Documentação menciona "fluxos oficiais" (discovery vs. bootstrap direto) mas não explica bem as **3 transições mútuas de estado**:

```
pending_link → descoberta inicial, aguarda linkagem do admin
linked_host_detected → host já vinculado, continua sync
host_bootstrap_required → host vinculado mas token inválido/expirado
```

### Implementação
```typescript
// packages/api/src/routers/remote.ts
const DISCOVER_TRANSITIONS = {
  pending_link: {
    state: "DISCOVERY_PENDING_LINK",
    nextStep: "link_discovered_host_then_bootstrap",
    nextEndpoint: "/api/remote/discovered-hosts/:id/link",
    allowDiscoveryHeartbeat: true,
    requiresAuthenticatedBootstrap: false,
  },
  linked_host_detected: {
    state: "DISCOVERY_LINKED_HOST",
    nextStep: "host_already_linked_keep_bootstrap_sync_flow", 
    nextEndpoint: "/api/remote/rustdesk/sync",
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: false,
  },
  host_bootstrap_required: {
    state: "DISCOVERY_LINKED_HOST_BOOTSTRAP_REQUIRED",
    nextStep: "run_authenticated_bootstrap",
    nextEndpoint: "/api/remote/rustdesk/bootstrap",
    allowDiscoveryHeartbeat: false,
    requiresAuthenticatedBootstrap: false,
  }
}
```

### O que falta documentar
- Árvore de decisão clara em formato visual
- Quando passa de pending_link → linked_host_detected
- Gatilho para host_bootstrap_required (token inválido)

---

## Gap #7: Observabilidade e Logging Estruturado (MÉDIA PRIORIDADE)

### Situação Atual
Documentação não menciona nenhuma métrica ou observable.

### Implementação
```typescript
// Código de logging estruturado em múltiplas portas
logger.info("remote.domain.bootstrap.succeeded", {
  hostId: persisted.id,
  companyId: persisted.companyId,
  rustdeskId: persisted.agentExternalId,
})

logger.warn(event: string, fields: Record<string, unknown>)
logger.error(event: string, fields: Record<string, unknown>)
```

### O que falta documentar
- Eventos loggados (lista completa)
- Campos inclusos em cada evento
- Integração com observabilidade central (se existir)
- Diagnóstico baseado em logs

---

## Gap #8: Validação de Token e Compliance (MÉDIA PRIORIDADE)

### Situação Atual
Documentação toca brevemente em compliance na resposta de bootstrap, mas não documenta:
- Checklist de compliance após bootstrap
- O quê cada flag significa
- Impacto quando compliance falha

### Implementação
```typescript
// Em process-bootstrap.ts
const compliance = {
  aliasMatch: normalizeComparable(persisted.lastKnownRustDeskAlias) === normalizeComparable(alias),
  versionMatch: normalizeComparable(persisted.lastKnownRustDeskVersion) === normalizeComparable(configProfile.targetVersion),
  serverHostMatch: ...,
  apiHostMatch: ...,
  publicKeyMatch: ...,
}
```

### O que falta documentar
- Checklist completo de compliance
- Como agente verifica compliance
- O quê fazer quando falha
- Retry vs. reiniciar vs. novo bootstrap

---

## Gap #9: Transições de Sync + Payload Size (MÉDIA PRIORIDADE)

### Situação Atual
Documentação explica bem a **otimização** de payload (hash-based incremental), mas não explica:
- As transições de estado **durante sync** (não apenas ao descobrir)
- Sincronização bidirecional (comandos → agente, updates ← portal)
- Deferral de comandos pending

### Implementação
```typescript
// Em contracts.ts ProcessSyncOutput
syncDirectives: SyncCommandDirective[]
compliance: SyncCompliance

// Cada comando tem:
export type SyncCommandType = string // customizável por domínio
```

### O que falta documentar
- Tipos de comando suportados (lista dinâmica)
- Payload máximo recomendado por comando
- Fila de comandos pendentes vs. executados

---

## Recomendações de Melhoria

### Prioridade 1 (Implementar imediatamente)
1. Criar seção "Token Lifecycle" com rotate/revoke
2. Criar seção "Sessions" com fluxo completo
3. Documentar "Address Book" e cenários de uso
4. Adicionar diagrama de transições discover

### Prioridade 2 (Próximo sprint)
1. Documentar Host Admin (create, update, delete)
2. Explicar Heartbeat como alternativa leve
3. Documentar Observability (eventos, campos)
4. Adicionar "Validation & Compliance" seção

### Prioridade 3 (Melhorias futuras)
1. Criar how-to: "Como adicionar nova transição ao discover"
2. Criar troubleshooting por erro (similar a Zammad)
3. Documentar limites e quotas (rate limit, max sessions, etc.)
4. Exemplos de integração mobile/API

---

## Conclusão

A implementação está **muito à frente** da documentação. Os 4 fluxos principais (discover, bootstrap, sync, ack) estão bem implementados, mas:

1. **Features adicionadas não estão documentadas**: sessions, address book, host admin
2. **Fluxos secundários não são explicados**: token lifecycle, heartbeat, transitions
3. **Observabilidade não é mencionada**: não há guia de diagnóstico

Sugerimos criar 2 novos documentos complementares:
- `resiliencia-remote.mdx` — Token lifecycle, observability, compliance
- `como-adicionar-sessao.mdx` — Prático para criar/gerenciar sessões

E expandir `arquitetura-remote.mdx` com as 9 melhorias listadas acima.
