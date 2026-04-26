# Master Agent Trilink - Estado atual da arquitetura

Atualizado em 2026-04-26.

## Visao geral

O Master Agent Trilink e uma plataforma local de provisionamento e suporte para dispositivos Windows. Ele e composto por dois binarios independentes que se comunicam via IPC local:

- `agent-service.exe`: servico Windows que roda em background como LocalSystem. Executa todo o trabalho critico: registro, heartbeat, desired state, reconcile, modulos de remote/backup/device/support.
- `agent-ui.exe`: app desktop construido com Wails v2 (React + WebView2). Exibe estado, chat de suporte e pipeline de provisionamento via anel de progresso e timeline interativa. Conecta ao servico via IPC.

O agente e operacional em producao. O nucleo funciona; os proximos investimentos sao em modulos ainda em stub (backup, tunnel) e em protecao de segredos com DPAPI.

## Estrutura de arquivos atual

```text
apps/agent/
  main.go                          <- entry point do agent-ui (Wails)
  wails.json                       <- configuracao Wails (binario: agent-ui)
  go.mod / go.sum

  cmd/
    agent/
      main.go                      <- alias do agent-ui (identico ao main.go raiz)
    agent-service/
      main.go                      <- entry point do agent-service

  internal/
    app/
      bootstrap.go                 <- bootstrap do servico (DI completo)
      ui_bootstrap.go              <- bootstrap da UI (IPC client + Wails host)
      container.go                 <- struct Container com AgentService, IPCServer, AgentUI, UIHost
      run.go                       <- RunService(), RunUI(), RunServiceDebug()

    domain/
      applied_state.go
      current_state.go
      desired_state.go
      device.go
      event.go
      module_state.go
      reconcile_plan.go
      remote_contracts.go          <- constantes tipadas para discover/bootstrap/sync/ack
      result.go

    core/
      agent/
        service.go                 <- coordena lifecycle principal do servico
      desiredstate/
        contracts.go
        service.go                 <- busca e persiste desired state; loop de 1 minuto
      heartbeat/
        contracts.go
        service.go                 <- envia heartbeat ao portal; loop de 30 segundos
      identity/
        ...                        <- resolve identidade local persistida
      reconcile/
        service.go                 <- loop de 45 segundos: Inspect -> Plan -> Apply
      registration/
        contracts.go
        service.go                 <- registra dispositivo no portal; idempotente
      ui_state/
        service.go                 <- monta resumo/status/notificacoes/sessao de suporte para UI
        support_session.go         <- ChatwootConfig, SupportContext

    infra/
      config/
        loader.go                  <- Load(), LoadEnvFile(), DefaultEnvFilePath()
        types.go                   <- Config, PortalConfig, RemoteConfig, SupportConfig, AgentConfig
      http/
        portal_client.go           <- cliente HTTP do portal com retry
      ipc/
        server.go                  <- servidor IPC (named pipe Windows)
        client.go                  <- cliente IPC (usado pelo agent-ui)
      logging/
        ...                        <- logger estruturado
      platform/
        ...                        <- identidade Windows (MachineGuid, computername)
      runtime/
        ...                        <- execucao de subprocessos
      storage/
        ...                        <- persistencia JSON atomica (temp + rename + retry)
      telemetry/
        ...                        <- event bus assincrono com buffer
      tray/
        service_windows.go         <- tray nativo Windows via systray
        service_other.go           <- stub para outras plataformas
      winsvc/
        ...                        <- integracao com Windows Service Control Manager

    modules/
      backup/
        module.go                  <- STUB: participa do reconcile mas nao executa pipeline real
      device/
        module.go                  <- coleta contexto do host (hostname, SO, usuario)
      remote/
        module.go                  <- ciclo completo: discover / bootstrap / sync / ack
        rustdesk.go                <- instalacao, servico, config e leitura de ID do RustDesk
        (helpers, config, etc.)
      support/
        module.go                  <- modulo de suporte (Chatwoot)
      tunnel/
        module.go                  <- STUB: estrutural, sem implementacao real

    backup/                        <- pipeline interno de backup (nao conectado ao modulo ainda)
      compress.go
      gbak.go
      hash.go
      manager.go
      policy.go
      queue.go
      report.go
      result.go
      task.go
      upload.go
      validate.go

    shared/
      retry/

    ui/
      service.go                   <- UI service: tray + polls + tray actions + auto-open setup

    uiwails/
      host.go                      <- Wails host: Open(), Startup(), showTarget(), push loops
      runner.go                    <- RunApp(): inicia servico UI + janela Wails em paralelo
      runtime_windows.go
      runtime_other.go

  assets/
    embed.go
    img/

  frontend/
    src/
      App.tsx                      <- UI React: navbar, setup screen, support screen
      main.tsx
      bindings.ts                  <- bindings Go -> JS (gerado por Wails)
      styles.css                   <- design system enterprise
    wailsjs/                       <- bridge auto-gerado Wails
    package.json
    vite.config.ts

  deploy/
    windows-installer/
      AgenteTrilink.iss            <- script Inno Setup
      build-installer-package.ps1
      compile-installer.ps1
      runtime/
        start-agent.ps1            <- inicia servico + UI; aguarda IPC
        stop-agent.ps1
        start-agent.cmd
        stop-agent.cmd
        open-config.cmd
        open-logs.cmd
```

## Binarios e separacao de responsabilidades

| Binario | Entry point | Processo | Conta Windows | Responsabilidade |
|---------|-------------|----------|---------------|-----------------|
| `agent-service.exe` | `cmd/agent-service/main.go` | Windows Service | LocalSystem | Registro, heartbeat, desired state, reconcile, modulos |
| `agent-ui.exe` | `main.go` (raiz) | App de usuario | Usuario logado | Tray, janela Wails, IPC client |

Os dois processos se comunicam exclusivamente via IPC (named pipe). O `agent-ui` nunca le arquivos de estado diretamente.

## Configuracao

Arquivo canonico: `C:\ProgramData\Trilink\Agent\.env`

Variaveis suportadas:

```text
AGENT_LOG_LEVEL                          # padrao: debug
PORTAL_BASE_URL                          # padrao: http://localhost:3000
PORTAL_API_KEY
PORTAL_AGENT_API_ENABLED                 # padrao: false

REMOTE_ENABLED                           # padrao: true
REMOTE_DISCOVERY_TOKEN
REMOTE_INSTALL_TOKEN
REMOTE_RUSTDESK_INSTALLER_URL
REMOTE_RUSTDESK_INSTALLER_SHA256
REMOTE_RUSTDESK_INSTALLER_ARGS           # padrao: /S (exe) ou /qn /norestart (msi)

SUPPORT_CHATWOOT_BASE_URL                # padrao: https://chat.trilinksoftware.com.br
SUPPORT_CHATWOOT_WEBSITE_TOKEN

AGENT_VERSION                            # padrao: go-agent-v1
AGENT_ENVIRONMENT                        # padrao: Producao
AGENT_STATE_DIR                          # padrao Windows: %ProgramData%\Trilink\Agent\runtime-state
AGENT_IPC_ADDRESS                        # padrao: \\.\pipe\trilink-agent-ipc
AGENT_IPC_TOKEN                          # gerado pelo instalador via MD5, unico por maquina
```

Quando `PORTAL_AGENT_API_ENABLED=false` (padrao), os endpoints genericos `/api/agents/*` sao ignorados. O agente opera exclusivamente pela superficie `remote/*` que ja existe no portal. Isso permite boot estavel enquanto o portal expande sua API.

## Estado persistido em disco

Diretorio base: `C:\ProgramData\Trilink\Agent\runtime-state\`

| Arquivo | Conteudo |
|---------|---------|
| `identity.json` | Identidade local da maquina |
| `registration.json` | Estado de registro com o portal |
| `heartbeat.json` | Timestamp do ultimo heartbeat bem-sucedido |
| `desired_state.json` | Ultimo desired state recebido do portal |
| `current_state.json` | Snapshot do estado atual de todos os modulos |
| `reconcile_plan.json` | Plano do ultimo ciclo de reconcile |
| `apply_results.json` | Resultados do ultimo Apply por modulo |
| `applied_state.json` | Estado consolidado apos Apply |
| `remote_state.json` | Token, host ID, rustdesk ID, alias, metadados do remote module |

Escrita atomica: arquivo temporario + rename com retry, sem risco de corrupcao em Windows.

Atencao: `remote_state.json` contem `agent_token`. Proteger com DPAPI antes de escala em producao.

## IPC local

Transporte: named pipe `\\.\pipe\trilink-agent-ipc`
Autenticacao: `AGENT_IPC_TOKEN` (unico por instalacao)

Metodos expostos pelo `agent-service` e consumidos pelo `agent-ui`:

| Metodo | Descricao |
|--------|-----------|
| `GetSetupStatus` | Retorna progresso do provisionamento (etapas, %, erros) |
| `GetSummary` | Retorna saude geral do servico |
| `ListNotifications` | Retorna alertas ativos |
| `OpenSupportConversation` | Abre chat de suporte |
| `OpenSetupExperience` | Solicita abertura da janela de setup |
| `SyncSupportConversationContext` | Sincroniza contexto tecnico da maquina ao Chatwoot |

## Fluxo operacional do servico

### Boot do agent-service

```text
cmd/agent-service/main.go
  -> winsvc.Run (detecta SCM vs. interativo)
  -> app.BootstrapService
     -> config.Load
     -> logger, storage, portal client, event bus, executor
     -> modulos: remote, device, support, backup, tunnel
     -> identity, registration, heartbeat, desiredstate, reconcile services
  -> agent.Service.Run
     -> identity.Get
     -> registration.EnsureRegistered
     -> goroutines (errgroup):
        - heartbeat.Start (30s)
        - desiredstate.Start (1min)
        - reconcile.Start (45s)
  -> ipc.Server.Start
```

### Ciclo de reconcile (45 segundos)

```text
desiredstate.GetLast
  -> remote.Inspect   (le remote_state.json)
  -> backup.Inspect   (stub)
  -> device.Inspect   (coleta host info)
  -> support.Inspect  (stub/local)
  -> persiste current_state.json
  -> remote.Plan      (calcula acoes necessarias)
  -> remote.Apply
     -> se sem token: Discover -> Bootstrap -> Sync
     -> se com token: Sync direto
     -> Bootstrap instala RustDesk (download + /S, mata GUI auto-lancado, inicia servico)
     -> Apply config (--config, --password, Restart-Service)
     -> le rustdesk ID do arquivo de config
     -> processa commandQueue, envia ACKs
  -> persiste apply_results.json, applied_state.json
  -> emite evento reconcile_applied
```

### Boot do agent-ui

```text
main.go (raiz)
  -> app.BootstrapUI
     -> config.Load
     -> ValidateRuntime (WebView2)
     -> ipc.NewClient
     -> uistate.NewService (build SupportSession, contexto local)
     -> uiwails.NewHost
     -> ui.NewService (tray + IPC client + host)
  -> uiwails.RunApp
     -> goroutine: ui.Service.Run
        -> tray.Run (icone + menu)
        -> autoOpenSetupIfNeeded (apos 1.2s, abre janela se setup incompleto)
        -> pollSummaryLoop (30s)
        -> pollNotificationsLoop (45s)
        -> handleTrayActions (Status do agente | Abrir suporte | Sair)
     -> wails.Run (janela Wails, bloqueante)
        -> OnStartup: host.Startup (inicia push loops; abre janela se solicitado)
```

## UI do agent-ui

### Comportamento da janela

| Situacao | Comportamento |
|----------|---------------|
| Primeiro boot pos-install | Setup incompleto -> janela abre automaticamente (1.2s delay) |
| Setup ja concluido | Agente fica silencioso na bandeja |
| Usuario clica "Status do agente" no tray | Janela abre com setup/status screen |
| Usuario fecha a janela | Janela se esconde (nao encerra o processo) |
| Usuario clica "Sair" no tray | Encerra agent-ui (servico continua rodando) |

### Menu do tray

- **Status do agente** -> abre janela com pipeline de provisionamento
- **Abrir suporte** -> abre janela com chat Chatwoot
- **Sair** -> encerra agent-ui

### Telas

**Setup screen** (rota `agent://setup`):
- Navbar fixa com badge de estado (Ativo / Configurando / Erro / Iniciando)
- Hero: anel SVG com % de progresso e descricao da etapa ativa
- Barra de progresso linear
- Chips de metadados: Empresa, Host ID, Canal remoto
- Timeline de etapas: icone pulsante no step ativo, badge por status
- Steps concluidos colapsaveis

**Support screen** (rota `agent://support`):
- Card com ID remoto RustDesk e senha de acesso
- Status pill (Pronto / Em analise / Offline)
- Botao para abrir chat Chatwoot
- SDK Chatwoot carregado dinamicamente; contexto tecnico sincronizado via IPC

## Modulos

### `remote` - Operacional

Fluxo completo implementado:

1. Discover: envia token de discovery ao portal, recebe `bootstrapFlow`
2. Bootstrap: instala RustDesk (baixa + `/S` ou MSI `/qn`), mata processo auto-lancado para evitar tela branca, inicia servico, aplica `--config` e `--password`, reinicia servico para garantir carregamento limpo
3. Sync: envia snapshot de estado (rustdesk ID, versao, servico), recebe `commandQueue`
4. Comandos tratados: `REAPPLY_ALIAS`, `REAPPLY_CONFIG`, `ROTATE_TOKEN_REQUIRED`, `UPGRADE_CLIENT` (parcial)
5. ACK enviado por comando

Leitura do RustDesk ID: tenta arquivo de config primeiro (`RustDesk2.toml` no perfil SYSTEM), depois CLI `--get-id` com retry exponencial.

### `device` - Funcional

Coleta hostname, SO, usuario logado e versao do agente. Expoe snapshot via IPC para o modulo de suporte.

### `support` - Funcional

Integrado ao `agent-ui` via IPC. Sincroniza contexto tecnico (empresa, host, rustdeskId, usuario, etc.) ao iniciar conversa no Chatwoot.

### `backup` - Stub

O modulo `modules/backup` participa do reconcile mas nao executa pipeline real. O pacote `internal/backup` possui o pipeline completo (gbak -> validate -> compress -> upload -> report) mas ainda nao esta conectado. Ver `2-agent-backup.md`.

### `tunnel` - Stub

Estrutural. Participa do reconcile sem executar nada real.

## Endpoints do portal em uso

| Endpoint | Descricao |
|----------|-----------|
| `POST /api/remote/agents/discover` | Discover com token de discovery |
| `POST /api/remote/rustdesk/bootstrap` | Bootstrap com install token |
| `POST /api/remote/rustdesk/sync` | Sync periodico com snapshot de estado |
| `POST /api/remote/rustdesk/ack` | Confirmacao de comandos recebidos |
| `POST /api/agents/register` | Registro do dispositivo (quando `PORTAL_AGENT_API_ENABLED=true`) |
| `POST /api/agents/heartbeat` | Heartbeat (quando `PORTAL_AGENT_API_ENABLED=true`) |
| `GET /api/agents/:id/desired-state` | Desired state (quando `PORTAL_AGENT_API_ENABLED=true`) |

## Instalador Windows

Ferramenta: Inno Setup (`deploy/windows-installer/AgenteTrilink.iss`)

| Item | Valor |
|------|-------|
| Nome do servico | `TrillinkAgent` |
| Pasta de instalacao | `%ProgramFiles%\Trilink\Agente` |
| Dados / estado | `%ProgramData%\Trilink\Agent` |
| Estado de runtime | `%ProgramData%\Trilink\Agent\runtime-state` |
| Conta do servico | LocalSystem |

Passos de instalacao:
1. Verifica e instala WebView2 Runtime
2. Registra `TrillinkAgent` no SCM (`agent-service.exe install`)
3. Inicia o servico (`agent-service.exe start`)
4. Opcao pos-instalacao: inicia `start-agent.ps1` (marcado pelo usuario no Finish)

`start-agent.ps1` aguarda o named pipe IPC estar disponivel antes de abrir `agent-ui.exe`. Evita race condition entre servico e UI.

Entrada na pasta de inicializacao do Windows (`%COMMONPROGRAMDATA%\...\Start Menu\Programs\Startup`) garante que `agent-ui.exe` seja iniciado em todo login.

Desinstalacao: para e remove o servico; pergunta se deve remover o RustDesk e os dados de configuracao.

## Validacao

```powershell
# no workspace do monorepo
$env:GOCACHE='C:\DEV\documentacao-syspro\apps\agent\.gocache'
$env:GOWORK='C:\DEV\documentacao-syspro\go.work'
go build ./apps/agent/...
go test ./apps/agent/...
```

Todos os pacotes compilam. Ainda nao ha testes unitarios dedicados.

## Decisoes em vigor

- `agent-service` e `agent-ui` sao processos separados comunicando por IPC
- IPC com named pipe autenticado por token unico por instalacao
- `agent-ui` nao le arquivos de estado diretamente; tudo via IPC
- `agent-ui` abre janela automaticamente apenas quando provisionamento esta incompleto
- endpoints genericos de agente sao opt-in (`PORTAL_AGENT_API_ENABLED`)
- remote module opera por discover/bootstrap/sync independentemente do ciclo generico
- `agent_token` ainda em JSON plano (DPAPI pendente)

## Gaps e proximos investimentos

1. Proteger `remote_state.json` com DPAPI (agent_token, senhas)
2. Conectar `modules/backup` ao pipeline `internal/backup`
3. Expandir `BackupDesiredState` para politicas reais
4. Persistir fila de ACK remoto pendente
5. Implementar upgrade controlado do agente (`UPGRADE_CLIENT`)
6. Implementar `Report()` e `HandleCommand()` no contrato de modulo
7. Adicionar testes unitarios do remote module com fake client/store
8. Adicionar testes com `httptest` para `portal_client`
9. Criar transporte duravel de telemetria para o portal
10. Evoluir `modules/device` para coletar inventario mais completo
