# Instalador Windows

Esta pasta contem a definicao do instalador do `Agente Trilink` usando `Inno Setup`.

## Estrutura

- `AgenteTrilink.iss`
  - script principal do instalador
- `../../cmd/agent-installer`
  - utilitario Go que monta staging e chama o Inno Setup
- `runtime/`
  - utilitarios residuais instalados junto com o agente

## Modelo operacional

- executaveis e assets ficam em `C:\Program Files\Trilink\Agente`
- configuracao, logs e runtime ficam em `C:\ProgramData\Trilink\Agent`

Isso separa:

- binario
- configuracao
- estado local
- logs

## Como gerar

1. Garanta que os binarios mais recentes estejam em `apps/agent/dist/test-deploy/windows-amd64`
2. Monte o pacote:

```powershell
cd .\apps\agent
go run .\cmd\agent-installer stage
```

3. Compile com Inno Setup:

```powershell
ISCC.exe .\apps\agent\deploy\windows-installer\AgenteTrilink.iss
```

Ou faça tudo em um comando:

```powershell
cd .\apps\agent
go run .\cmd\agent-installer build 1.0.39
```

O instalador compilado sai em:

- `apps/agent/dist/windows-installer/output`

Fluxo atual:

- o instalador usa `agent-service.exe install` e `agent-service.exe start`
- a interface e os atalhos abrem `agent-ui.exe` diretamente
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
