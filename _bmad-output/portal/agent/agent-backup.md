# Master Agent Trilink — Módulo de Backup

## Visão Geral

O módulo de backup do **Master Agent Trilink** é responsável por executar o ciclo completo de proteção das bases do cliente, com foco em:

- backup lógico do Firebird
- compressão agressiva para economia de banda
- envio confiável para o destino remoto
- telemetria detalhada por etapa
- execução declarativa baseada em política recebida do portal

O módulo **não trabalha com cópia cega de arquivos `.fdb`**.  
O fluxo padrão utiliza o **`gbak`** para gerar backup lógico, seguido por compressão e transferência.

---

# Objetivos

## Funcionais

- executar backup de uma ou mais bases por dispositivo
- suportar múltiplos caminhos e múltiplas instâncias
- compactar arquivos antes do envio
- enviar com retry controlado
- reportar sucesso ou falha por etapa

## Operacionais

- reduzir tráfego de rede
- evitar intervenção manual
- padronizar backup em todos os clientes
- permitir monitoramento central no portal
- sustentar política por cliente, dispositivo e serviço

---

# Escopo do Módulo

## O módulo cobre

- descoberta de bases elegíveis
- execução do `gbak`
- validação do artefato `.fbk`
- compressão com `7z`
- upload via `rclone`
- report de resultado
- fila e retry

## O módulo não cobre

- gestão de storage remoto
- interface visual de acompanhamento
- retenção final no servidor remoto
- restore automático

---

# Pipeline do Backup

## Fluxo padrão

```text
Database (.fdb)
   ↓
GBAK
   ↓
Backup lógico (.fbk)
   ↓
Validação
   ↓
7-Zip
   ↓
Arquivo compactado (.7z)
   ↓
Rclone
   ↓
Destino remoto
   ↓
Report para o Portal
````

## Etapas do pipeline

### 1. Preparação

- validar política de backup
- resolver caminhos
- validar credenciais
- preparar diretório temporário
- verificar espaço em disco

### 2. Execução do GBAK

- chamar `gbak.exe`
- gerar arquivo `.fbk`
- capturar stdout/stderr
- medir duração

### 3. Validação do `.fbk`

- verificar existência
- verificar tamanho mínimo
- verificar timestamp
- marcar falha se arquivo estiver ausente ou inválido

### 4. Compressão

- compactar `.fbk` em `.7z`
- aplicar perfil de compressão
- opcionalmente remover `.fbk` após sucesso
- medir duração

### 5. Upload

- enviar o `.7z` ao destino remoto
- aplicar limite de banda, se configurado
- capturar log do `rclone`
- medir duração

### 6. Report

- consolidar metadata
- registrar status final
- enviar resultado ao portal

---

# Estado Atual da Implementação

## Decisões já consolidadas

- uso de `exec.CommandContext` em subprocessos
- uso de `CombinedOutput` para capturar saída
- `gbak` como fonte oficial do backup lógico
- compressão via `7z.exe`
- envio via `rclone`
- resultado estruturado por execução
- hash do artefato final
- fila com retry e backoff
- report de resultado para o portal

## Ajustes feitos no código inicial

- remoção de credenciais hardcoded
- remoção de exclusão automática via `-sdel`
- validação de artefatos após cada etapa
- uso de `rclone copyto` para destino exato
- medição de duração por etapa
- separação clara entre policy, task, result e queue

---

# Estrutura do Código

## Estrutura atual do módulo

```text
internal/backup/
├── manager.go
├── policy.go
├── task.go
├── result.go
├── validate.go
├── hash.go
├── gbak.go
├── compress.go
├── upload.go
├── report.go
└── queue.go
```

---

# Responsabilidades por Arquivo

## `manager.go`

Orquestra o ciclo completo de backup.

Responsável por:

- criar a tarefa
- montar caminhos temporários
- controlar timeout global da execução
- chamar `gbak`, compressão, hash e upload
- consolidar o `Result`

---

## `policy.go`

Define os contratos internos de política de backup.

Responsável por:

- modelagem da política
- definição de perfis de compressão
- definição do destino de upload
- encapsulamento de credenciais
- parâmetros de timeout e diretório de trabalho

### Observação

`policy.go` **continua necessário**, pois é a base de entrada do pipeline e o ponto de integração com o `desired_state`.

---

## `task.go`

Representa uma execução de backup em runtime.

Responsável por:

- manter identificador da tarefa
- armazenar estado corrente
- rastrear estágio atual
- armazenar caminhos de artefatos
- registrar durações e tamanhos

---

## `result.go`

Modela o resultado consolidado da execução.

Responsável por:

- representar sucesso ou falha
- expor metadados de duração
- expor tamanhos
- expor hash
- registrar etapa e mensagem de erro

---

## `validate.go`

Valida artefatos intermediários.

Responsável por:

- verificar se arquivo existe
- validar tamanho mínimo
- bloquear continuidade em caso de artefato inválido

---

## `hash.go`

Calcula hash SHA-256 do artefato final.

Responsável por:

- abrir arquivo
- calcular hash
- retornar assinatura para telemetria e integridade

---

## `gbak.go`

Executa o backup lógico do Firebird.

Responsável por:

- montar o comando do `gbak`
- usar credenciais recebidas via política
- capturar stdout/stderr
- validar o `.fbk` gerado
- medir duração da etapa

---

## `compress.go`

Executa compressão com `7z`.

Responsável por:

- aplicar perfil de compressão
- gerar `.7z`
- validar arquivo gerado
- remover `.fbk` apenas se a política permitir

---

## `upload.go`

Executa envio com `rclone`.

Responsável por:

- resolver o arquivo fonte
- montar destino remoto
- aplicar limite de banda
- executar `copyto`
- medir duração do upload

---

## `report.go`

Envia o resultado da execução ao portal.

Responsável por:

- montar payload com `instance_id`
- serializar resultado
- enviar para `/agents/backup/result`
- tratar erro de comunicação
    
---

## `queue.go`

Gerencia fila de execução.

Responsável por:

- enfileirar jobs
    
- processar jobs elegíveis
    
- impedir concorrência na mesma base
    
- aplicar retry com backoff exponencial
    
- disparar report assíncrono após execução
    

---

# Estrutura de Runtime

## Diretórios locais

```text
C:\ProgramData\Trilink\
  backup\
    queue\
    temp\
    archives\
    logs\
```

## Finalidade

### `queue/`

Armazena jobs pendentes ou reprocessáveis.

### `temp/`

Armazena arquivos temporários de trabalho:

- `.fbk`
    
- `.7z`
    
- arquivos intermediários
    

### `archives/`

Opcional para retenção local curta.

### `logs/`

Logs por execução:

- `gbak`
    
- compressão
    
- upload
    
- report
    

---

# Política de Backup

## Modelo conceitual

Cada política representa uma base específica ou um serviço de banco específico.

## Exemplo

```json
{
  "id": "bkp-prod",
  "service_id": "firebird-prod",
  "database_path": "C:\\Dados\\PROD.FDB",
  "gbak_path": "C:\\Program Files\\Firebird\\Firebird_3_0\\gbak.exe",
  "enabled": true,
  "schedule": "0 2 * * *",
  "timeout_minutes": 120,
  "compression": {
    "enabled": true,
    "profile": "max",
    "delete_source_after_success": true
  },
  "upload": {
    "type": "sftp",
    "remote_name": "trilink-remote",
    "remote_path": "/backup/clientes/cliente-abc/prod",
    "bwlimit": "2M"
  }
}
```

---

# Contratos Internos

## `BackupPolicy`

```go
type BackupPolicy struct {
	ID           string
	ServiceID    string
	DatabasePath string
	GbakPath     string
	SevenZipPath string
	RclonePath   string
	WorkingDir   string
	Timeout      time.Duration
	Credentials  DatabaseCredentials
	Compression  CompressionPolicy
	Upload       UploadPolicy
}
```

## `DatabaseCredentials`

```go
type DatabaseCredentials struct {
	Username string
	Password string
}
```

## `CompressionPolicy`

```go
type CompressionPolicy struct {
	Enabled                  bool
	Profile                  CompressionProfile
	DeleteSourceAfterSuccess bool
}
```

## `UploadPolicy`

```go
type UploadPolicy struct {
	Type       UploadType
	RemoteName string
	RemotePath string
	BwLimit    string
}
```

## `Task`

```go
type Task struct {
	ID           string
	Policy       BackupPolicy
	StartedAt    time.Time
	FinishedAt   time.Time
	CurrentStage Stage

	FBKPath     string
	ArchivePath string

	FBKSizeBytes     int64
	ArchiveSizeBytes int64

	GbakDuration     time.Duration
	CompressDuration time.Duration
	UploadDuration   time.Duration

	LastError error
}
```

## `Result`

```go
type Result struct {
	TaskID          string       `json:"task_id"`
	PolicyID        string       `json:"policy_id"`
	ServiceID       string       `json:"service_id"`
	DatabasePath    string       `json:"database_path"`
	Status          ResultStatus `json:"status"`
	ErrorStage      string       `json:"error_stage,omitempty"`
	ErrorMessage    string       `json:"error_message,omitempty"`
	StartedAt       time.Time    `json:"started_at"`
	FinishedAt      time.Time    `json:"finished_at"`
	DurationSeconds int          `json:"duration_seconds"`

	FBKSizeBytes     int64   `json:"fbk_size_bytes"`
	ArchiveSizeBytes int64   `json:"archive_size_bytes"`
	CompressionRatio float64 `json:"compression_ratio"`

	GbakDurationSeconds     int `json:"gbak_duration_seconds"`
	CompressDurationSeconds int `json:"compress_duration_seconds"`
	UploadDurationSeconds   int `json:"upload_duration_seconds"`

	Hash string `json:"hash,omitempty"`
}
```

---

# Etapa 1 — Descoberta

## Objetivo

Descobrir bases candidatas antes de existir política fixa no portal.

## Fontes de descoberta

- caminhos padrões
- varredura controlada em diretórios conhecidos
- informação trazida por discovery do agente
- configuração recebida do portal

## Regra operacional

A descoberta ajuda no onboarding, mas a execução definitiva deve usar o que foi aprovado no `desired_state`.

---

# Etapa 2 — Execução do GBAK

## Objetivo

Gerar backup lógico da base Firebird.

## Entrada

- caminho da base
- caminho do `gbak.exe`
- credenciais
- destino temporário
- timeout

## Saída

- arquivo `.fbk`
- duração
- stdout/stderr
- status

## Regras

- executar com contexto e timeout
- não hardcodar credenciais no código
- registrar saída detalhada
- validar artefato ao final

## Exemplo conceitual

```go
cmd := exec.CommandContext(ctx, gbakPath,
    "-b",
    "-v",
    "-user", user,
    "-pass", pass,
    databasePath,
    backupFile,
)
```

---

# Etapa 3 — Validação do `.fbk`

## Objetivo

Garantir que o artefato intermediário é minimamente válido antes de seguir.

## Validações mínimas

- arquivo existe
- tamanho maior que zero
- permissões de leitura válidas

## Resultado

- sucesso
- falha com motivo
- bloqueio da etapa seguinte em caso de erro

---

# Etapa 4 — Compressão

## Objetivo
Reduzir o volume de dados enviados pela rede.

## Estratégia
Compressão com `7z.exe` embutido no agente.

## Perfis atuais

### `fast`
Menor uso de CPU, menor compressão.

### `balanced`
Equilíbrio entre CPU e tamanho final.

### `max`
Compressão máxima, melhor economia de banda.

## Exemplo conceitual

```go
cmd := exec.CommandContext(ctx, sevenZipPath,
    "a",
    archiveFile,
    sourceFile,
    "-mx=9",
    "-mmt=on",
)
```

## Regras

- não usar `-sdel` diretamente
- só remover o `.fbk` após sucesso validado
- registrar duração da compressão
- validar o `.7z` gerado
- calcular hash do artefato final

---

# Etapa 5 — Upload

## Objetivo

Enviar o backup compactado ao destino remoto configurado.

## Estratégia atual

- destino: **SFTPGo**
- protocolo: **SFTP**
- transporte: **rclone**

## Comando adotado

Uso de `copyto` para envio do arquivo ao destino exato.

## Exemplo conceitual

```go
cmd := exec.CommandContext(ctx, rclonePath,
    "copyto",
    sourceFile,
    remoteTarget,
    "--bwlimit", "2M",
)
```

## Regras

- usar `copyto`
- não usar `sync`
- respeitar limite de banda da política
- capturar stdout/stderr
- registrar duração

---

# Etapa 6 — Report

## Objetivo

Entregar ao portal resultado detalhado da execução.

## Conteúdo mínimo

- política executada
- serviço associado
- base processada
- status final
- duração total
- tamanhos
- hash
- etapa que falhou
- mensagem de erro

## Endpoint atual

```http
POST /agents/backup/result
```

## Exemplo de payload

```json
{
  "instance_id": "uuid",
  "policy_id": "bkp-prod",
  "service_id": "firebird-prod",
  "database_path": "C:\\Dados\\PROD.FDB",
  "status": "success",
  "started_at": "2026-04-12T22:00:00Z",
  "finished_at": "2026-04-12T22:05:00Z",
  "duration_seconds": 300,
  "fbk_size_bytes": 1258291200,
  "archive_size_bytes": 367001600,
  "compression_ratio": 0.29,
  "hash": "abc123",
  "error_stage": "",
  "error_message": ""
}
```

---

# Fila de Backup

## Objetivo

Evitar perda de execução em caso de erro pontual ou indisponibilidade do destino.

## Tipos de job

- agendado
- manual
- retry
- fallback no boot

## Regras

- retry com backoff exponencial
- limitar número de tentativas
- impedir múltiplos backups concorrentes da mesma base
- reportar cada execução
- persistência em disco ainda pendente de implementação

---

# Estados do Job

## Status possíveis

|Status|Descrição|
|---|---|
|queued|aguardando execução|
|running|em execução|
|success|concluído|
|failed|falhou|
|retry_wait|aguardando retry|
|canceled|cancelado|

## Etapas possíveis

|Stage|Descrição|
|---|---|
|prepare|preparação|
|gbak|geração do `.fbk`|
|validate_fbk|validação do `.fbk`|
|compress|compressão|
|validate_archive|validação do `.7z`|
|upload|envio|

---

# Segurança

## Regras obrigatórias

- nunca hardcodar credenciais do banco
- nunca hardcodar credenciais de upload
- logs não devem vazar segredos
- arquivos temporários devem ser limpos após sucesso
- falhas devem registrar contexto sem expor credenciais

---

# Observabilidade

## Eventos a registrar

- job enfileirado
- início da execução
- fim do `gbak`
- falha de validação
- fim da compressão
- falha no upload
- sucesso final
- retry agendado
- falha no report

## Logs recomendados

- um arquivo de log por job
- correlação por `task_id`
- separação por etapa

---

# Falhas esperadas

## Categorias

### Falha de descoberta

- `gbak` não encontrado
- base não localizada

### Falha de permissão

- sem acesso à base
- sem permissão em pasta temporária

### Falha de execução

- timeout do `gbak`
- processo abortado
- arquivo intermediário não gerado

### Falha de compressão

- 7z indisponível
- espaço insuficiente
- artefato inválido

### Falha de upload

- destino indisponível
- credencial inválida
- timeout de rede

### Falha de report

- portal indisponível
- token inválido
- timeout HTTP

---

# Regras de Limpeza

## Após sucesso

- remover `.fbk` se a política permitir
- manter `.7z` temporariamente apenas se exigido
- limpar arquivos temporários antigos

## Após falha

- preservar artefatos úteis para diagnóstico
- preservar log da execução
- marcar job para retry quando aplicável

---

# Roadmap do Módulo

## Já implementado

- `policy.go`
- `task.go`
- `result.go`
- `validate.go`
- `hash.go`
- `gbak.go`
- `compress.go`
- `upload.go`
- `manager.go`
- `report.go`
- `queue.go`

## Próximas entregas

- persistência da fila em disco
- discovery de Firebird/gbak
- integração com `desired_state`
- heartbeat com status de backup
- limpeza automática estruturada
- tipagem de erros por estágio

---

# Melhorias planejadas

## `errors.go`

Padronização de erros por etapa:

- `ErrGbakNotFound`
- `ErrFBKValidation`
- `ErrCompressionFailed`
- `ErrUploadFailed`
- `ErrReportFailed`

## Persistência de fila

Persistência de jobs em disco para recuperar tentativas após reboot.

## Múltiplos destinos

Suporte futuro a S3-compatible além de SFTP.

---

# Conclusão

O módulo de backup do Master Agent opera hoje como um pipeline confiável, observável e declarativo.

Ele é responsável por transformar:

- uma base Firebird em uso
- em um artefato lógico seguro
- compactado
- enviado
- e rastreável no portal