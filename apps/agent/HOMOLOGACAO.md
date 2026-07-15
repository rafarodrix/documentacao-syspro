# Homologacao do Agente

Este roteiro valida o fluxo enterprise minimo do `agent-service` + `agent-ui` com:

- descoberta automatica da maquina
- vinculacao no portal
- bootstrap remoto
- instalacao/configuracao do RustDesk
- suporte via Chatwoot

## Pre-requisitos

Backend:

- `PORTAL_BASE_URL` deve apontar para o dominio que realmente expoe:
  - `/api/remote/agents/discover`
  - `/api/remote/rustdesk/bootstrap`
  - `/api/remote/rustdesk/sync`
  - `/api/remote/rustdesk/ack`
  - `/api/integrations/chatwoot/agent-context/sync`
- `INTERNAL_API_KEY` valido
- `REMOTE_DISCOVERY_TOKEN` valido
- configuracao global do remoto pronta no portal:
  - `rustdesk.trilinksoftware.com.br`
  - `publicKey`
  - `serverConfig`
  - `defaultPassword`
  - `targetVersion`

Agente:

- [apps/agent/.env](/abs/path/c:/DEV/documentacao-syspro/apps/agent/.env:1) preenchido com:
  - `PORTAL_BASE_URL`
  - `PORTAL_API_KEY`
  - `PORTAL_AGENT_API_ENABLED=true`
  - `SUPPORT_CHATWOOT_BASE_URL`
  - `SUPPORT_CHATWOOT_WEBSITE_TOKEN`
  - `REMOTE_ENABLED=true`
  - `REMOTE_DISCOVERY_TOKEN`
- configuracao global do remoto preenchida no portal, incluindo:
  - URL ou caminho do instalador
  - SHA256 do instalador para `http/https`
  - argumentos silenciosos quando necessario

Windows:

- Windows 10 ou 11
- PowerShell
- WebView2 Runtime desejavel

## Limpeza agressiva do RustDesk

Se uma maquina ficou com instalacao quebrada, servico preso ou resquicios de configuracao antiga do RustDesk, rode como administrador:

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\agent\clean-rustdesk.ps1
```

O script:

- para processos `rustdesk`
- para/remove o servico `RustDesk`
- tenta desinstalar pela chave de uninstall do Windows
- apaga pastas residuais em `Program Files`, `ProgramData`, `APPDATA` e perfis de servico
- limpa entrada de auto-start no registro

Depois disso, reinicie a maquina antes de testar nova instalacao.

## Estado esperado do `.env`

Exemplo minimo:

```env
PORTAL_BASE_URL=https://backend.trilinksoftware.com.br
PORTAL_API_KEY=<mesmo valor do INTERNAL_API_KEY>
PORTAL_AGENT_API_ENABLED=true

SUPPORT_CHATWOOT_BASE_URL=https://chat.trilinksoftware.com.br
SUPPORT_CHATWOOT_WEBSITE_TOKEN=<website token>

REMOTE_ENABLED=true
REMOTE_DISCOVERY_TOKEN=<discovery token>
```

Observacao:

- `REMOTE_INSTALL_TOKEN` deixou de ser configuracao operacional do agente
- o token passa a ser obtido automaticamente depois que a maquina descoberta for vinculada no portal
- o instalador do RustDesk passa a ser governado pelo portal, nao pelo `.env` do agente
- o helper de configuracao remove automaticamente qualquer `REMOTE_INSTALL_TOKEN` legado ainda salvo na maquina

## Execucao

1. Limpe artefatos anteriores.

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\agent\dist\test-deploy\windows-amd64\clean-test-agent.ps1
```

2. Suba o agente com o `.env`.

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\agent\start-agent-from-env.ps1
```

Se quiser manter o console de homologacao aberto para acompanhar logs locais:

```powershell
powershell -ExecutionPolicy Bypass -File .\apps\agent\start-agent-from-env.ps1 -KeepConsoleOpen
```

3. Confirme no console:

- `agent-service` iniciado
- `agent-ui` iniciado
- `ipc client fetched summary`
- `windows tray host started`

Observacao:

- no modo padrao o script local desacopla depois de subir o servico e a UI
- a janela de PowerShell aberta so permanece se voce usar `-KeepConsoleOpen`
- no instalador normal o steady-state esperado continua sendo servico Windows + UI, sem PowerShell persistente visivel

## Sequencia de homologacao

### Fase 1. Presenca local

Validar:

- tray aparece no Windows
- clique em suporte abre a janela do agente
- Chatwoot carrega
- se nao houver RustDesk, o painel mostra contexto parcial e estado remoto nao pronto

### Fase 2. Discover

Validar no backend/portal:

- a maquina aparece como descoberta
- o host identificado bate com:
  - hostname
  - usuario local
  - RustDesk ID, quando existir

### Fase 3. Vinculacao

No portal:

1. vincule a maquina descoberta a um host/empresa
2. aguarde o proximo ciclo do agente

Resultado esperado:

- o `discover` passa a devolver `installToken` automaticamente
- o agente segue para `bootstrap` sem configuracao manual adicional
- se o portal ainda nao devolver `installToken`, o agente fica aguardando o bootstrap autenticado em vez de tentar um token local antigo

### Fase 4. Bootstrap remoto

Resultado esperado:

- o agente recebe:
  - `hostId`
  - `companyId`
  - `companyName`
  - `agentToken`
  - configuracao do RustDesk da Trilink

### Fase 5. Instalacao e convergencia do RustDesk

Resultado esperado:

- se o RustDesk nao existir, o agente instala
- o agente aplica:
  - servidor da Trilink
  - chave publica
  - `serverConfig`
  - senha padrao
  - versao alvo, se aplicavel

### Fase 6. Sync

Resultado esperado:

- o agente entra em `sync` com `agentToken`
- o host passa a aparecer como convergido
- a UI do portal mostra estado de produto coerente:
  - `Aguardando vinculo`
  - `Provisionando remoto`
  - `Remoto pronto`
  - `Atencao necessaria`
  - `Em atendimento`

### Fase 7. Suporte

Resultado esperado:

- ao abrir suporte, a conversa sincroniza contexto tecnico
- o backend grava nota privada e atributos na conversa
- o painel local do agente mostra:
  - `ID remoto`
  - `senha de acesso`

## Checklist final

Considere homologado quando todos estes pontos passarem:

- agente sobe com `start-agent-from-env.ps1`
- tray abre suporte corretamente
- Chatwoot carrega na janela do agente
- maquina aparece como descoberta no portal
- vinculacao no portal funciona
- `discover -> bootstrap -> sync` acontece sem `install token` manual
- RustDesk instala quando ausente
- RustDesk converge para o servidor da Trilink
- host fica em estado `Remoto pronto`
- painel local mostra `ID` e `senha`

## Se falhar

Verifique primeiro:

- `PORTAL_BASE_URL`
- `PORTAL_API_KEY`
- `REMOTE_DISCOVERY_TOKEN`
- `SUPPORT_CHATWOOT_WEBSITE_TOKEN`
- se o dominio configurado realmente expone as rotas `/api/remote/...`
- se o host foi vinculado no portal, ou se a empresa detectada pelo snapshot Syspro gera match unico para auto-vinculo seguro
- se a configuracao `Agente Trilink > Remoto` tem instalador e SHA256 validos para downloads HTTP/HTTPS
- se a maquina nao esta carregando um pacote antigo do agente anterior a remocao do `REMOTE_INSTALL_TOKEN` local

Diagnostico rapido pelos logs:

- se `POST /api/remote/rustdesk/bootstrap` aparecer com `user-agent = WindowsPowerShell/5.1`, esse bootstrap nao veio do runtime Go atual do agente
- nesse caso, a maquina ainda esta executando algum helper/script legado e instalar por cima nao garante limpeza suficiente
- a acao correta passa a ser parar/remover o servico anterior, limpar o estado local e reinstalar com o pacote novo
- se o agente novo estiver comunicando corretamente, os requests de `discover`/`bootstrap`/`sync` aparecem com `user-agent = trilink-agent` ou `trilink-agent/<versao>`
- quando o snapshot Syspro apontar uma unica empresa valida, o backend pode converter o `discover` direto para host vinculado sem etapa manual no portal
- no log local do `agent-service`, a sequencia esperada e `remote discover completed` seguida de `sync completed`

## Observacao de arquitetura

O desenho atual ja esta em um bom nivel para homologacao enterprise inicial:

- backend orquestra onboarding e desired state
- agente executa convergencia
- portal mostra estado de produto

O proximo nivel depois da homologacao e:

- desired state remoto vindo 100% do backend
- mais automacao de vinculo por regra operacional
