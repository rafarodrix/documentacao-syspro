# Master Agent Trilink - Modulo de Backup

Atualizado em 2026-04-16.

## Visao geral

O modulo de backup do Master Agent Trilink tem como objetivo executar backup logico de bases Firebird, compactar o artefato, enviar para destino remoto e reportar o resultado ao portal.

O pacote `internal/backup` ja contem a maior parte do pipeline tecnico. O adaptador `internal/modules/backup`, que liga esse pipeline ao reconcile e ao `desired_state`, ainda esta em stub.

Em termos praticos:

- pipeline interno: implementado em estrutura
- modulo de reconcile: parcial/stub
- integracao com desired state: pendente
- persistencia de fila: pendente
- report HTTP: implementado como componente, mas ainda nao conectado no bootstrap

## Estrutura atual do codigo

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
  module.go
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

O fluxo evita copia cega de `.fdb` e usa `gbak` como etapa oficial para gerar backup logico.

## Estado por arquivo

### `policy.go`

Define os contratos internos de politica:

- `BackupPolicy`
- `DatabaseCredentials`
- `CompressionPolicy`
- `UploadPolicy`
- `CompressionProfile`
- `UploadType`

Estado atual: implementado como modelo interno.

Limite atual: ainda nao ha conversao de `domain.BackupDesiredState` para `BackupPolicy`.

### `task.go`

Representa uma execucao em runtime.

Campos atuais:

- id da task
- politica aplicada
- timestamps de inicio e fim
- stage atual
- caminhos do `.fbk` e do `.7z`
- tamanhos dos artefatos
- duracoes por etapa
- ultimo erro

Estado atual: implementado.

### `result.go`

Consolida o resultado final da task.

Inclui:

- task id
- policy id
- service id
- database path
- status
- erro por stage
- duracao total
- tamanhos
- compression ratio
- duracoes por etapa
- hash

Estado atual: implementado.

### `validate.go`

Valida artefatos intermediarios.

Estado atual: implementado.

Responsabilidades:

- verificar existencia
- validar tamanho minimo
- bloquear continuidade quando artefato esta ausente ou invalido

### `hash.go`

Calcula SHA-256 do artefato final.

Estado atual: implementado.

### `gbak.go`

Executa o `gbak` via subprocesso.

Estado atual: implementado em estrutura.

Responsabilidades:

- montar comando
- executar com contexto
- capturar saida
- medir duracao
- validar `.fbk`

Ponto de atencao: credenciais precisam vir da politica/desired state e nao devem ser logadas.

### `compress.go`

Executa compressao com `7z`.

Estado atual: implementado em estrutura.

Regras preservadas:

- nao usar exclusao automatica insegura
- remover `.fbk` apenas quando politica permitir e depois de sucesso validado
- validar `.7z`
- medir duracao

### `upload.go`

Executa upload com `rclone copyto`.

Estado atual: implementado em estrutura.

Regras:

- usar destino exato
- nao usar `sync`
- respeitar `bwlimit` quando configurado
- medir duracao

### `report.go`

Envia resultado de backup ao portal.

Estado atual: componente existe, mas ainda nao esta conectado no bootstrap do agente.

Endpoint documentado:

```http
POST /agents/backup/result
```

Ponto de decisao: alinhar rota final com a superficie atual do portal. O portal hoje esta mais consolidado em `/api/remote/*`; antes de ativar report em producao, confirmar se o endpoint deve ser `/api/agents/backup/result`, `/agents/backup/result` ou outro contrato versionado.

### `queue.go`

Gerencia jobs em memoria.

Estado atual: implementado em memoria.

Funcionalidades atuais:

- enfileirar job
- controlar status
- evitar concorrencia por `DatabasePath`
- retry com backoff exponencial
- disparar report assincrono apos execucao

Limite atual:

- fila nao e persistida em disco
- jobs sao perdidos se o agente reiniciar
- ainda nao existe recovery de boot para jobs incompletos

### `manager.go`

Orquestra o pipeline completo.

Estado atual: implementado em estrutura.

Responsabilidades:

- criar task
- preparar paths
- executar `gbak`
- validar `.fbk`
- comprimir
- validar archive
- calcular hash
- fazer upload
- consolidar `Result`

### `internal/modules/backup/module.go`

Este e o adaptador que deveria ligar backup ao reconcile.

Estado atual: stub.

Comportamento atual:

- `Inspect` retorna modulo ausente
- `Plan` cria acoes quando desired diverge do current
- `Apply` retorna mensagem de stub

Esse e o principal gap do modulo de backup.

## Desired state atual

O tipo atual em `domain.BackupDesiredState` e simples:

```go
type BackupDesiredState struct {
    Enabled       bool
    Version       string
    Schedule      string
    RetentionDays int
    Target        string
}
```

Esse modelo nao e suficiente para o pipeline real, porque faltam:

- lista de politicas
- service id
- database path
- gbak path
- 7z path
- rclone path
- working dir
- timeout
- credenciais do banco
- politica de compressao
- politica de upload
- limites de banda
- estrategia de retry

## Modelo recomendado para evoluir

Evoluir `BackupDesiredState` para algo proximo de:

```go
type BackupDesiredState struct {
    Enabled  bool
    Version  string
    Policies []BackupDesiredPolicy
}

type BackupDesiredPolicy struct {
    ID           string
    ServiceID    string
    Enabled      bool
    Schedule     string
    DatabasePath string
    GbakPath     string
    SevenZipPath string
    RclonePath   string
    WorkingDir   string
    TimeoutMinutes int
    CredentialsRef string
    Compression BackupDesiredCompression
    Upload      BackupDesiredUpload
}
```

Credenciais sensiveis devem preferencialmente vir por referencia ou por canal protegido, nao como texto puro persistido no desired state local.

## Runtime local recomendado

```text
C:\ProgramData\Trilink\
  agent\
    identity.json
    desired_state.json
    remote_state.json

  backup\
    queue\
    temp\
    archives\
    logs\
```

## Estados de job

Estados ja modelados:

- `queued`
- `running`
- `success`
- `failed`
- `retry_wait`
- `canceled`

Tipos de job ja modelados:

- `scheduled`
- `manual`
- `retry`
- `boot`

Stages ja modelados:

- `prepare`
- `gbak`
- `validate_fbk`
- `compress`
- `validate_archive`
- `upload`

## Seguranca

Regras obrigatorias antes de producao:

- nao hardcodar credenciais de banco
- nao hardcodar credenciais de upload
- nao logar senha, token, DSN completo ou headers sensiveis
- proteger credenciais locais com DPAPI no Windows
- proteger `remote_state.json`, porque contem `agent_token`
- separar logs de execucao por task sem vazar segredo
- limpar temporarios apenas apos sucesso validado

## Observabilidade

Eventos recomendados:

- backup job queued
- backup job started
- gbak completed
- gbak failed
- fbk validation failed
- compression completed
- archive validation failed
- upload completed
- upload failed
- backup succeeded
- backup failed
- backup retry scheduled
- backup report failed

O agente ja possui `TelemetryEvent` e event bus assincrono. Falta conectar o modulo de backup a esse barramento.

## Gaps atuais

1. `modules/backup` ainda nao instancia `Manager`, `Queue` e `Reporter`.
2. `domain.BackupDesiredState` ainda nao expressa politicas reais.
3. Fila de backup ainda nao e duravel.
4. Reporter ainda nao esta injetado no bootstrap.
5. Nao ha discovery real de Firebird/gbak.
6. Nao ha coleta de status de backup no sync remoto.
7. Nao ha erros tipados por etapa.
8. Nao ha testes automatizados do pipeline.
9. Nao ha protecao local de segredos.

## Proximo corte recomendado

Implementar uma primeira integracao pequena, sem scheduler completo:

1. Expandir `BackupDesiredState` para `Policies []BackupPolicy`.
2. Criar mapper de desired state para `backup.BackupPolicy`.
3. Atualizar `modules/backup.New(...)` para receber `Manager`, `Queue`, `Reporter`, `StateStore`, `Logger` e `EventBus`.
4. Fazer `Inspect` ler estado local `backup_state.json`.
5. Fazer `Plan` criar acao quando houver policy habilitada e nenhuma execucao recente.
6. Fazer `Apply` enfileirar job, sem executar diretamente no reconcile.
7. Persistir snapshot simples de estado do backup.
8. Adicionar teste unitario para mapper e `Plan`.

Esse corte conecta o modulo ao agente sem bloquear o reconcile por execucao longa de backup.
