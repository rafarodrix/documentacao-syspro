# Passo a Passo para Gerar um Novo Agent

Atualizado em 2026-04-28.

Este roteiro documenta o fluxo correto para gerar uma nova entrega do agente Windows depois dos ajustes recentes no runtime remoto:

- lock de instância única do `agent-service`
- proteção contra overwrite de `remote_state.json` com token antigo
- logs de fingerprint do token remoto

## O que deve ser gerado

- `agent-service.exe`
- `agent-ui.exe`
- instalador Windows `.exe`

Saída esperada:

- binários base em `apps/agent/dist/test-deploy/windows-amd64`
- pacote de staging em `apps/agent/dist/windows-installer/staging`
- instalador final em `apps/agent/dist/windows-installer/output`

## Arquivos relevantes

- [apps/agent/internal/app/run.go](/abs/path/c:/DEV/documentacao-syspro/apps/agent/internal/app/run.go)
- [apps/agent/internal/app/runtime_lock.go](/abs/path/c:/DEV/documentacao-syspro/apps/agent/internal/app/runtime_lock.go)
- [apps/agent/internal/modules/remote/module.go](/abs/path/c:/DEV/documentacao-syspro/apps/agent/internal/modules/remote/module.go)
- [apps/agent/wails.json](/abs/path/c:/DEV/documentacao-syspro/apps/agent/wails.json)
- [apps/agent/deploy/windows-installer/build-installer-package.ps1](/abs/path/c:/DEV/documentacao-syspro/apps/agent/deploy/windows-installer/build-installer-package.ps1)
- [apps/agent/deploy/windows-installer/compile-installer.ps1](/abs/path/c:/DEV/documentacao-syspro/apps/agent/deploy/windows-installer/compile-installer.ps1)

## Pré-requisitos

Na máquina Windows de build:

- Go instalado
- Wails CLI instalado
- Node e NPM funcionais
- Inno Setup instalado
- WebView2 Runtime disponível para teste local da UI

Ferramentas esperadas no `PATH`:

- `go`
- `npm`
- `wails`
- `powershell`

## Ordem correta

### 1. Ir para a pasta do agent

```powershell
cd C:\DEV\documentacao-syspro\apps\agent
```

### 2. Ajustar cache do Go

```powershell
$env:GOCACHE='C:\DEV\documentacao-syspro\apps\agent\.gocache'
```

Se o monorepo usar `go.work`, manter também:

```powershell
$env:GOWORK='C:\DEV\documentacao-syspro\go.work'
```

### 3. Validar compilação Go antes do instalador

```powershell
go build ./...
```

Se quiser uma checagem rápida mais objetiva:

```powershell
go build -o .\dist\test-deploy\windows-amd64\agent-service.exe .\cmd\agent-service
```

### 4. Recompilar o serviço

```powershell
go build -o .\dist\test-deploy\windows-amd64\agent-service.exe .\cmd\agent-service
```

Resultado esperado:

- `apps/agent/dist/test-deploy/windows-amd64/agent-service.exe`

### 5. Recompilar a UI Wails

Rode a partir de `apps/agent`, não da raiz do monorepo.

```powershell
wails build -clean -skipbindings -platform windows/amd64 -o agent-ui
```

Observação:

- o binário do Wails sai em `apps/agent/build/bin/agent-ui`
- ele precisa ser copiado para o diretório base do pacote

```powershell
Copy-Item -LiteralPath .\build\bin\agent-ui -Destination .\dist\test-deploy\windows-amd64\agent-ui.exe -Force
```

Resultado esperado:

- `apps/agent/dist/test-deploy/windows-amd64/agent-ui.exe`

### 6. Montar o staging do instalador

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows-installer\build-installer-package.ps1
```

Isso monta o pacote intermediário em:

- `apps/agent/dist/windows-installer/staging`

### 7. Compilar o instalador

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows-installer\compile-installer.ps1 -Version "1.0.17"
```

Troque a versão conforme a release.

Saída final esperada:

- `apps/agent/dist/windows-installer/output/agente-trilink-setup-1.0.17.exe`

## Comando completo

```powershell
cd C:\DEV\documentacao-syspro\apps\agent
$env:GOCACHE='C:\DEV\documentacao-syspro\apps\agent\.gocache'
$env:GOWORK='C:\DEV\documentacao-syspro\go.work'
go build -o .\dist\test-deploy\windows-amd64\agent-service.exe .\cmd\agent-service
wails build -clean -skipbindings -platform windows/amd64 -o agent-ui
Copy-Item -LiteralPath .\build\bin\agent-ui -Destination .\dist\test-deploy\windows-amd64\agent-ui.exe -Force
powershell -ExecutionPolicy Bypass -File .\deploy\windows-installer\compile-installer.ps1 -Version "1.0.17"
```

## Validação mínima antes de publicar

Conferir:

- `apps/agent/dist/test-deploy/windows-amd64/agent-service.exe`
- `apps/agent/dist/test-deploy/windows-amd64/agent-ui.exe`
- `apps/agent/dist/windows-installer/output/agente-trilink-setup-<versao>.exe`

Comandos úteis:

```powershell
Get-ChildItem .\dist\test-deploy\windows-amd64
Get-ChildItem .\dist\windows-installer\output
```

## Validação funcional recomendada

Antes de distribuir amplamente, testar em uma máquina Windows limpa ou de homologação:

1. instalar o novo `setup`
2. confirmar que o serviço sobe
3. confirmar que a UI abre
4. verificar bootstrap remoto
5. verificar sync remoto
6. fechar e reabrir o agente para confirmar que não há sessão/token antigo concorrendo

Pontos a observar:

- criação do arquivo de lock do serviço
- `remote_state.json` com token novo persistido
- logs com `token_fingerprint`
- ausência de `AGENT_TOKEN_INVALID` logo após o bootstrap

## Limpeza recomendada em máquina já contaminada

Se a máquina anterior ficou presa com token inválido ou duas instâncias concorrendo, limpar antes de validar o novo build:

1. parar o serviço do agente
2. fechar a UI do agente
3. remover lock antigo, se existir
4. remover o estado remoto local
5. instalar/substituir pelo binário novo

Arquivos/pastas normalmente relevantes:

- `C:\ProgramData\Trilink\Agent\runtime-state\remote_state.json`
- `C:\ProgramData\Trilink\Agent\runtime-state\agent-service.lock`

## Cuidados importantes

- Rode `wails build` dentro de `apps/agent`
- Se rodar da raiz, ele pode procurar `wails.json` no lugar errado
- Se `npm`, `node` ou `wails` não estiverem no `PATH`, use caminho absoluto
- Se o Go falhar com `Access is denied`, mantenha `GOCACHE` local no projeto
- O instalador preserva `.env` existente em `C:\ProgramData\Trilink\Agent\.env`
  - isso é bom para upgrade
  - mas ruim se a configuração antiga estiver errada

## Quando é obrigatório gerar um novo agent

Sempre que houver mudança em:

- `apps/agent/internal/...`
- `apps/agent/cmd/...`
- `apps/agent/main.go`
- `apps/agent/frontend/...`
- scripts do instalador

No caso atual, é obrigatório gerar novo agent porque houve mudança em:

- runtime do serviço
- persistência do módulo remoto
- proteção contra instância duplicada

## Resultado final esperado desta rodada

Depois dessa geração, a versão nova deve:

- impedir duas instâncias do serviço na mesma máquina
- evitar que um token antigo sobrescreva o novo no estado local
- facilitar diagnóstico com fingerprint do token nos logs

## Último artefato esperado

Exemplo de saída desta rodada:

- `apps/agent/dist/windows-installer/output/agente-trilink-setup-1.0.17.exe`
