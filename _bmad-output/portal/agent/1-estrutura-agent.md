# Master Agent Trilink - Estado atual da arquitetura

Atualizado em 2026-04-16.

## Visao geral

O Master Agent Trilink ja passou da fundacao inicial. O codigo atual possui um nucleo operacional em Go com bootstrap central, identidade persistida, registro local, heartbeat, desired state, reconcile engine, modulos plugaveis e um primeiro modulo remoto funcional para o ciclo RustDesk.

O agente ainda nao deve ser tratado como completo para producao final, porque algumas capacidades seguem parciais: telemetria remota duravel, protecao local de segredos, inventario operacional real, supervisao avancada de processos e integracao completa do modulo de backup com `desired_state`.

## Estrutura atual

```text
apps/agent/
  cmd/
    agent/
      main.go

  internal/
    app/
      bootstrap.go
      container.go
      run.go

    domain/
      applied_state.go
      current_state.go
      desired_state.go
      device.go
      event.go
      module_state.go
      reconcile_plan.go
      remote_contracts.go
      result.go

    core/
      agent/
      desiredstate/
      heartbeat/
      identity/
      reconcile/
      registration/

    infra/
      config/
      http/
      logging/
      platform/
      runtime/
      storage/
      telemetry/

    modules/
      backup/
      remote/
      tunnel/

    backup/
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
```

## Estado por camada

### App

`internal/app` monta o container de dependencias e injeta as implementacoes concretas nos servicos.

Responsabilidades atuais:

- carregar configuracao via `config.Load`
- criar logger
- criar state store local
- criar portal client
- criar executor
- iniciar event bus assincrono
- criar identity, registration, heartbeat, desired state e reconcile services
- registrar os modulos `remote`, `tunnel` e `backup`

Arquivo principal: `apps/agent/internal/app/bootstrap.go`.

### Domain

`internal/domain` concentra tipos compartilhados entre core, infra e modulos.

Tipos principais:

- `DeviceIdentity`
- `DesiredState`
- `CurrentState`
- `AppliedState`
- `ReconcilePlan`
- `ApplyResult`
- `TelemetryEvent`
- contratos remotos `discover/bootstrap/sync/ack`

O arquivo `remote_contracts.go` agora inclui constantes tipadas para:

- schema versions remotas
- fluxos de bootstrap
- tipo de autenticacao de heartbeat
- comandos da fila remota
- status de ACK
- reason codes de ACK

Isso reduz strings soltas no modulo remoto e mantem o contrato Go alinhado ao dominio remoto do portal.

### Core / Agent

`core/agent` coordena o ciclo de vida principal:

1. inicia o agente
2. resolve identidade local
3. garante registro
4. inicia loops concorrentes com `errgroup`
5. executa heartbeat
6. executa desired state
7. executa health loop
8. executa reconcile loop
9. encerra por cancelamento de contexto

### Core / Desired State

`core/desiredstate` carrega o ultimo desired state persistido e faz uma busca inicial imediatamente ao iniciar.

Estado atual:

- carrega `desired_state.json` se existir
- chama o portal client no boot
- persiste apenas quando a versao muda
- emite evento `desired_state_updated` quando ha alteracao
- fornece `GetLast` para o reconcile

Observacao importante: quando `PORTAL_AGENT_API_ENABLED=false`, o portal client retorna um desired state local minimo para permitir que o modulo `remote` rode sem depender de endpoints genericos de agente ainda inexistentes.

### Core / Reconcile

`core/reconcile` ja existe e roda em loop.

Responsabilidades atuais:

- obter desired state
- inspecionar estado atual de cada modulo
- gerar plano de reconcile
- persistir `current_state.json`
- persistir `reconcile_plan.json`
- aplicar modulos com acoes pendentes
- persistir `apply_results.json`
- persistir `applied_state.json`
- emitir evento `reconcile_applied`

O reconcile atual e funcional, mas ainda simples. Ele chama cada modulo e deixa a logica especifica de diff/aplicacao dentro do proprio modulo.

### Infra / Config

Configuracao atual via env vars:

```text
AGENT_LOG_LEVEL
PORTAL_BASE_URL
PORTAL_API_KEY
PORTAL_AGENT_API_ENABLED
REMOTE_ENABLED
REMOTE_DISCOVERY_TOKEN
REMOTE_INSTALL_TOKEN
AGENT_VERSION
AGENT_ENVIRONMENT
AGENT_STATE_DIR
```

Defaults relevantes:

- `PORTAL_BASE_URL=http://localhost:3000`
- `PORTAL_AGENT_API_ENABLED=false`
- `REMOTE_ENABLED=true`
- `AGENT_VERSION=go-agent-v1`
- `AGENT_ENVIRONMENT=Producao`
- Windows: estado em `%ProgramData%\Trilink\agent`
- Linux/macOS/dev: estado em `~/.trilink/agent`

### Infra / HTTP

`infra/http/portal_client.go` deixou de ser apenas stub para o modulo remoto.

Endpoints remotos implementados:

- `POST /api/remote/agents/discover`
- `POST /api/remote/rustdesk/bootstrap`
- `POST /api/remote/rustdesk/sync`
- `POST /api/remote/rustdesk/ack`

Comportamento atual:

- usa `Authorization: Bearer <PORTAL_API_KEY>` quando configurado
- aceita resposta direta ou envelope `{ "data": ... }`
- aplica retry simples para erro de rede, `429` e `5xx`
- usa timeout HTTP de 30 segundos

Endpoints genericos de agente continuam opcionais:

- `/api/agents/register`
- `/api/agents/heartbeat`
- `/api/agents/:id/desired-state`

Esses endpoints so sao chamados quando `PORTAL_AGENT_API_ENABLED=true`. Isso evita quebrar o boot enquanto o portal atual ainda expoe principalmente a superficie `remote/*`.

### Infra / Storage

`infra/storage` persiste JSON com escrita atomica.

Arquivos usados atualmente:

- `identity.json`
- `registration.json`
- `heartbeat.json`
- `desired_state.json`
- `current_state.json`
- `reconcile_plan.json`
- `apply_results.json`
- `applied_state.json`
- `remote_state.json`

A escrita usa arquivo temporario + rename com retry, reduzindo risco de corrupcao em Windows.

### Infra / Telemetry

Existe event bus assincrono com buffer.

Estado atual:

- eventos sao publicados sem bloquear os loops principais
- consumo ainda e local/simples
- ainda nao ha transporte duravel para portal
- ainda nao ha fila persistida de eventos

### Modules / Remote

`modules/remote` e o modulo mais avancado hoje.

Fluxo implementado:

1. inspeciona `remote_state.json`
2. se ha `agent_token` valido, executa sync token-first
3. se nao ha token, executa discover
4. processa `bootstrapFlow`
5. se necessario e possivel, executa bootstrap com `REMOTE_INSTALL_TOKEN`
6. persiste `agent_token`, `host_id`, alias e metadados locais
7. executa sync
8. processa `commandQueue`
9. envia ACK por comando
10. invalida token local quando recebe `ROTATE_TOKEN_REQUIRED`

Comandos tratados hoje:

- `REAPPLY_ALIAS`: ACK noop
- `REAPPLY_CONFIG`: ACK noop
- `ROTATE_TOKEN_REQUIRED`: ACK e marca rebootstrap
- `UPGRADE_CLIENT`: retorna falha controlada porque upgrade ainda nao foi implementado
- comando desconhecido: ACK failed com `COMMAND_UNKNOWN`

Limitacoes atuais do remote:

- ainda nao aplica configuracao RustDesk real
- ainda nao coleta inventario operacional real
- ainda nao persiste fila de ACK pendente se o envio do ACK falhar
- ainda nao executa upgrade de binario
- ainda nao protege `agent_token` com DPAPI

### Modules / Tunnel

`modules/tunnel` ainda e estrutural.

Estado atual:

- participa do reconcile
- inspeciona estado atual como ausente/stub
- gera acoes quando desired state diverge
- apply ainda nao instala/configura Rathole

### Modules / Backup

`modules/backup` ainda e o adaptador de reconcile do modulo de backup, mas segue em stub.

Importante: o pacote `internal/backup` ja possui pipeline interno bem mais avancado. O que falta e conectar esse pipeline ao modulo `modules/backup` e ao `desired_state`.

## Fluxo operacional atual

### Boot

```text
main.go
  -> app.Run
  -> app.Bootstrap
  -> config.Load
  -> cria dependencias
  -> agent.Service.Run
```

### Runtime

```text
identity.Get
registration.EnsureRegistered

goroutines:
  heartbeat.Start
  desiredstate.Start
  health loop
  reconcile.Start
```

### Reconcile remoto

```text
desired state
  -> current state
  -> plan
  -> remote.Inspect
  -> remote.Plan
  -> remote.Apply
     -> sync token-first
     -> ou discover/bootstrap/sync
     -> ack commandQueue
```

## Estado local

### `remote_state.json`

Contem:

- `agent_token`
- `host_id`
- `alias`
- `rustdesk_id`
- `machine_name`
- `rebootstrap_required`
- `last_bootstrap_flow`
- `last_sync_at`
- `updated_at`

Esse arquivo hoje e sensivel porque contem `agent_token`. Proteger esse estado com DPAPI e uma prioridade antes de producao.

## Validacao atual

Com o workspace Go configurado pela raiz:

```powershell
$env:GOCACHE='C:\DEV\documentacao-syspro\apps\agent\.gocache'
$env:GOWORK='C:\DEV\documentacao-syspro\go.work'
go test ./apps/agent/...
```

Resultado atual: todos os pacotes compilam; nao ha testes unitarios dedicados ainda.

## Decisoes consolidadas

- manter tipos compartilhados em `internal/domain`
- manter contratos de consumo nas camadas core
- usar state store local atomico
- usar `context` e `errgroup`
- usar reconcile modular
- manter APIs genericas de agente como opt-in ate existirem no portal
- implementar remote primeiro porque o portal ja tem endpoints `remote/*`
- nao copiar arquivos gerados sem adaptar aos contratos reais do repo

## Roadmap tecnico recomendado

1. Conectar `modules/backup` ao pipeline `internal/backup`.
2. Expandir `domain.BackupDesiredState` para suportar multiplas politicas.
3. Persistir fila de backup em disco.
4. Coletar snapshots reais para `RemoteSyncRequest`.
5. Implementar fila persistente para ACK remoto pendente.
6. Proteger `remote_state.json` com DPAPI no Windows.
7. Evoluir identidade para `MachineGuid` com fallback controlado.
8. Implementar aplicacao real do RustDesk em `REAPPLY_CONFIG`.
9. Implementar upgrade controlado do agente.
10. Adicionar testes com `httptest` para `portal_client`.
11. Adicionar testes unitarios do modulo remote com fake client/store.
12. Criar transporte duravel de telemetria para o portal.
