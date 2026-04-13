# Como Gerenciar Sessões e AgentTokens

## Rotina 1: Verificar Saude do AgentToken

**Situacao**: Agente nao esta respondendo em sync/heartbeat. Suspeita: token expirado ou revogado.

<Steps>

<Step>
Acessar detalhe do host em `/portal/plataforma-remota/host/:hostId`
</Step>

<Step>
Verificar campo **"Status"** do host:
- `ACTIVE` + heartbeat recente → token valido
- `ACTIVE` + **sem heartbeat > 1h** → possivel token expirado
- `INACTIVE` → host desativado (revogacao manual anterior)
</Step>

<Step>
Clicar em "Renovar Credencial" para forcar novo bootstrap:
```
POST /api/remote/host/{hostId}/agent-token/rotate
{
  "reason": "heartbeat_timeout_suspected_token_expiration"
}
```

Backend:
- Marca host com flag `BOOTSTRAP_REQUIRED`
- Invalida token anterior
- Agente detecta invalidade em proxima sync: `{"error": "AGENT_TOKEN_INVALID"}`
- Agente e instruido a chamar bootstrap automaticamente
</Step>

<Step>
Aguardar 5-10 minutos ate agente executar novo bootstrap automaticamente.

Alternativa: forcar reinicializacao do agente no host via RustDesk (remoto).
</Step>

<Step>
Confirmar saude:
- Verificar `lastHeartbeatAt` atualizado nos ultimos 5 minutos.
- **Validar Telemetria em Tempo Real**: Na aba "Tecnico", os cartoes de CPU, RAM e Disco devem estar atualizando e pintando graficos/barras azuis. Se estiverem cinzas ("Offline"), a telemetria SSE nao esta chegando.
- Log deve conter evento `remote.domain.sync.started` com novo token.
</Step>

</Steps>

**O quê nao fazer**:

❌ Revogar token quando suporte precisar apenas renovar (perda permanente de acesso, requer bootstrap completo)

❌ Renovar toda hora pensando que resolve problemas de conectividade (problema pode ser rede ou agente parado)

**Cuando chamar suporte**:

- Host continua sem heartbeat apos renovacao + restart do agente
- Token renovado mas agente relata erro de conectividade diferente

---

## Rotina 2: Revogar Token (Permanentemente)

**Situacao**: Suspeita de comprometimento de credencial. Necessario desativar acesso completamente.

<Steps>

<Step>
Entrar em `/portal/plataforma-remota/host/:hostId` → "Mais opcoes" → "Revogar Credencial"

```
POST /api/remote/host/{hostId}/agent-token/revoke
{
  "reason": "suspected_credential_compromise"
}
```
</Step>

<Step>
Sistema marca token como revogado permanentemente.

Proxima chamada de sync/heartbeat do agente retorna:
```json
{
  "error": "AGENT_TOKEN_REVOKED",
  "message": "Credencial revogada pela administracao. Novo bootstrap necessario."
}
```
</Step>

<Step>
Agente fica **desconectado permanentemente** ate novo bootstrap com `installToken` valido.

Para reativar: suporte deve forcar novo bootstrap via NSIS ou PowerShell.
</Step>

<Step>
Confirmar revogacao em logs:
```
event: "remote.domain.token.revoked"
hostId: "host-123"
revokedBy: "admin@company.com"
reason: "suspected_credential_compromise"
timestamp: "2026-03-28T14:30:00.000Z"
```
</Step>

</Steps>

**Importante**:

⚠️ **Evitar durante horas de trabalho** — usuario perdera acesso remoto ate novo bootstrap

⚠️ **Documentar motivo** — compliance audit requer rastreamento

⚠️ **Notificar usuario/suporte** — agente ficara offline ate acao manual

---

## Rotina 3: Criar Sessao para Acesso Remoto

**Situacao**: Suporte precisa acessar maquina X para resolver ticket Y.

<Steps>

<Step>
Acessar detalhe do host `/portal/plataforma-remota/host/:hostId`
</Step>

<Step>
Clicar em aba "Sessoes" → "+ Nova Sessao"

```
POST /api/remote/session/create
{
  "actor": "suporte@company.com",
  "scope": "host",
  "hostId": "host-123",
  "ticketId": "ticket-456"
}
```

Response:
```json
{
  "sessionId": "session-789",
  "status": "REQUESTED",
  "createdAt": "2026-03-28T15:00:00.000Z",
  "hostName": "ERP-MATRIZ-01",
  "rustdeskId": "212345678",
  "accessUrl": "rustdesk://212345678"
}
```
</Step>

<Step>
Status vai de `REQUESTED` → `STARTED` (manual ou automatico)

Clicar em "Iniciar Sessao" para marcar como `STARTED`
</Step>

<Step>
Abrir RustDesk app → conectar ao `rustdeskId` (ex: 212345678)

Agente autoriza conexao automaticamente (suporte ja logado no portal)
</Step>

<Step>
Apos terminar: clicar "Parar Sessao"

Status vai para `ENDED`, conexao encerrada imediatamente.
</Step>

<Step>
Confirmar auditoria:
```
event: "remote.domain.session.ended"
sessionId: "session-789",
actor: "suporte@company.com",
hostId: "host-123",
duration: "00:15:30",
endedBy: "suporte@company.com"
```
</Step>

</Steps>

**Constraints**:

- Nao pode ter 2 sessoes ativas para mesma maquina simultaneamente
- Nao pode deletar host com sessao aberta
- Scope `global` permite listar todas maquinas pertencentes a empresa
- Scope `host` restringe acesso a uma maquina especifica
- Scope `ticket` vincula sessao a ciclo de vida do ticket

**Troubleshooting**:

❓ Sessao criada mas agente nao conecta

→ Verificar se agente esta online: `lastHeartbeatAt < 5min`

→ Verificar firewall entre agente e RustDesk server

→ Tentar reconectar ou reiniciar RustDesk app no host

❓ Sessao criada mas "Iniciar" (start) nao funciona

→ Agente pode estar em estado inconsistente

→ Forcar revogacao + novo bootstrap

---

## Rotina 4: Criar Address Book para Descoberta em Massa

**Situacao**: Suporte precisa descobrir todas maquinas em subnet sem pre-registro. Credencial AD necessaria.

<Steps>

<Step>
Acessar `/portal/configuracoes?tab=remote` → "Address Book"
</Step>

<Step>
Clicar "+ Nova Credencial"

```
POST /api/remote/address-book/credential/create
{
  "name": "AD-Matrix-Default",
  "type": "ACTIVE_DIRECTORY",
  "username": "svc_discovery@company.ad",
  "password": "***",
  "domain": "company.ad"
}
```

Response:
```json
{
  "credentialId": "cred-abc123",
  "name": "AD-Matrix-Default",
  "type": "ACTIVE_DIRECTORY",
  "createdAt": "2026-03-28T15:00:00.000Z",
  "status": "ACTIVE"
}
```
</Step>

<Step>
Credencial e armazenada criptografado no vault (nunca retorna plaintext).
</Step>

<Step>
Usar credencial em descoberta:

```
POST /api/remote/agents/discover
{
  "discoveryToken": "REMOTE_DISCOVERY_TOKEN",
  "credentialId": "cred-abc123",
  "subnet": "192.168.1.0/24"
}
```

Portal varre subnet com credencial de AD, descobre maquinas automaticamente.
</Step>

<Step>
Validacoes de seguranca:
- Credencial nunca e logada em plaintext
- Auditoria registra quem usou credencial, quando e em qual subnet
- Acesso restrito a ADMIN e DEVELOPER roles
</Step>

<Step>
Para renovar credencial (rotacao de senha):

```
POST /api/remote/address-book/credential/{credentialId}/rotate
{
  "newPassword": "***"
}
```

Operacoes em progresso nao sao interrompidas (credencial anterior permanece valida ate timeout).
</Step>

<Step>
Para desativar credencial:

```
DELETE /api/remote/address-book/credential/{credentialId}
```

Proximas descobertas usando esta credencial falharao com erro `CREDENTIAL_NOT_FOUND`.
</Step>

</Steps>

**Security Best Practices**:

🔒 **Usar conta de servico dedicada** — nao compartilhar credencial de admin

🔒 **Rotacionar senha periodicamente** — ex: cada 90 dias

🔒 **Verificar auditoria regularmente** — suspeitas de abuso: bloqueie credencial imediatamente

🔒 **Mnca comitar passwords em codigo** — usar `REMOTE_ADDRESS_BOOK_CREDENTIALS` env var

---

## Rotina 5: Diagnosticar Token Expirado via Logs

**Situacao**: Agente parou de chamar sync. Verificar se token expirou.

<Steps>

<Step>
Buscar logs estruturados por `hostId`:

```bash
grep -r '\"hostId\": \"host-123\"' /var/log/remote/
```

Procurar por:
- `remote.domain.sync.failed` com status `AGENT_TOKEN_EXPIRED`
- `remote.domain.bootstrap.succeeded` ultimo timestamp
</Step>

<Step>
Caso encontre `AGENT_TOKEN_EXPIRED` recente:

```json
{
  "event": "remote.domain.sync.failed",
  "hostId": "host-123",
  "error": "AGENT_TOKEN_EXPIRED",
  "agentTokenIssuedAt": "2026-01-01T10:00:00.000Z",
  "agentTokenExpiresAt": "2026-03-30T10:00:00.000Z",
  "currentTime": "2026-03-31T15:00:00.000Z",
  "timestamp": "2026-03-31T15:00:00.000Z"
}
```

Token expirou, agente vai tentar fazer novo bootstrap automaticamente.
</Step>

<Step>
Se agente nao refaz bootstrap apos 30min:

→ Forcar renovacao de credencial via UI

→ Reinicializar agente via commands (se suporte conseguir acesso remoto)

→ Escalacionar para instalacao nova do agente se problemas persistirem
</Step>

</Steps>

---

## Checklist de Compliance Apos Bootstrap

Mesmo apos bootstrap bem-sucedido, validacoes continuam:

- [ ] `aliasMatch` — alias reportado pela maquina bate com esperado
- [ ] `versionMatch` — versao RustDesk instalada = version target config
- [ ] `serverHostMatch` — host RustDesk = config (ex: acesso.trilinksoftware.com.br)
- [ ] `apiHostMatch` — api host RustDesk = config
- [ ] `publicKeyMatch` — public key hash = config

Se algum falhar:

```json
{
  "event": "remote.domain.bootstrap.compliance_failed",
  "hostId": "host-123",
  "compliance": {
    "aliasMatch": false,
    "versionMatch": true,
    "serverHostMatch": true,
    "apiHostMatch": true,
    "publicKeyMatch": true
  },
  "mismatches": {
    "aliasMatch": {
      "expected": "ERP-MATRIZ-01",
      "received": "ERP-MATRIZ"
    }
  }
}
```

Acao recomendada:

→ Avisar suporte de mismatch

→ Forcar novo bootstrap se mismatch critico (ex: serverHostMatch)

→ Monitore alias mismatch como aviso (pode ser legítimo se usuario renomeou maquina)

---

## Troubleshooting Rapido

| Sintoma | Causa Provavel | Solucao |
|---------|----------------|--------|
| Agente offline > 1h | Token expirado ou revogado | Renovar credencial |
| "AGENT_TOKEN_INVALID" erro | Token foi rotacionado | Aguardar novo bootstrap automatico |
| Compliance falhou (alias mismatch) | Usuario renomeou maquina | Atualizar alias no portal ou forcar novo bootstrap |
| Sessao nao inicia | Agente offline ou firewall | Verificar heartbeat + firewall RustDesk |
| Erro ao listar sessions | Permissao insuficiente (nao ADMIN) | Verificar role do usuario |
| Address book credential nao funciona | Credencial expirou / senha errada | Renovar credencial com nova senha |

---

## Proximos Passos

### Para Suporte

- Usar Rotina 1 diariamente: verificar saude de tokens
- Escalacionar para DevOps apenas se problema persistir apos rotate

### Para DevOps

- Monitorar logs `remote.domain.*` diariamente
- Alertar quando `AGENT_TOKEN_EXPIRED` ocorre em > 5 hosts por hora
- Manter credenciais de Address Book rotacionadas a cada 90 dias

### Para Developers

- Consultar `packages/remote-domain/src/contracts.ts` para tipos esperados
- Integrar novos commands em `SyncCommandDirective`
- Adicionar novos compliance checks em `BootstrapCompliance`

