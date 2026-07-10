# Instalador Windows

Esta pasta contem a definicao do instalador do `Agente Trilink` usando `Inno Setup`.

## Estrutura

- `AgenteTrilink.iss`
  - script principal do instalador
- `../../cmd/agent-installer`
  - utilitario Go que monta staging e chama o Inno Setup
- `runtime/`
  - utilitarios residuais instalados junto com o agente
  - inclui launcher para configuracao assistida do `.env`

## Modelo operacional

- executaveis e assets ficam em `C:\Program Files\Trilink\Agente`
- configuracao, logs e runtime ficam em `C:\ProgramData\Trilink\Agent`

Isso separa:

- binario
- configuracao
- estado local
- logs

## Como gerar

1. Gere a UI com Wails. Nao use `go build` para `agent-ui`.

```powershell
cd .\apps\agent
C:\Users\rafael\go\bin\wails.exe build -clean -platform windows/amd64 -nopackage -o agent-ui.exe
```

O binario da UI deve sair em `apps/agent/build/bin`.

2. Gere ou atualize o servico Windows em `apps/agent/dist/test-deploy/windows-amd64`:

```powershell
cd .\apps\agent
go build -o .\dist\test-deploy\windows-amd64\agent-service.exe .\cmd\agent-service
```

3. Monte o pacote:

```powershell
cd .\apps\agent
go run .\cmd\agent-installer stage
```

Se preferir compilar o builder primeiro:

```powershell
cd .\apps\agent
go build -o .\agent-installer.exe .\cmd\agent-installer
.\agent-installer.exe stage
```

4. Compile o instalador com Inno Setup:

```powershell
ISCC.exe .\apps\agent\deploy\windows-installer\AgenteTrilink.iss
```

Ou gere tudo em um único passo especificando a versão:

```powershell
cd .\apps\agent
go run .\cmd\agent-installer build 1.0.54
```

Se já houver um builder compilado:

```powershell
.\agent-installer.exe build 1.0.54
```

O instalador compilado sai em:

- `apps/agent/dist/windows-installer/output`

Fluxo atual:

- o instalador usa `agent-service.exe install` e `agent-service.exe start`
- a interface e os atalhos abrem `agent-ui.exe` diretamente
- o `agent-ui.exe` empacotado deve vir do `wails build`; `go build` gera um binario invalido para Wails
- o menu instalado tambem expone `Configurar agente`, que eleva um helper PowerShell para atualizar `PORTAL_BASE_URL` e tokens sem editar o `.env` manualmente
- `start-agent.ps1` nao faz mais parte do fluxo principal
- `ensure-webview2-runtime.ps1` nao faz mais parte do pacote nem do instalador
- a geracao oficial do instalador nao usa mais wrappers PowerShell

## Seed de configuracao

Se `apps/agent/.env` existir localmente, ele entra como seed inicial do instalador.

Se nao existir, o pacote usa:

- `apps/agent/.env.example`

O instalador nao sobrescreve `C:\ProgramData\Trilink\Agent\.env` se esse arquivo ja existir na maquina.

## Pre-requisito externo

O `Microsoft Edge WebView2 Runtime` deve existir na maquina para a UI Wails abrir.

Se a maquina nao tiver WebView2:

- instale previamente o runtime oficial da Microsoft
- ou distribua isso como pre-requisito corporativo via GPO, Intune ou imagem base
