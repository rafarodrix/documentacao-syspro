# Instalador Windows

Esta pasta contem a definicao do instalador do `Agente Trilink` usando `Inno Setup`.

## Estrutura

- `AgenteTrilink.iss`
  - script principal do instalador
- `build-installer-package.ps1`
  - monta o pacote de staging a partir do `dist/test-deploy/windows-amd64`
- `runtime/`
  - launchers e utilitarios instalados junto com o agente

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
powershell -ExecutionPolicy Bypass -File .\apps\agent\deploy\windows-installer\build-installer-package.ps1
```

3. Compile com Inno Setup:

```powershell
ISCC.exe .\apps\agent\deploy\windows-installer\AgenteTrilink.iss
```

O instalador compilado sai em:

- `apps/agent/dist/windows-installer/output`

Fluxo atual:

- o instalador usa `agent-service.exe install` e `agent-service.exe start`
- a interface e os atalhos abrem `agent-ui.exe` diretamente
- `start-agent.ps1` nao faz mais parte do fluxo principal

## Seed de configuracao

Se `apps/agent/.env` existir localmente, ele entra como seed inicial do instalador.

Se nao existir, o pacote usa:

- `apps/agent/.env.example`

O instalador nao sobrescreve `C:\ProgramData\Trilink\Agent\.env` se esse arquivo ja existir na maquina.
