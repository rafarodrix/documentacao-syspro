# Release do Agente Windows

O pacote do Agente Trilink tem tres componentes versionados juntos:

- `agent-service.exe`: servico Windows e runtime operacional;
- `agent-ui.exe`: interface Wails;
- `agent-updater.exe`: atualizador de bundles remotos.

O instalador Inno Setup empacota os tres binarios e e gerado em `dist/windows-installer/output`. Arquivos temporarios e executaveis auxiliares ficam em `dist/`; nunca na raiz de `apps/agent`.

## Gerar e publicar uma release local

Use o comando unico a partir da raiz do repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\agent\scripts\release-agent.ps1 -Version 1.0.92
```

Ele executa, nesta ordem:

1. testes Go do agent;
2. build do servico e updater com a versao embutida;
3. build da UI com Wails;
4. staging e compilacao do instalador com Inno Setup;
5. copia dos tres binarios e do instalador para `apps/web/public/agent/<versao>`;
6. calculo de SHA-256 e atualizacao de `apps/web/public/agent/manifest.json`;
7. atualizacao do default e do placeholder de `agentTargetVersion` para a nova versao;
8. validacao de versao e hashes publicados.

A versao deve ser nova e imutavel: nao reutilize uma pasta ja publicada. O script exige Go, Wails CLI, Inno Setup e WebView2 somente para executar a UI resultante.

## Publicacao remota

O repositorio publica os artefatos estaticos no proximo deploy web. O manifesto final fica em:

```text
https://ajuda.trilinksoftware.com.br/agent/manifest.json
```

Configuracoes remotas ja persistidas no banco nao sao substituidas pelo default de codigo. Depois do deploy, ajuste `Agent > Remoto > Versao alvo do agent` para a nova versao quando necessario.

## Validacao manual

```powershell
.\apps\web\public\agent\1.0.92\agent-service.exe version
.\apps\web\public\agent\1.0.92\agent-updater.exe version
Push-Location .\apps\agent
go test ./...
Pop-Location
```

Para testar o manifesto sem aplicar arquivos no host:

```powershell
.\apps\web\public\agent\1.0.92\agent-updater.exe apply-remote `
  --manifest-url https://ajuda.trilinksoftware.com.br/agent/manifest.json `
  --dry-run
```

## Layout instalado

- binarios e assets: `C:\Program Files\Trilink\Agente`;
- configuracao, estado e logs: `C:\ProgramData\Trilink\Agent`.

O instalador inclui RustDesk somente quando um instalador RustDesk estiver presente em `apps/agent/dist/test-deploy/windows-amd64`. O Microsoft Edge WebView2 Runtime e um pre-requisito externo da UI; o servico continua operando sem ele.
