# Master Agent Trilink - Arquitetura alvo modular

Atualizado em 2026-04-24.

## Objetivo

Consolidar o `agent` como produto principal da empresa, com identidade visual propria, provisionamento automatico e modulos internos para suporte, acesso remoto e backup.

Diretriz principal:

- o agente e o ponto central da experiencia local
- `RustDesk` continua como motor de acesso remoto
- `rclone` continua como motor de backup
- o portal governa identidade, politica, tickets, comandos e auditoria
- a UI do agente nao executa logica critica; ela consome o estado do servico local

## Decisao de arquitetura

O agente deve ser dividido em duas camadas operacionais:

- `agent-service`: executa em background, aplica politicas, integra com RustDesk e rclone, coleta contexto local e sincroniza com o portal
- `agent-ui`: tray app e janela principal da empresa, exibindo estado, chat, alertas, consentimentos e acoes do usuario

Essa separacao evita acoplamento entre interface e automacao critica. Backup e remoto continuam operando mesmo sem janela aberta.

## Estrutura alvo no monorepo

```text
apps/
  agent/
    cmd/
      agent-service/
      agent-ui/

    internal/
      app/
        service_bootstrap.go
        ui_bootstrap.go
        container.go

      domain/
        device.go
        desired_state.go
        current_state.go
        applied_state.go
        module_state.go
        command.go
        event.go
        support_contracts.go
        remote_contracts.go
        backup_contracts.go

      core/
        agent/
        desiredstate/
        heartbeat/
        identity/
        reconcile/
        registration/
        commandbus/
        modulehost/
        ui_state/

      infra/
        config/
        http/
        logging/
        platform/
        runtime/
        storage/
        telemetry/
        secrets/
        ipc/
        tray/
        webview/

      modules/
        support/
        remote/
        backup/
        device/

      backup/
        ...

      shared/
        retry/
```

## Modulos oficiais

O agente deve ter modulos internos governados pelo mesmo contrato operacional.

### 1. `support`

Responsabilidades:

- abrir o canal oficial de atendimento
- exibir status do ticket atual
- anexar contexto tecnico da maquina na conversa
- receber alertas e solicitacoes do portal
- controlar consentimentos do usuario final quando necessario

Dependencias externas:

- Chatwoot ou chat proprio
- API de tickets
- API de eventos/notificacoes

### 2. `remote`

Responsabilidades:

- manter vinculacao da maquina com o portal
- integrar com RustDesk
- coletar `rustdeskId`, versao, status do servico e compliance
- processar comandos remotos do portal
- iniciar fluxo de suporte remoto pelo canal oficial do agente

Dependencias externas:

- RustDesk
- endpoints `discover/bootstrap/sync/ack`

### 3. `backup`

Responsabilidades:

- executar jobs com `rclone`
- manter politicas de backup por base/servico
- registrar historico, falhas, retries e ultimo sucesso
- reportar saude e resultados ao portal

Dependencias externas:

- `gbak`
- `7z`
- `rclone`
- API de relatorio/telemetria de backup

### 4. `device`

Responsabilidades:

- coletar contexto do host
- descobrir usuario local ativo
- capturar hostname, SO, versao do agente e sinais de saude
- expor um snapshot local para UI, suporte e portal

Dependencias externas:

- APIs do Windows
- event log, servicos, processos e sinais do sistema conforme rollout

## Contrato unico por modulo

Todos os modulos devem implementar a mesma superficie conceitual:

- `Inspect(ctx)`: le o estado atual local
- `Plan(desired, current)`: calcula acoes necessarias
- `Apply(ctx, desired, current)`: executa reconciliacao
- `Report(ctx)`: monta snapshot resumido para portal/UI
- `HandleCommand(ctx, command)`: processa comandos direcionados ao modulo

Forma minima sugerida em Go:

```go
type Module interface {
    Name() string
    Inspect(ctx context.Context) (domain.CurrentModuleState, error)
    Plan(desired domain.DesiredState, current domain.CurrentModuleState) []domain.ReconcileAction
    Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult
    Report(ctx context.Context) (domain.ModuleReport, error)
    HandleCommand(ctx context.Context, command domain.AgentCommand) domain.CommandResult
}
```

Regra de arquitetura:

- `Inspect/Plan/Apply` servem ao reconcile
- `Report` serve a UI e ao portal
- `HandleCommand` serve a fila de comandos remotos e acoes iniciadas no portal

## Provisionamento automatico

Nao deve existir login humano como fluxo principal do agente.

Fluxo oficial:

1. instalador recebe `enrollment token`
2. `agent-service` registra a maquina automaticamente
3. portal devolve identidade, modulos habilitados e politicas
4. agente persiste vinculo local
5. `agent-ui` abre ja contextualizado com a marca da empresa e estado da maquina

Separacao obrigatoria:

- `device enrollment`: vinculo automatico da maquina
- `user session context`: usuario do Windows atualmente logado
- `operator auth`: autenticacao do atendente no portal

O usuario final nao deve precisar autenticar manualmente no agente para usar suporte, remoto ou backup.

## Estado local recomendado

```text
C:\ProgramData\Trilink\
  agent\
    identity.json
    enrollment.json
    desired_state.json
    current_state.json
    applied_state.json
    command_queue.json
    support_state.json
    remote_state.json
    backup_state.json
    device_state.json

  agent-ui\
    ui_preferences.json
    window_state.json
    notifications.json
```

Regra de seguranca:

- segredos, tokens e credenciais nao devem ficar em JSON plano
- proteger com DPAPI no Windows
- `remote_state.json` e referencias de credenciais de backup sao prioridade alta

## IPC local entre servico e UI

O `agent-ui` nao deve ler arquivos de estado arbitrariamente como mecanismo principal.

Modelo recomendado:

- `agent-service` expoe IPC local autenticado
- `agent-ui` consulta snapshots e envia acoes de usuario
- arquivos em disco ficam como persistencia e recovery, nao como barramento primario

Capacidades minimas do IPC:

- `GetAgentSummary`
- `GetModuleStatus`
- `OpenSupportConversation`
- `RequestRemoteSupport`
- `RequestBackupNow`
- `AcknowledgeConsent`
- `ListNotifications`

## API alvo

O `apps/api` deve virar a superficie canonica para governo do agente.

### Dominios principais

- `agent enrollment`
- `agent desired state`
- `agent commands`
- `agent telemetry`
- `support/tickets`
- `remote`
- `backup`

### Endpoints minimos recomendados

Provisionamento:

- `POST /api/agents/enroll`
- `POST /api/agents/activate`
- `POST /api/agents/heartbeat`

Politica e estado:

- `GET /api/agents/:deviceId/desired-state`
- `POST /api/agents/:deviceId/report`
- `POST /api/agents/:deviceId/telemetry`

Comandos:

- `GET /api/agents/:deviceId/commands`
- `POST /api/agents/:deviceId/commands/:commandId/ack`

Support:

- `POST /api/agents/:deviceId/support/session`
- `POST /api/agents/:deviceId/support/context`
- `POST /api/agents/:deviceId/tickets`

Backup:

- `POST /api/agents/:deviceId/backup/jobs`
- `POST /api/agents/:deviceId/backup/results`
- `GET /api/agents/:deviceId/backup/policies`

Remote:

- manter `POST /api/remote/agents/discover`
- manter `POST /api/remote/rustdesk/bootstrap`
- manter `POST /api/remote/rustdesk/sync`
- manter `POST /api/remote/rustdesk/ack`

## Desired state alvo

O desired state do agente deve ser modular e orientado a policy.

Exemplo conceitual:

```ts
type AgentDesiredState = {
  version: number
  identity: {
    companyId: string
    companyName: string
    branding: {
      appName: string
      logoUrl?: string
      primaryColor?: string
    }
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
    policies: BackupPolicy[]
  }
  device: {
    enabled: boolean
    collectInventory: boolean
    collectMetrics: boolean
  }
}
```

## Papel do `apps/web`

O `web` nao governa o runtime do agente, mas precisa expor interfaces de operacao.

Telas recomendadas:

- detalhe do dispositivo/agente
- status por modulo
- timeline operacional do agente
- tickets vinculados ao dispositivo
- sessoes remotas do dispositivo
- historico e politicas de backup
- comandos pendentes/executados

Objetos de UI recomendados:

- `AgentCard`
- `AgentModulesPanel`
- `AgentCommandTimeline`
- `AgentRemoteStatusCard`
- `AgentBackupStatusCard`
- `AgentSupportCard`

## Papel do `apps/api`

O `api` deve concentrar:

- validacao de enrollment e rotacao de credenciais
- resolucao do desired state por empresa/dispositivo
- fila de comandos por modulo
- consolidacao de inventario e snapshots
- correlacao entre ticket, dispositivo, sessao remota e backup
- trilha auditavel de acoes iniciadas no portal e executadas no agente

## Fluxos oficiais

### 1. Boot do servico

```text
service start
  -> load config
  -> load secrets/state
  -> ensure enrollment
  -> start desired state loop
  -> start heartbeat/report loop
  -> start command loop
  -> start reconcile loop
  -> expose local IPC
```

### 2. Abertura da UI

```text
user clicks tray
  -> ui connects to local IPC
  -> ui requests current summary
  -> ui renders support/remote/backup/device status
  -> user action is sent back to service
```

### 3. Suporte oficial

```text
user opens support
  -> support module requests local device context
  -> service attaches machine metadata
  -> portal/ticket receives linked context
  -> operator can escalate to remote support
```

### 4. Backup oficial

```text
desired state updated
  -> backup module maps policies
  -> queue schedules jobs
  -> manager executes gbak/compress/upload
  -> result reported to portal
  -> ui displays last success/failure
```

### 5. Remoto oficial

```text
enrolled device
  -> remote discover/bootstrap/sync
  -> compliance + command queue
  -> optional operator starts remote session from portal
  -> ui shows remote status without depender do chat do RustDesk
```

## Plano de implementacao por fases

### Fase 1 - consolidacao do servico

- manter `apps/agent` como base do `agent-service`
- proteger segredos locais com DPAPI
- tirar `backup` e `tunnel` do estado de stub
- introduzir `command loop` generico por modulo
- introduzir `report` por modulo

### Fase 2 - camada de UI

- criar `cmd/agent-ui`
- criar tray app
- criar IPC local
- renderizar status resumido do dispositivo
- abrir suporte oficial em janela propria da empresa

### Fase 3 - suporte integrado

- anexar contexto automatico a tickets/conversa
- vincular dispositivo ao ticket
- permitir “solicitar suporte remoto” pelo agente

### Fase 4 - backup governado por policy

- expandir `BackupDesiredState`
- ligar `modules/backup` ao pipeline real
- reportar resultados e historico ao portal
- exibir estado de backup no `agent-ui`

### Fase 5 - operacao unificada no portal

- detalhe unico do dispositivo
- cards de `support`, `remote` e `backup`
- linha do tempo de comandos e eventos do agente
- correlacao entre atendimento, remoto e backup

## Riscos que nao devem ser ignorados

- persistir token e senha localmente sem protecao
- colocar logica critica de backup/remoto dentro da UI
- depender do chat do RustDesk como canal oficial
- misturar autenticacao do operador do portal com autenticacao do dispositivo
- executar backup diretamente no reconcile sem fila e sem scheduler proprio

## Decisao final consolidada

O agente deve evoluir como plataforma modular local da empresa.

Modelo final:

- um unico agente
- multiplos modulos internos
- um servico de background como executor
- uma UI propria da empresa como interface
- um portal central governando estado, comandos, suporte, remoto e backup
