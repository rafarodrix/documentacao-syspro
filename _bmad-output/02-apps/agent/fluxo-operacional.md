# Agent — Fluxo Operacional

> Como o agente se registra, opera e executa comandos do portal. Atualizado em: 2026-05-05

---

## Ciclo de vida completo

```
Instalação
    │
    ▼
[Discovery] ──────────────────────────────────────────────────────
    POST /api/remote/agents/discover
    { discoveryToken, rustdeskId, hostname, OS, ... }
    ◄── { transition: "REGISTER" | "LINK" | "ALREADY_LINKED" }
    │
    ▼ (se REGISTER)
[Bootstrap] ──────────────────────────────────────────────────────
    POST /api/remote/rustdesk/bootstrap
    { installToken, rustdeskId, hostname, ... }
    ◄── { agentToken, rustdeskConfig, expiresAt }
    │
    ▼ (persiste agentToken com DPAPI)
[Ciclo Operacional] ───────────────────────────────────────────────

    ┌─────────── a cada 30s ──────────────┐
    │  POST /api/remote/rustdesk/heartbeat │
    │  { agentToken, rustdeskId, stats }   │
    │  ◄── { pendingCommands: [...] }       │
    └──────────────────────────────────────┘

    ┌─────────── a cada 45s ──────────────┐
    │  Reconcile: Inspect → Plan → Apply  │
    │  Aplica comandos pendentes           │
    │  POST /api/remote/rustdesk/ack       │
    │  { agentToken, commandId, result }   │
    └──────────────────────────────────────┘

    ┌─────────── a cada 60s ──────────────┐
    │  POST /api/remote/rustdesk/sync      │
    │  { agentToken, sysproUpdates, ... }  │
    └──────────────────────────────────────┘
```

---

## Fase 1 — Discovery

O agente usa um `discoveryToken` (gerado no instalador ou fornecido pelo portal) para se apresentar pela primeira vez.

**Payload enviado:**
```json
{
  "discoveryToken": "disc_abc123",
  "rustdeskId": "123456789",
  "hostname": "PC-CLIENTE-01",
  "os": "Windows 11",
  "arch": "x64"
}
```

**Respostas possíveis:**

| `transition`      | Significado                                          | Próximo passo          |
|-------------------|------------------------------------------------------|------------------------|
| `REGISTER`        | Token válido, máquina não registrada ainda           | Bootstrap              |
| `LINK`            | Token válido, vincular a host descoberto existente   | Bootstrap              |
| `ALREADY_LINKED`  | Máquina já registrada — usar token existente         | Heartbeat              |

---

## Fase 2 — Bootstrap (Vinculação de Máquina)

O agente troca o `installToken` por um `agentToken` permanente.

**Payload enviado:**
```json
{
  "installToken": "inst_xyz789",
  "rustdeskId": "123456789",
  "hostname": "PC-CLIENTE-01",
  "os": "Windows 11",
  "sysproPath": "C:\\Syspro\\Server\\SysproServer.exe"
}
```

**Resposta:**
```json
{
  "agentToken": "agt_...",
  "expiresAt": "2027-05-05T00:00:00Z",
  "rustdeskConfig": {
    "relayServer": "relay.trilink.com.br",
    "alias": "PC-CLIENTE-01"
  }
}
```

O `agentToken` é persistido localmente com DPAPI e usado em todas as chamadas subsequentes.

---

## Fase 3 — Heartbeat (loop de 30s)

Mantém o host marcado como online no portal e recebe comandos pendentes.

**Payload enviado:**
```json
{
  "agentToken": "agt_...",
  "rustdeskId": "123456789",
  "uptime": 86400,
  "cpuUsage": 12.5,
  "ramUsage": 45.2
}
```

**Resposta:**
```json
{
  "ok": true,
  "pendingCommands": [
    { "id": "cmd_001", "type": "REAPPLY_CONFIG", "payload": { ... } }
  ]
}
```

---

## Fase 4 — Reconcile (loop de 45s)

O reconcile aplica comandos recebidos no heartbeat:

```
Inspect: lê estado atual (RustDesk rodando? Configurado corretamente?)
Plan:    calcula diferença entre current state e desired state
Apply:   executa ações para alinhar estados
```

Após executar cada comando, envia ACK:

```json
POST /api/remote/rustdesk/ack
{
  "agentToken": "agt_...",
  "commandId": "cmd_001",
  "result": "SUCCESS",
  "message": "Configuração reaplicada com sucesso"
}
```

---

## Fase 5 — Sync (loop de 60s)

Reporta dados do Syspro instalado na máquina:

```json
POST /api/remote/rustdesk/sync
{
  "agentToken": "agt_...",
  "sysproUpdates": [
    {
      "path": "C:\\Syspro\\Server\\SysproServer.exe",
      "version": "3.12.1",
      "lastModified": "2026-04-20T10:00:00Z"
    }
  ],
  "deviceInfo": { ... }
}
```

---

## Comandos disponíveis (RemoteAgentCommand)

| Tipo                    | O que o agente faz                                     |
|-------------------------|--------------------------------------------------------|
| `REAPPLY_ALIAS`         | Reconfigura o alias no RustDesk (`rustdesk-config.toml`) |
| `REAPPLY_CONFIG`        | Reaplica toda a config RustDesk (servidor relay, etc.) |
| `UPGRADE_CLIENT`        | Baixa e instala nova versão do RustDesk                |
| `ROTATE_TOKEN_REQUIRED` | Solicita novo agentToken no próximo ciclo               |

---

## Status operacional (visto no portal)

O portal calcula o status baseado no `lastHeartbeatAt`:

| Status UI            | Termo técnico   | Critério                              |
|----------------------|-----------------|---------------------------------------|
| Online               | `ONLINE`        | Heartbeat < 2 minutos atrás           |
| Contato recente      | `RECENT`        | Heartbeat entre 2 e 15 minutos        |
| Sem contato          | `OFFLINE`       | Heartbeat > 15 minutos                |
| Mal configurado      | `MISCONFIGURED` | Config ou token ausente/inválido      |
| Sessão em andamento  | `SESSION_BUSY`  | Sessão RustDesk ativa                 |

**UI/UX:** O portal usa o termo **"Último contato da máquina"** para `lastHeartbeatAt`.

---

## Nomenclatura oficial (portal vs. técnica)

| Texto no portal (UI)             | Termo técnico (API/código)         |
|----------------------------------|------------------------------------|
| Vinculação de Máquina            | `bootstrap` / `installToken`       |
| Renovação de Credencial          | rotação de `agentToken`            |
| Último contato da máquina        | `lastHeartbeatAt`                  |
| Sem contato recente              | status `OFFLINE`                   |

> Regra: evitar jargões técnicos no portal e manuais para clientes. Manter termos técnicos em logs, código, contratos de API.

---

## Diretório monitorado (Syspro)

Precedência para determinar o caminho do Syspro Server:

1. `installationDirectory` configurado na **empresa** (fonte primária)
2. `sysproUpdates[].path` reportado pelo **agente** (auxiliar)
3. Padrão: `C:\Syspro\Server\SysproServer.exe`
