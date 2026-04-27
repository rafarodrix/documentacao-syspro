# Passo a Passo para Gerar um Novo Agent

Este roteiro documenta o fluxo operacional para gerar:

- `agent-service.exe`
- `agent-ui.exe`
- instalador Windows `.exe`

Saida esperada:

- binarios base em `apps/agent/dist/test-deploy/windows-amd64`
- instalador final em `apps/agent/dist/windows-installer/output`

## Pre-requisitos

No Windows da maquina de build:

- Go instalado
- Wails CLI instalado
- Node/NPM funcional para o frontend do agent
- Inno Setup instalado

Arquivos relevantes:

- [apps/agent/wails.json](/abs/path/c:/DEV/documentacao-syspro/apps/agent/wails.json)
- [apps/agent/deploy/windows-installer/build-installer-package.ps1](/abs/path/c:/DEV/documentacao-syspro/apps/agent/deploy/windows-installer/build-installer-package.ps1)
- [apps/agent/deploy/windows-installer/compile-installer.ps1](/abs/path/c:/DEV/documentacao-syspro/apps/agent/deploy/windows-installer/compile-installer.ps1)

## Ordem correta

### 1. Ir para a pasta do agent

```powershell
cd C:\DEV\documentacao-syspro\apps\agent
```

### 2. Recompilar o service

```powershell
$env:GOCACHE='C:\DEV\documentacao-syspro\apps\agent\.gocache'
go build -o .\dist\test-deploy\windows-amd64\agent-service.exe .\cmd\agent-service
```

### 3. Recompilar a UI

Rode a partir de `apps/agent`, nao da raiz do monorepo.

```powershell
$env:GOCACHE='C:\DEV\documentacao-syspro\apps\agent\.gocache'
wails build -clean -skipbindings -platform windows/amd64 -o agent-ui
```

Observacao:

- o binario do Wails sai em `apps/agent/build/bin/agent-ui`
- copie esse arquivo para o diretório de deploy do instalador

```powershell
Copy-Item -LiteralPath .\build\bin\agent-ui -Destination .\dist\test-deploy\windows-amd64\agent-ui.exe -Force
```

### 4. Montar o staging do instalador

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows-installer\build-installer-package.ps1
```

Isso monta o pacote intermediario em:

- `apps/agent/dist/windows-installer/staging`

### 5. Compilar o instalador

Use o script do projeto, que:

- monta staging
- detecta o `ISCC.exe`
- compila o `.iss`

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows-installer\compile-installer.ps1 -Version "1.0.16"
```

Substitua a versao conforme a release desejada.

Saida final:

- `apps/agent/dist/windows-installer/output/agente-trilink-setup-1.0.16.exe`

## Comando completo

Se quiser fazer tudo em sequencia:

```powershell
cd C:\DEV\documentacao-syspro\apps\agent
$env:GOCACHE='C:\DEV\documentacao-syspro\apps\agent\.gocache'
go build -o .\dist\test-deploy\windows-amd64\agent-service.exe .\cmd\agent-service
wails build -clean -skipbindings -platform windows/amd64 -o agent-ui
Copy-Item -LiteralPath .\build\bin\agent-ui -Destination .\dist\test-deploy\windows-amd64\agent-ui.exe -Force
powershell -ExecutionPolicy Bypass -File .\deploy\windows-installer\compile-installer.ps1 -Version "1.0.16"
```

## Cuidados importantes

- Rode o `wails build` dentro de `apps/agent`
  - se rodar da raiz, ele procura `wails.json` no lugar errado
- Se o terminal nao encontrar `npm`, `node` ou `wails`, ajuste o PATH ou use caminho absoluto
- Se o Go falhar com `Access is denied` no cache, force:

```powershell
$env:GOCACHE='C:\DEV\documentacao-syspro\apps\agent\.gocache'
```

- O instalador usa como base:
  - `agent-service.exe`
  - `agent-ui.exe`
  - `.env` ou `.env.example`
  - scripts de runtime

## Validacao minima antes de publicar

Confira:

- `apps/agent/dist/test-deploy/windows-amd64/agent-service.exe`
- `apps/agent/dist/test-deploy/windows-amd64/agent-ui.exe`
- `apps/agent/dist/windows-installer/output/agente-trilink-setup-<versao>.exe`

Se quiser validar rapidamente o pacote base:

```powershell
Get-ChildItem .\dist\test-deploy\windows-amd64
Get-ChildItem .\dist\windows-installer\output
```

## Ultimo exemplo gerado

Instalador gerado com sucesso neste fluxo:

- `apps/agent/dist/windows-installer/output/agente-trilink-setup-1.0.16.exe`
