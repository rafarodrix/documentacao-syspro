# app/agent — Agente Windows (Go + Wails)

> Stack: Go 1.26 · Wails v2 · RustDesk · IPC (Named Pipe)
> Atualizado em: 2026-05-05

---

## Responsabilidade

O `apps/agent` é uma aplicação desktop para Windows que:
- Registra e mantém a máquina conectada ao portal Trilink
- Gerencia o RustDesk (acesso remoto) na máquina local
- Coleta dados de hardware e relatórios do Syspro
- Executa backups do banco Firebird
- Expõe uma UI local (Wails/React) para o usuário final

---

## Dois binários independentes

O agente compila em **dois binários distintos** que se comunicam via IPC:

```
agent-service.exe
  ├── Roda como Windows Service (LocalSystem)
  ├── Executa todo o trabalho crítico em background
  ├── Servidor IPC (named pipe)
  └── Responsabilidades:
      - registro e bootstrap no portal
      - heartbeat e sync periódico
      - reconcile de estado desejado
      - módulos: remote, backup, device, support, tunnel

agent-ui.exe  (alias: agent.exe)
  ├── Aplicação desktop Wails (WebView2 + React)
  ├── Exibe estado, chat e pipeline de provisionamento
  ├── Cliente IPC (conecta ao agent-service)
  └── Responsabilidades:
      - UI de onboarding e status
      - Timeline de progresso
      - Chat de suporte ao vivo
```

---

## Estrutura de arquivos

```
apps/agent/
├── main.go                    ← entry point do agent-ui (Wails)
├── wails.json                 ← configuração Wails (binário: agent-ui)
├── go.mod / go.sum
│
├── cmd/
│   ├── agent/main.go          ← alias do agent-ui
│   └── agent-service/main.go  ← entry point do agent-service
│
├── internal/
│   ├── app/
│   │   ├── bootstrap.go       ← bootstrap do serviço (DI completo)
│   │   ├── ui_bootstrap.go    ← bootstrap da UI (IPC client + Wails host)
│   │   ├── container.go       ← struct Container (AgentService, IPCServer, AgentUI, UIHost)
│   │   ├── run.go             ← RunService(), RunUI(), RunServiceDebug()
│   │   ├── install_runtime.go ← instala RustDesk e dependências
│   │   ├── runtime_lock.go    ← lock para evitar múltiplas instâncias
│   │   └── secrets.go         ← leitura/escrita de secrets (DPAPI no Windows)
│   │
│   ├── domain/                ← tipos de domínio do agente
│   │   ├── applied_state.go   ← estado aplicado atual
│   │   ├── current_state.go   ← estado atual observado
│   │   ├── desired_state.go   ← estado desejado (recebido do portal)
│   │   ├── device.go          ← dados de hardware do dispositivo
│   │   ├── event.go           ← eventos de módulos
│   │   ├── module_state.go    ← estado de cada módulo
│   │   ├── reconcile_plan.go  ← plano de ações do reconcile
│   │   ├── remote_contracts.go ← constantes de contratos (discover, bootstrap, sync, ack)
│   │   ├── result.go          ← tipos de resultado
│   │   └── support_context.go ← contexto de sessão de suporte
│   │
│   ├── core/                  ← serviços core do agente
│   │   ├── agent/service.go   ← coordena lifecycle principal
│   │   ├── desiredstate/      ← busca e persiste desired state (loop 60s)
│   │   ├── heartbeat/         ← envia heartbeat ao portal (loop 30s)
│   │   ├── identity/          ← resolve e persiste identidade local
│   │   ├── reconcile/         ← Inspect → Plan → Apply (loop 45s)
│   │   ├── registration/      ← bootstrap e registro
│   │   └── ui_state/          ← sincroniza estado com UI via IPC
│   │
│   ├── modules/               ← módulos funcionais plugáveis
│   │   ├── remote/            ← integração RustDesk
│   │   ├── backup/            ← backup Firebird via gbak
│   │   ├── device/            ← coleta de hardware
│   │   ├── support/           ← funcionalidades de suporte remoto
│   │   └── tunnel/            ← gerenciamento de túneis (stub)
│   │
│   ├── infra/                 ← infraestrutura do agente
│   │   ├── config/            ← leitura de config com Zod-like (Go)
│   │   ├── http/portal_client.go ← cliente HTTP para o portal Trilink
│   │   ├── ipc/               ← servidor e cliente IPC
│   │   ├── logging/           ← logger estruturado
│   │   ├── platform/          ← identidade Windows (registry, DPAPI)
│   │   ├── runtime/           ← executor de processos externos
│   │   ├── storage/           ← persistência local (atomic file, DPAPI)
│   │   ├── telemetry/         ← telemetria assíncrona
│   │   ├── tray/              ← system tray (Windows)
│   │   └── winsvc/            ← integração Windows Service
│   │
│   ├── shared/retry/retry.go  ← retry com backoff exponencial
│   ├── ui/service.go          ← serviço de UI
│   └── uiwails/               ← host Wails e bindings Go↔JS
│
├── frontend/                  ← UI React (Vite + TypeScript)
│   └── src/
│       ├── App.tsx
│       ├── bindings.ts        ← bindings gerados pelo Wails
│       └── runtime.ts
│
└── deploy/
    └── windows-installer/
        └── AgenteTrilink.iss  ← script InnoSetup para installer Windows
```

---

## Módulo `remote` (RustDesk)

**Path:** `internal/modules/remote/`

| Arquivo              | Responsabilidade                                      |
|----------------------|-------------------------------------------------------|
| `module.go`          | Lifecycle do módulo: Init, Start, Stop                |
| `rustdesk.go`        | Integração com processo RustDesk local                |
| `rustdesk_windows.go`| Implementação Windows (start/stop service, registry)  |
| `rustdesk_other.go`  | Stub para não-Windows                                 |
| `ack_queue.go`       | Fila de ACKs para comandos recebidos                  |
| `module_test.go`     | Testes do módulo                                      |
| `rustdesk_test.go`   | Testes de integração RustDesk                         |

**Responsabilidades:**
- Instala e configura o RustDesk na máquina
- Aplica configuração enviada pelo portal (alias, servidor relay)
- Reporta `rustdeskId` no heartbeat
- Executa comandos da fila: REAPPLY_ALIAS, REAPPLY_CONFIG, UPGRADE_CLIENT

---

## Módulo `backup` (Firebird)

**Path:** `internal/modules/backup/`

| Arquivo         | Responsabilidade                                      |
|-----------------|-------------------------------------------------------|
| `manager.go`    | Gerencia jobs de backup                               |
| `gbak.go`       | Executa gbak (Firebird backup utility)                |
| `compress.go`   | Compressão do arquivo de backup                       |
| `upload.go`     | Upload para Cloudflare R2                             |
| `policy.go`     | Políticas de retenção e agendamento                   |
| `validate.go`   | Validação do backup gerado                            |
| `hash.go`       | Hash de integridade                                   |
| `queue.go`      | Fila de tarefas de backup                             |
| `report.go`     | Relatório de backup para o portal                     |
| `result.go`     | Tipos de resultado                                    |
| `task.go`       | Estrutura de tarefa de backup                         |

---

## Módulo `device`

**Path:** `internal/modules/device/`

Coleta dados de hardware do dispositivo Windows:
- CPU, RAM, disco, uptime
- Versão do OS, hostname
- Exportado no sync periódico para o portal

---

## IPC (comunicação service ↔ ui)

**Path:** `internal/infra/ipc/`

| Arquivo                  | Descrição                             |
|--------------------------|---------------------------------------|
| `server.go`              | Servidor IPC (agent-service)          |
| `client.go`              | Cliente IPC (agent-ui)                |
| `transport_windows.go`   | Named Pipe (`\\.\pipe\trilink-agent`) |
| `transport_other.go`     | Unix Domain Socket (dev/test)         |

**Protocolo:** mensagens JSON sobre pipe. Cada mensagem tem tipo + payload.

---

## Secrets e segurança

**Path:** `internal/app/secrets.go` + `internal/infra/storage/protected*.go`

- `agentToken` persistido com **DPAPI** (Windows Data Protection API) — cifrado com a identidade da máquina
- Em não-Windows (dev): arquivo simples em `/tmp` (não usar em produção)
- Rotação de token: o portal enfileira `ROTATE_TOKEN_REQUIRED`, o agente solicita novo token no próximo heartbeat

---

## Build e deploy

```bash
# Build do agent-ui (Wails) — requer Wails CLI instalado
wails build

# Build do agent-service
go build ./cmd/agent-service/...

# Installer Windows
# Compilar com InnoSetup: deploy/windows-installer/AgenteTrilink.iss
```

**Dependências de runtime (incluídas no installer):**
- WebView2 Runtime (para Wails)
- RustDesk client
- gbak (Firebird backup tool)
