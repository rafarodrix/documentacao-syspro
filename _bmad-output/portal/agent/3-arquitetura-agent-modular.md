# Master Agent Trilink - Arquitetura modular

Atualizado em 2026-04-26.

## Estado atual vs. plano original

Este documento consolida o que foi planejado em 2026-04-24 com o que foi efetivamente implementado ate 2026-04-26. As secoes marcam claramente o que esta concluido, o que esta em curso e o que ainda e roadmap.

## Objetivo

Consolidar o `agent` como produto principal da empresa, com identidade visual propria, provisionamento automatico e modulos internos para suporte, acesso remoto e backup.

Diretrizes mantidas:

- o agente e o ponto central da experiencia local
- `RustDesk` continua como motor de acesso remoto
- `rclone` continua como motor de backup
- o portal governa identidade, politica, tickets, comandos e auditoria
- a UI do agente nao executa logica critica; ela consome o estado do servico local

## Decisao de arquitetura - CONCLUIDA

A separacao em dois processos foi implementada e esta em producao:

- `agent-service.exe`: executa em background como LocalSystem. Aplica politicas, integra com RustDesk, coleta contexto local, sincroniza com o portal.
- `agent-ui.exe`: tray app e janela principal da empresa. Exibe estado, chat de suporte e pipeline de provisionamento. Conecta ao servico via IPC local.

## Estrutura de diretorios - CONCLUIDA

```text
apps/agent/
  main.go                         <- agent-ui entry point (Wails)
  cmd/
    agent/                        <- alias agent-ui
    agent-service/                <- agent-service entry point

  internal/
    app/
      bootstrap.go                <- DI do servico
      ui_bootstrap.go             <- DI da UI
      container.go
      run.go

    domain/                       <- tipos compartilhados

    core/
      agent/                      <- coordinator do servico
      desiredstate/               <- loop de desired state (1 min)
      heartbeat/                  <- loop de heartbeat (30s)
      identity/                   <- identidade persistida
      reconcile/                  <- loop de reconcile (45s)
      registration/               <- registro idempotente
      ui_state/                   <- snapshot de estado para UI

    infra/
      config/                     <- env vars + .env file
      http/                       <- portal client com retry
      ipc/                        <- named pipe (server + client)
      logging/
      platform/                   <- identidade Windows
      runtime/                    <- subprocessos
      storage/                    <- JSON atomico
      telemetry/                  <- event bus
      tray/                       <- systray Windows
      winsvc/                     <- SCM integration

    modules/
      remote/                     <- [OPERACIONAL] discover/bootstrap/sync/ack + RustDesk
      device/                     <- [FUNCIONAL] coleta host info
      support/                    <- [FUNCIONAL] Chatwoot via IPC
      backup/                     <- [STUB] pipeline interno nao conectado
      tunnel/                     <- [STUB] estrutural

    backup/                       <- pipeline interno (gbak/compress/upload)
    ui/                           <- UI service (tray + polls + auto-open)
    uiwails/                      <- Wails host + runner

  frontend/src/                   <- React + TypeScript
  deploy/windows-installer/       <- Inno Setup
```

## Modulos oficiais

### 1. `remote` - OPERACIONAL

Fluxo completo em producao:

- Discover: envia token, recebe bootstrapFlow do portal
- Bootstrap: instala RustDesk (EXE `/S` ou MSI `/qn`), mata processo auto-lancado (previne tela branca), inicia servico Windows, aplica `--config` e `--password`, reinicia servico
- Sync: envia snapshot periodico, recebe fila de comandos
- Ack: confirma execucao de cada comando
- Comandos: `REAPPLY_ALIAS`, `REAPPLY_CONFIG`, `ROTATE_TOKEN_REQUIRED`, `UPGRADE_CLIENT` (parcial)

Leitura do RustDesk ID: arquivo de config do perfil SYSTEM com fallback para CLI `--get-id`.

### 2. `support` - FUNCIONAL

Implementado via `agent-ui`:

- SDK Chatwoot carregado dinamicamente na janela de suporte
- Contexto tecnico (empresa, host, rustdeskId, usuario) sincronizado via IPC no inicio de cada conversa
- Janela abre via tray ("Abrir suporte") ou via comando remoto

### 3. `device` - FUNCIONAL

Coleta hostname, SO, usuario logado e versao do agente. Expoe snapshot para o modulo de suporte e para o portal.

### 4. `backup` - STUB

O modulo `modules/backup` participa do reconcile como stub. O pipeline interno (`internal/backup`) esta completo em estrutura mas nao esta conectado. Ver `2-agent-backup.md`.

## Contrato de modulo - PARCIALMENTE IMPLEMENTADO

Interface atual em producao:

```go
type Module interface {
    Name() string
    Inspect(ctx context.Context) (domain.CurrentModuleState, error)
    Plan(desired domain.DesiredState, current domain.CurrentModuleState) []domain.ReconcileAction
    Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult
}
```

Interface alvo (ainda nao implementada):

```go
type Module interface {
    Name() string
    Inspect(ctx context.Context) (domain.CurrentModuleState, error)
    Plan(desired domain.DesiredState, current domain.CurrentModuleState) []domain.ReconcileAction
    Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult
    Report(ctx context.Context) (domain.ModuleReport, error)         // pendente
    HandleCommand(ctx context.Context, command domain.AgentCommand) domain.CommandResult  // pendente
}
```

Os metodos `Report` e `HandleCommand` existem como conceito mas nao estao formalizados no contrato Go. O remote module processa seus proprios comandos internamente via sync/ack.

## Provisionamento automatico - CONCLUIDO

Fluxo em producao:

1. Instalador recebe token pre-configurado no `.env`
2. `agent-service` registra a maquina automaticamente no primeiro boot
3. Portal devolve desired state com modulos habilitados e politicas
4. Remote module instala e configura RustDesk automaticamente
5. `agent-ui` abre ja contextualizado com empresa e estado da maquina

O usuario final nao precisa autenticar manualmente no agente.

## IPC local - CONCLUIDO

Implementado com named pipe autenticado por token.

Capacidades implementadas:

| Metodo IPC | Status |
|------------|--------|
| `GetSetupStatus` | Concluido |
| `GetSummary` | Concluido |
| `ListNotifications` | Concluido |
| `OpenSupportConversation` | Concluido |
| `OpenSetupExperience` | Concluido |
| `SyncSupportConversationContext` | Concluido |
| `RequestBackupNow` | Pendente |
| `AcknowledgeConsent` | Pendente |

## Camada de UI - CONCLUIDA

Implementada com Wails v2 (React + TypeScript + WebView2).

Comportamento atual da janela:

- `agent-ui` inicia silencioso na bandeja (sem popup automatico)
- Apos 1.2s, verifica status via IPC: abre janela so se provisionamento esta incompleto
- Se ja configurado: fica na bandeja, zero interrupcao ao usuario
- Tray menu: "Status do agente", "Abrir suporte", "Sair"
- Janela fecha para a bandeja (nao encerra o processo)

Setup screen:

- Navbar com badge de estado (Ativo / Configurando / Erro)
- Anel SVG de progresso com percentual
- Barra de progresso linear
- Chips de metadados (Empresa, Host, Canal remoto)
- Timeline de etapas com icone pulsante no step ativo
- Steps concluidos colapsaveis

Support screen:

- ID remoto RustDesk e senha de acesso
- Status pill do canal remoto
- Botao para chat Chatwoot

## Estado local - CONCLUIDO (parcialmente)

Implementado:

```text
C:\ProgramData\Trilink\Agent\
  .env                            <- configuracao do agente
  runtime-state\
    identity.json
    registration.json
    heartbeat.json
    desired_state.json
    current_state.json
    reconcile_plan.json
    apply_results.json
    applied_state.json
    remote_state.json             <- ATENCAO: contem agent_token em texto plano
    logs\
      *.log
      rustdesk-msi-install-*.log
```

Pendente:

```text
    support_state.json            <- nao criado ainda
    backup_state.json             <- nao criado ainda
    device_state.json             <- nao criado ainda
    command_queue.json            <- nao criado ainda
```

Regra de seguranca nao cumprida ainda: `remote_state.json` persiste `agent_token` em JSON plano. Proteger com DPAPI e prioridade antes de escala.

## API do portal em uso

Endpoints remotos (sempre ativos):

```
POST /api/remote/agents/discover
POST /api/remote/rustdesk/bootstrap
POST /api/remote/rustdesk/sync
POST /api/remote/rustdesk/ack
```

Endpoints genericos (opt-in via `PORTAL_AGENT_API_ENABLED=true`):

```
POST /api/agents/register
POST /api/agents/heartbeat
GET  /api/agents/:deviceId/desired-state
```

Endpoints de suporte (planejados, nao ativos ainda):

```
POST /api/agents/:deviceId/support/session
POST /api/agents/:deviceId/support/context
POST /api/agents/:deviceId/tickets
```

## Desired state atual

Estrutura em producao (simplificada, sem todas as politicas de backup):

```go
type DesiredState struct {
    Version string
    Remote  RemoteDesiredState
    Backup  BackupDesiredState  // ainda simples
    // Support, Device, Tunnel: presentes mas basicos
}

type RemoteDesiredState struct {
    Enabled           bool
    ServerConfig      string
    DefaultPassword   string
    Alias             string
    InstallerURL      string
    InstallerSHA256   string
    TargetVersion     string
    DiscoveryToken    string
    InstallToken      string
}
```

O modelo de desired state para backup ainda precisa ser expandido para suportar multiplas politicas. Ver `2-agent-backup.md`.

## Desired state alvo (ainda pendente para backup)

```typescript
type AgentDesiredState = {
  version: number
  identity: {
    companyId: string
    companyName: string
    branding: { appName: string; logoUrl?: string; primaryColor?: string }
  }
  ui: {
    trayEnabled: boolean
    supportEnabled: boolean
    notificationsEnabled: boolean
  }
  support: {
    enabled: boolean
    provider: 'chatwoot' | 'native'
    widgetBaseUrl?: string
    autoAttachContext: boolean
  }
  remote: {
    enabled: boolean
    provider: 'rustdesk'
    targetVersion?: string
  }
  backup: {
    enabled: boolean
    policies: BackupPolicy[]  // ainda nao implementado
  }
  device: {
    enabled: boolean
    collectInventory: boolean
    collectMetrics: boolean
  }
}
```

## Papel do portal web

Telas que o `apps/web` deve expor (ainda pendentes):

- Detalhe do dispositivo/agente
- Status por modulo (remote, backup, device)
- Timeline operacional do agente
- Tickets vinculados ao dispositivo
- Sessoes remotas do dispositivo
- Historico e politicas de backup
- Comandos pendentes/executados

Componentes sugeridos:

- `AgentCard`
- `AgentModulesPanel`
- `AgentCommandTimeline`
- `AgentRemoteStatusCard`
- `AgentBackupStatusCard`

## Fluxos oficiais

### 1. Boot do servico - CONCLUIDO

```text
service start
  -> load config
  -> load state (identity, registration, remote_state)
  -> ensure enrollment/registration
  -> start desired state loop (1min)
  -> start heartbeat loop (30s)
  -> start reconcile loop (45s)
  -> expose IPC (named pipe)
```

### 2. Abertura da UI - CONCLUIDO

```text
agent-ui start
  -> connect to IPC
  -> start tray (icone na bandeja)
  -> after 1.2s: check setup status via IPC
     -> if incomplete: open setup window
     -> if complete: stay in tray silently
  -> user clicks tray "Status do agente" -> open setup window
  -> user clicks tray "Abrir suporte" -> open support window
```

### 3. Suporte oficial - CONCLUIDO

```text
user opens support
  -> support screen loads Chatwoot SDK
  -> IPC syncs device context (company, host, rustdeskId, user)
  -> conversation created with full technical context
  -> operator can start remote session via RustDesk ID
```

### 4. Backup oficial - PENDENTE

```text
desired state updated (com policies)
  -> backup module maps policies        <- pendente
  -> queue schedules jobs               <- pendente
  -> manager executes gbak/compress/upload
  -> result reported to portal          <- endpoint pendente
  -> ui displays last success/failure   <- pendente
```

### 5. Remoto oficial - CONCLUIDO

```text
enrolled device
  -> remote discover/bootstrap (install RustDesk automaticamente)
  -> sync periodico com portal
  -> compliance check + command queue
  -> operator starts remote session from portal via RustDesk ID
  -> ui shows remote status (ID, senha, status do servico)
```

## Plano de implementacao - estado atual por fase

### Fase 1 - consolidacao do servico - CONCLUIDA

- [x] `agent-service` como base do servico Windows
- [x] IPC local autenticado
- [x] Modulo remote operacional
- [x] Heartbeat e desired state
- [x] Reconcile modular
- [ ] Proteger segredos locais com DPAPI
- [ ] Tirar `backup` do estado de stub
- [ ] Command loop generico por modulo (`HandleCommand`)
- [ ] Report por modulo

### Fase 2 - camada de UI - CONCLUIDA

- [x] `cmd/agent-ui` com Wails v2
- [x] Tray app com menu
- [x] IPC client na UI
- [x] Setup screen com timeline e progresso
- [x] Support screen com Chatwoot
- [x] Auto-open condicional (apenas quando incompleto)
- [x] Design enterprise (navbar, anel SVG, badges de status)

### Fase 3 - suporte integrado - CONCLUIDA (parcialmente)

- [x] Contexto tecnico anexado automaticamente via IPC
- [x] Janela de suporte com ID remoto e senha
- [ ] "Solicitar suporte remoto" diretamente pelo chat do agente
- [ ] Vincular dispositivo a ticket no portal

### Fase 4 - backup governado por policy - PENDENTE

- [ ] Expandir `BackupDesiredState` para `Policies []BackupDesiredPolicy`
- [ ] Ligar `modules/backup` ao pipeline `internal/backup`
- [ ] Fila duravel de jobs em disco
- [ ] Report de resultados ao portal
- [ ] Exibir estado de backup no `agent-ui`

### Fase 5 - operacao unificada no portal - PENDENTE

- [ ] Detalhe unico do dispositivo no `apps/web`
- [ ] Cards de support, remote e backup
- [ ] Linha do tempo de comandos e eventos
- [ ] Correlacao entre atendimento, remoto e backup

## Riscos ativos

| Risco | Status |
|-------|--------|
| `agent_token` em JSON plano sem DPAPI | Ativo - prioridade alta |
| Fila de ACK remoto perdida se servico reiniciar | Ativo - medio |
| Backup sem fila duravel (jobs perdidos em restart) | Ativo - medio |
| `UPGRADE_CLIENT` sem implementacao real | Ativo - baixo por ora |
| Logica critica de backup/remoto fora da UI | Seguido corretamente |
| Dependencia do chat do RustDesk como canal oficial | Mitigado: UI propria via Chatwoot |

## Decisao final

O agente esta em producao como plataforma modular local.

- Um unico agente com dois binarios (service + UI)
- Multiplos modulos internos com contrato Inspect/Plan/Apply
- Servico de background como executor (rodando como LocalSystem)
- UI propria da empresa como interface (Wails v2, design enterprise)
- Portal central governando estado via desired state e comandos
- Provisionamento automatico sem intervencao humana
