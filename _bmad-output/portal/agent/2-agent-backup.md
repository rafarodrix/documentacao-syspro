# Master Agent Trilink - Modulo de Backup

Atualizado em 2026-04-26.

## Visao geral

O modulo de backup do Master Agent Trilink tem como objetivo executar backup logico de bases Firebird, compactar o artefato, enviar para destino remoto e reportar o resultado ao portal.

Estado atual em producao:

- `internal/backup`: pipeline tecnico implementado em estrutura (gbak, compress, upload, report, queue, manager)
- `internal/modules/backup/module.go`: adaptador de reconcile em **stub** — participa do ciclo mas nao executa pipeline real
- integracao com desired state: pendente
- persistencia de fila em disco: pendente
- report HTTP ao portal: componente existe, nao esta injetado no bootstrap

Nada relacionado a backup e executado hoje em producao. O restante do agente (remote, support, device) opera normalmente sem o modulo de backup.

## Estrutura atual

```text
apps/agent/internal/backup/
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

apps/agent/internal/modules/backup/
  module.go                  <- STUB: Inspect/Plan/Apply sem pipeline real
```

## Pipeline previsto

```text
Database (.fdb)
  -> gbak
  -> backup logico (.fbk)
  -> validacao do .fbk
  -> 7-Zip
  -> arquivo compactado (.7z)
  -> hash SHA-256
  -> rclone copyto
  -> report ao portal
```

O fluxo evita copia cega do `.fdb` e usa `gbak` como etapa oficial para backup logico.

## Estado por arquivo

### `policy.go`

Define contratos internos de politica:

- `BackupPolicy`
- `DatabaseCredentials`
- `CompressionPolicy`
- `UploadPolicy`
- `CompressionProfile`
- `UploadType`

Estado: implementado como modelo interno. Nao ha conversao de `domain.BackupDesiredState` para `BackupPolicy` ainda.

### `task.go`

Representa uma execucao em runtime:

- id da task
- politica aplicada
- timestamps de inicio e fim
- stage atual
- caminhos do `.fbk` e do `.7z`
- tamanhos dos artefatos
- duracoes por etapa
- ultimo erro

Estado: implementado.

### `result.go`

Consolida o resultado final da task:

- task id, policy id, service id, database path
- status
- erro por stage
- duracao total, tamanhos, compression ratio
- duracoes por etapa
- hash SHA-256

Estado: implementado.

### `validate.go`

Valida artefatos intermediarios:

- verifica existencia
- valida tamanho minimo
- bloqueia continuidade quando artefato esta ausente ou invalido

Estado: implementado.

### `hash.go`

Calcula SHA-256 do artefato final. Estado: implementado.

### `gbak.go`

Executa `gbak` via subprocesso:

- monta comando
- executa com contexto
- captura saida
- mede duracao
- valida `.fbk`

Ponto de atencao: credenciais devem vir da politica/desired state e jamais devem ser logadas.

Estado: implementado em estrutura.

### `compress.go`

Executa compressao com `7z`:

- nao usa exclusao automatica insegura
- remove `.fbk` apenas quando politica permitir e apos sucesso validado
- valida `.7z`
- mede duracao

Estado: implementado em estrutura.

### `upload.go`

Executa upload com `rclone copyto`:

- usa destino exato
- nao usa `sync`
- respeita `bwlimit` quando configurado
- mede duracao

Estado: implementado em estrutura.

### `report.go`

Envia resultado de backup ao portal.

Estado: componente existe, nao esta injetado no bootstrap do agente.

Ponto de decisao: confirmar endpoint final com o portal. Candidatos: `/api/agents/backup/result` ou `/api/agents/:deviceId/backup/results`.

### `queue.go`

Gerencia jobs em memoria:

- enfileira job
- controla status
- evita concorrencia por `DatabasePath`
- retry com backoff exponencial
- dispara report assincrono apos execucao

Limitacoes:

- fila nao persistida em disco (jobs perdidos em restart)
- nao ha recovery de boot para jobs incompletos

### `manager.go`

Orquestra pipeline completo:

- cria task
- prepara paths
- executa `gbak`, valida `.fbk`
- comprime, valida archive
- calcula hash
- faz upload
- consolida `Result`

Estado: implementado em estrutura.

### `internal/modules/backup/module.go`

Adaptador que liga backup ao reconcile.

Estado atual (stub):

- `Inspect` retorna modulo ausente
- `Plan` cria acoes quando desired diverge do current
- `Apply` retorna mensagem de stub sem executar pipeline real

Este e o principal gap do modulo de backup.

## Desired state atual

Estrutura atual em `domain.BackupDesiredState`:

```go
type BackupDesiredState struct {
    Enabled       bool
    Version       string
    Schedule      string
    RetentionDays int
    Target        string
}
```

Esse modelo nao suporta o pipeline real porque faltam: lista de politicas, service id, database path, gbak path, 7z path, rclone path, working dir, timeout, credenciais do banco, politica de compressao, politica de upload, limites de banda e estrategia de retry.

## Modelo alvo do desired state

```go
type BackupDesiredState struct {
    Enabled  bool
    Version  string
    Policies []BackupDesiredPolicy
}

type BackupDesiredPolicy struct {
    ID             string
    ServiceID      string
    Enabled        bool
    Schedule       string
    DatabasePath   string
    GbakPath       string
    SevenZipPath   string
    RclonePath     string
    WorkingDir     string
    TimeoutMinutes int
    CredentialsRef string  // referencia, nao texto puro
    Compression    BackupDesiredCompression
    Upload         BackupDesiredUpload
}
```

Credenciais sensiveis devem vir por referencia ou canal protegido, nunca como texto puro no desired state local.

## Estado local recomendado

```text
C:\ProgramData\Trilink\Agent\runtime-state\
  backup_state.json           <- nao criado ainda

C:\ProgramData\Trilink\
  backup\
    queue\                    <- jobs pendentes (nao implementado)
    temp\                     <- artefatos intermediarios
    archives\                 <- .7z finais
    logs\                     <- logs por task
```

## Estados de job modelados

| Estado | Descricao |
|--------|-----------|
| `queued` | Na fila aguardando execucao |
| `running` | Em execucao |
| `success` | Concluido com sucesso |
| `failed` | Falhou apos tentativas |
| `retry_wait` | Aguardando proximo retry |
| `canceled` | Cancelado |

## Tipos de job modelados

- `scheduled` — iniciado pelo scheduler
- `manual` — iniciado por comando do portal ou usuario
- `retry` — reexecucao automatica apos falha
- `boot` — execucao de recovery no boot do servico

## Stages modelados

- `prepare`
- `gbak`
- `validate_fbk`
- `compress`
- `validate_archive`
- `upload`

## Seguranca

Regras obrigatorias antes de ativar backup em producao:

- nao hardcodar credenciais de banco
- nao hardcodar credenciais de upload
- nao logar senha, token, DSN completo ou headers sensiveis
- proteger credenciais locais com DPAPI no Windows
- separar logs de execucao por task sem vazar segredo
- limpar temporarios apenas apos sucesso validado
- proteger `remote_state.json` junto (contem `agent_token`)

## Observabilidade

Eventos recomendados para o event bus do agente:

- `backup_job_queued`
- `backup_job_started`
- `gbak_completed`
- `gbak_failed`
- `fbk_validation_failed`
- `compression_completed`
- `archive_validation_failed`
- `upload_completed`
- `upload_failed`
- `backup_succeeded`
- `backup_failed`
- `backup_retry_scheduled`
- `backup_report_failed`

O agente ja possui `TelemetryEvent` e event bus assincrono. Falta conectar o modulo de backup a esse barramento.

## Gaps atuais

1. `modules/backup` nao instancia `Manager`, `Queue` e `Reporter`
2. `domain.BackupDesiredState` nao expressa politicas reais
3. Fila de backup nao e duravel (jobs perdidos em restart)
4. `Reporter` nao esta injetado no bootstrap
5. Nao ha discovery real de Firebird/gbak no host
6. Nao ha coleta de status de backup no sync remoto
7. Nao ha erros tipados por etapa
8. Nao ha testes automatizados do pipeline
9. Nao ha protecao de credenciais locais

## Proximo corte recomendado

Conectar o modulo sem scheduler completo, em corte minimo:

1. Expandir `BackupDesiredState` para `Policies []BackupDesiredPolicy`
2. Criar mapper de desired state para `backup.BackupPolicy`
3. Atualizar `modules/backup.New(...)` para receber `Manager`, `Queue`, `Reporter`, `StateStore`, `Logger` e `EventBus`
4. Fazer `Inspect` ler estado local `backup_state.json`
5. Fazer `Plan` criar acao quando houver policy habilitada e nenhuma execucao recente
6. Fazer `Apply` enfileirar job (sem executar diretamente no reconcile)
7. Persistir snapshot simples em `backup_state.json`
8. Adicionar teste unitario para mapper e `Plan`

Esse corte conecta o modulo ao agente sem bloquear o reconcile por execucao longa de backup.

## Relacao com o restante do agente

O modulo de backup e independente do remote e do support. Quando implementado, o reconcile vai chamar `backup.Inspect`, `backup.Plan` e `backup.Apply` no mesmo ciclo de 45 segundos que ja executa o remote module. A fila interna do `Queue` vai gerenciar a execucao assincrona para que o reconcile nao fique bloqueado pela duracao do backup.
