# Refatoração da Interface Wails do Trilink Agent

## Contexto

O Trilink Agent é uma aplicação desenvolvida em Go para gerenciamento das máquinas dos clientes da Trilink Software.

Atualmente, o agente possui uma interface gráfica desenvolvida com **Wails**, além das funcionalidades operacionais responsáveis por:

* registro e identificação da máquina;
* autenticação com o backend;
* heartbeat;
* atualização do agente;
* instalação e gerenciamento do RustDesk;
* gerenciamento do túnel Rathole;
* execução de backups Firebird;
* upload de arquivos;
* diagnósticos;
* telemetria;
* comunicação com o portal Trilink.

A decisão arquitetural é **manter o Wails como tecnologia da interface gráfica**, mas separar completamente a interface do processo principal responsável pelo funcionamento do agente.

O Wails deverá continuar sendo utilizado para oferecer uma interface moderna com frontend web, preferencialmente React e TypeScript, sem assumir responsabilidades operacionais que pertencem ao serviço do agente.

---

# Objetivo principal

Refatorar o Trilink Agent para que seja dividido em três executáveis independentes:

```text
trilink-agent-service.exe
trilink-agent-ui.exe
trilink-agent-updater.exe
```

A arquitetura final deverá ser:

```text
Trilink Agent

├── Serviço principal
│   └── trilink-agent-service.exe
│
├── Interface gráfica Wails
│   └── trilink-agent-ui.exe
│
└── Atualizador
    └── trilink-agent-updater.exe
```

O serviço deverá continuar funcionando normalmente mesmo quando:

* nenhum usuário estiver logado;
* a interface Wails estiver fechada;
* a interface apresentar falha;
* a interface estiver sendo atualizada;
* a máquina for utilizada somente como servidor;
* o Windows for iniciado sem sessão interativa.

---

# Decisão tecnológica

A interface deverá continuar utilizando:

```text
Wails
Go
React
TypeScript
```

Não migrar neste momento para:

* Electron;
* Tauri;
* Fyne;
* WPF;
* WinUI;
* Flutter;
* outra tecnologia de desktop.

A refatoração deverá preservar o Wails e melhorar somente sua separação arquitetural em relação ao serviço principal.

Preferencialmente, manter a versão estável do Wails atualmente utilizada pelo projeto.

Não migrar para uma versão alpha, beta ou experimental durante esta refatoração.

---

# Princípios obrigatórios

A implementação deverá respeitar os seguintes princípios:

1. O Wails será somente a camada de interface gráfica.
2. A interface não deverá executar as rotinas principais do agente.
3. A interface não deverá armazenar credenciais sensíveis.
4. A interface não deverá controlar diretamente serviços Windows.
5. A interface não deverá acessar diretamente o banco de estado interno.
6. A interface não deverá acessar diretamente arquivos internos do RustDesk.
7. A interface não deverá possuir credenciais administrativas do backend.
8. Fechar a interface não deverá parar o agente.
9. Atualizar a interface não deverá reiniciar o serviço.
10. O serviço deverá funcionar integralmente sem a interface.
11. Toda operação sensível deverá ser validada pelo serviço.
12. A comunicação entre interface e serviço deverá ser local, autenticada e tipada.
13. Não poderá existir execução arbitrária de comandos pela interface.
14. A funcionalidade atualmente disponível ao usuário deverá ser preservada.
15. O legado deverá ser removido somente após a nova arquitetura estar validada.

---

# Arquitetura esperada

## Serviço principal

O arquivo `trilink-agent-service.exe` será o núcleo operacional do agente.

Deverá executar como serviço do Windows e ser responsável por:

```text
Identity
Enrollment
Authentication
Heartbeat
Desired State
Jobs
Component Manager
RustDesk
Rathole
Backup Firebird
Upload
Telemetry
Secure Storage
Self Update
Diagnostics
```

O serviço deverá:

* iniciar automaticamente com o Windows;
* funcionar sem usuário logado;
* executar em segundo plano;
* manter o heartbeat;
* reconciliar o desired state;
* gerenciar os componentes;
* proteger credenciais;
* validar todas as solicitações recebidas da interface;
* expor apenas operações locais permitidas.

## Interface gráfica Wails

O arquivo `trilink-agent-ui.exe` será responsável somente pela experiência do usuário.

Deverá executar na sessão do usuário e ser responsável por:

* exibir o estado geral do agente;
* exibir o estado dos componentes;
* exibir informações de suporte;
* solicitar diagnósticos;
* solicitar atualização de status;
* solicitar reinício de componentes permitidos;
* abrir ou esconder a janela;
* funcionar na bandeja do Windows;
* apresentar mensagens de erro amigáveis;
* mostrar a versão do agente e da interface.

A interface não deverá conter regras de negócio operacionais.

## Atualizador

O arquivo `trilink-agent-updater.exe` deverá ser responsável por:

* atualizar o serviço;
* atualizar a interface;
* validar os artefatos;
* validar hash;
* validar versão;
* interromper e reiniciar somente o processo necessário;
* manter possibilidade de rollback;
* registrar o resultado da atualização.

A atualização da interface não deverá interromper o serviço principal.

---

# Comunicação entre interface e serviço

Implementar comunicação local por IPC.

No Windows, utilizar preferencialmente:

```text
Named Pipe
```

Exemplo:

```text
\\.\pipe\TrilinkAgent\v1
```

A comunicação não deverá utilizar uma porta TCP pública.

Caso seja utilizada uma porta local por necessidade técnica, ela deverá:

* escutar exclusivamente em `127.0.0.1`;
* utilizar autenticação;
* rejeitar origens externas;
* não expor segredos;
* possuir protocolo versionado.

A preferência continua sendo Named Pipe.

---

# Contrato de comunicação

Criar contratos tipados e versionados entre interface e serviço.

Estrutura sugerida:

```text
internal/contracts
├── agent_status.go
├── capability_status.go
├── diagnostics.go
├── commands.go
├── errors.go
└── ipc_version.go
```

Exemplo conceitual:

```go
type AgentUIAPI interface {
	GetAgentStatus(ctx context.Context) (AgentStatus, error)
	GetCapabilities(ctx context.Context) ([]CapabilityStatus, error)
	GetRecentEvents(ctx context.Context) ([]AgentEvent, error)
	RequestDiagnostics(ctx context.Context) (DiagnosticResult, error)
	RequestComponentRestart(ctx context.Context, capability string) error
	RequestStatusRefresh(ctx context.Context) error
	GetVersionInfo(ctx context.Context) (VersionInfo, error)
}
```

A interface não deverá importar diretamente implementações internas do serviço.

Ela deverá conhecer apenas os contratos públicos de IPC.

---

# Operações permitidas

A interface poderá solicitar operações tipadas como:

```text
GET_AGENT_STATUS
GET_CAPABILITIES
GET_VERSION_INFO
GET_RECENT_EVENTS
REFRESH_STATUS
RUN_DIAGNOSTICS
RESTART_RUSTDESK
RESTART_RATHOLE
RETRY_LAST_BACKUP
CHECK_FOR_UPDATES
REQUEST_REMOTE_SUPPORT
```

Cada operação deverá possuir:

* tipo conhecido;
* payload validado;
* timeout;
* tratamento de erro;
* log de auditoria;
* controle de concorrência;
* resposta padronizada.

---

# Operações proibidas

Não implementar operações genéricas como:

```text
RUN_COMMAND
EXECUTE_COMMAND
RUN_SHELL
RUN_SCRIPT
RUN_POWERSHELL
RUN_CMD
EXECUTE_FILE
OPEN_PROCESS
```

Não aceitar parâmetros livres que possam ser usados para montar comandos do sistema.

A interface jamais deverá enviar:

```json
{
  "command": "powershell.exe",
  "args": "qualquer conteúdo"
}
```

Toda ação deverá ser convertida em uma operação conhecida e tratada por um executor específico no serviço.

---

# Segurança do IPC

A comunicação local deverá implementar controles de segurança.

## Permissões

A Named Pipe deverá aceitar somente:

* usuário autenticado localmente;
* grupo autorizado;
* interface oficial do Trilink Agent;
* administradores, quando necessário.

Não deixar a Named Pipe acessível de forma irrestrita a qualquer processo local.

## Versionamento

O protocolo deverá possuir versão:

```text
ipc_version: 1
```

A interface deverá detectar incompatibilidade entre sua versão e a versão do serviço.

Exemplo:

```text
Interface incompatível com a versão atual do serviço.
Atualize o Trilink Agent.
```

## Validação

O serviço deverá validar:

* nome da operação;
* versão do protocolo;
* estrutura do payload;
* tamanho máximo;
* timeout;
* identidade do solicitante, quando possível;
* permissão necessária;
* capacidade solicitada.

## Proteção contra abuso

Implementar:

* limite de tamanho das mensagens;
* limite de solicitações;
* timeout;
* rejeição de payload inválido;
* rejeição de operações desconhecidas;
* logs sem dados sensíveis;
* proteção contra múltiplas operações simultâneas conflitantes.

---

# Estrutura de diretórios sugerida

Organizar o projeto aproximadamente desta forma:

```text
apps/
├── agent-service/
│   ├── cmd/
│   │   └── service/
│   │       └── main.go
│   └── internal/
│       ├── core/
│       ├── capabilities/
│       ├── ipc/
│       ├── security/
│       ├── storage/
│       └── platform/
│
├── agent-ui/
│   ├── main.go
│   ├── app.go
│   ├── internal/
│   │   ├── ipcclient/
│   │   ├── viewmodel/
│   │   ├── tray/
│   │   └── presentation/
│   └── frontend/
│       ├── src/
│       ├── components/
│       ├── features/
│       ├── hooks/
│       ├── pages/
│       └── services/
│
├── agent-updater/
│   ├── cmd/
│   └── internal/
│
└── shared/
    ├── contracts/
    ├── version/
    └── errors/
```

Adaptar essa estrutura ao monorepo ou organização atual do projeto, evitando mudanças desnecessárias de nomes.

---

# Responsabilidades do Wails

O backend Go da aplicação Wails deverá ser apenas um adaptador entre o frontend e o cliente IPC.

Exemplo:

```text
React
  ↓
Wails Bindings
  ↓
UI Application Service
  ↓
IPC Client
  ↓
Trilink Agent Service
```

A interface Wails não deverá chamar diretamente:

```text
RustDesk Manager
Rathole Manager
Backup Service
Heartbeat Service
Desired State
Credential Store
Agent Repository
Windows Service Manager
```

Ela deverá chamar somente o cliente IPC.

Exemplo:

```go
type App struct {
	agentClient AgentClient
}

func (a *App) GetStatus(ctx context.Context) (AgentStatus, error) {
	return a.agentClient.GetStatus(ctx)
}
```

---

# Funcionalidades esperadas na interface

## Tela principal

Exibir:

```text
Estado geral do agente
Conexão com o backend
Último heartbeat
Versão do serviço
Versão da interface
Nome da máquina
Empresa ou organização vinculada
```

## Acesso remoto

Exibir:

```text
Provider: RustDesk
Estado: ativo, degradado ou indisponível
ID do RustDesk
Versão instalada
Estado do serviço
Última verificação
```

Não exibir a senha permanente do RustDesk.

## Túnel

Exibir:

```text
Provider: Rathole
Estado
Versão
Última conexão
Último erro sanitizado
```

## Backup

Exibir:

```text
Estado da política
Última execução
Último backup concluído
Próxima execução
Tamanho do último backup
Último erro sanitizado
```

## Diagnóstico

Permitir:

```text
Executar diagnóstico
Copiar resumo
Exportar pacote sanitizado
Atualizar status
```

O diagnóstico deverá ser produzido pelo serviço.

A interface somente solicita, acompanha e apresenta o resultado.

---

# Bandeja do Windows

Manter ou implementar o funcionamento pela bandeja do Windows.

O comportamento esperado é:

```text
Abrir janela
Mostrar status
Solicitar suporte
Executar diagnóstico
Ver versão
Sair da interface
```

A opção `Sair da interface` deverá fechar somente o Wails.

Ela não deverá:

* parar o serviço;
* desinstalar o agente;
* parar o RustDesk;
* parar o Rathole;
* cancelar backups;
* apagar configurações.

Ao fechar a janela principal, preferencialmente minimizar para a bandeja.

---

# Inicialização

## Serviço

O serviço deverá:

```text
Iniciar automaticamente com o Windows
Executar sem usuário logado
Continuar funcionando após logoff
Continuar funcionando quando a interface fechar
```

## Interface

A interface deverá:

```text
Iniciar no login do usuário, quando habilitada
Executar na sessão interativa
Poder ser fechada sem afetar o serviço
Poder não ser instalada em servidores headless
```

A interface deverá ser considerada opcional.

O serviço não poderá depender da existência do executável da interface.

---

# Tratamento do WebView2

O instalador deverá verificar a existência do Microsoft Edge WebView2 Runtime.

O fluxo esperado é:

```text
1. Verificar WebView2 Runtime
2. Se estiver instalado, continuar
3. Se estiver ausente, instalar o runtime homologado
4. Instalar a interface Wails
5. Registrar a inicialização da interface
```

O serviço principal não deverá depender do WebView2.

Caso o WebView2 esteja ausente ou corrompido:

* o serviço continuará funcionando;
* somente a interface ficará indisponível;
* o erro deverá ser registrado;
* o instalador ou reparador poderá corrigir o runtime.

---

# Armazenamento local

Utilizar separação entre executáveis e dados.

```text
C:\Program Files\Trilink\Agent\
├── trilink-agent-service.exe
├── trilink-agent-ui.exe
└── trilink-agent-updater.exe
```

```text
C:\ProgramData\Trilink\Agent\
├── state\
├── logs\
├── cache\
├── updates\
├── diagnostics\
└── ipc\
```

A interface não deverá gravar diretamente no estado principal do serviço.

Preferências visuais da interface poderão ser armazenadas separadamente, por usuário, por exemplo:

```text
%LOCALAPPDATA%\Trilink\AgentUI\
```

Exemplos de preferências permitidas:

* abrir no login;
* iniciar minimizado;
* tamanho da janela;
* última página aberta;
* tema visual.

Não armazenar nesse diretório:

* token do agente;
* senha do RustDesk;
* credencial de upload;
* segredo do backend;
* conexão do banco;
* credenciais do Firebird.

---

# Logs

Separar logs do serviço e da interface.

Exemplo:

```text
logs/
├── service.log
├── updater.log
└── ui.log
```

A interface deverá registrar somente:

* inicialização;
* conexão com IPC;
* falhas de renderização;
* erros de comunicação;
* ações solicitadas;
* erros sanitizados.

Não registrar:

* tokens;
* senhas;
* cabeçalhos de autorização;
* payloads sensíveis;
* configuração completa;
* conteúdo de arquivos internos.

---

# Tratamento de indisponibilidade

## Serviço indisponível

Quando o serviço estiver parado ou inacessível, a interface deverá mostrar:

```text
O serviço do Trilink Agent não está disponível.
```

Ela poderá oferecer uma ação permitida:

```text
Tentar novamente
```

Caso o usuário possua permissão administrativa, poderá existir:

```text
Solicitar inicialização do serviço
```

Essa ação deverá passar por mecanismo seguro e específico.

Não utilizar comando genérico.

## Interface indisponível

Quando a interface falhar:

* o serviço continuará funcionando;
* o heartbeat continuará;
* os backups continuarão;
* o RustDesk continuará;
* o Rathole continuará;
* a atualização continuará.

---

# Compatibilidade com a implementação atual

Antes de alterar o código, realizar um inventário completo.

Localizar:

```text
Inicialização do Wails
Inicialização do serviço Windows
Gerenciamento de tray
Bindings expostos ao frontend
Acesso ao RustDesk
Acesso ao Rathole
Acesso ao backup
Acesso ao armazenamento
Uso de tokens
Uso de arquivos de configuração
Atualização
Encerramento da aplicação
```

Para cada ponto, registrar:

```text
Arquivo
Função
Responsabilidade atual
Dependências
Destino na nova arquitetura
Manter, migrar ou remover
```

Não remover código antes de identificar seus consumidores.

---

# Estratégia de migração

## Fase 1 — Inventário

Mapear completamente:

* processo atual de inicialização;
* relação entre Wails e serviço;
* bindings utilizados;
* funcionalidades acessadas diretamente;
* estado local;
* atualização;
* instalador;
* comportamento da bandeja;
* dependências do WebView2.

Não alterar comportamento nesta fase.

## Fase 2 — Testes de caracterização

Criar testes para o comportamento atual.

Cobrir:

* abertura da interface;
* fechamento da interface;
* tray;
* exibição do status;
* solicitação de diagnóstico;
* reinício de componente;
* serviço indisponível;
* versões incompatíveis;
* atualização.

## Fase 3 — Criar contratos

Criar:

```text
AgentStatus
CapabilityStatus
VersionInfo
DiagnosticRequest
DiagnosticResult
UICommand
UIError
```

Esses contratos deverão ser independentes da implementação interna.

## Fase 4 — Criar servidor IPC

Adicionar o servidor IPC ao serviço principal.

Inicialmente, expor operações somente de leitura:

```text
GET_AGENT_STATUS
GET_CAPABILITIES
GET_VERSION_INFO
```

## Fase 5 — Criar cliente IPC no Wails

Substituir acessos diretos da interface por chamadas ao cliente IPC.

A interface poderá manter temporariamente adaptadores legados enquanto a migração estiver em andamento.

## Fase 6 — Migrar operações

Migrar uma funcionalidade de cada vez:

```text
Status geral
RustDesk
Rathole
Backup
Diagnóstico
Atualização
Suporte
```

Após cada migração:

* executar testes;
* confirmar que não existem acessos diretos;
* validar logs;
* testar interface fechada;
* testar serviço isolado.

## Fase 7 — Separar executáveis

Gerar:

```text
trilink-agent-service.exe
trilink-agent-ui.exe
trilink-agent-updater.exe
```

Atualizar o instalador para tratar cada componente corretamente.

## Fase 8 — Remover legado

Somente após todos os bindings utilizarem IPC:

* remover acesso direto da UI aos módulos do serviço;
* remover inicialização do serviço dentro do Wails;
* remover dependências operacionais do Wails;
* remover estado duplicado;
* remover comandos genéricos;
* remover código de encerramento que para o agente;
* remover segredos acessíveis pela UI.

---

# Legado a remover

Identificar e remover progressivamente:

## Acoplamento de processo

* Wails iniciando o ciclo principal do agente;
* agente dependendo da janela aberta;
* fechamento da interface encerrando tarefas;
* tray controlando diretamente o serviço;
* serviço e UI compartilhando o mesmo contexto de execução.

## Acesso direto

* UI chamando gerenciador RustDesk;
* UI chamando gerenciador Rathole;
* UI executando backup;
* UI acessando repositório de estado;
* UI acessando credenciais;
* UI alterando arquivos internos;
* UI controlando atualização diretamente.

## Segurança

* token exposto ao frontend;
* segredo disponível em bindings Wails;
* senha presente em estado React;
* comando shell recebido pelo frontend;
* execução arbitrária;
* logs sensíveis;
* IPC sem autenticação ou sem controle de acesso.

## Estado duplicado

* estado operacional mantido simultaneamente pela UI e serviço;
* configurações divergentes;
* cache da interface tratado como fonte oficial;
* escrita direta no banco de estado.

---

# Tratamento de atualização

A atualização deverá ser independente por componente.

Exemplo de manifesto:

```json
{
  "components": {
    "service": {
      "version": "2.0.0",
      "url": "https://artifacts.trilinksoftware.com.br/agent/service/2.0.0",
      "sha256": "..."
    },
    "ui": {
      "version": "2.0.0",
      "url": "https://artifacts.trilinksoftware.com.br/agent/ui/2.0.0",
      "sha256": "..."
    },
    "updater": {
      "version": "1.2.0",
      "url": "https://artifacts.trilinksoftware.com.br/agent/updater/1.2.0",
      "sha256": "..."
    }
  }
}
```

Permitir atualizar somente a interface quando não houver alteração de contrato IPC.

Quando houver incompatibilidade:

```text
Atualizar serviço
Atualizar interface
Validar IPC
Reiniciar somente os processos necessários
```

---

# Testes obrigatórios

## Serviço sem interface

Validar:

* inicialização do Windows;
* heartbeat;
* desired state;
* RustDesk;
* Rathole;
* backup;
* atualização;
* diagnóstico;
* funcionamento sem WebView2;
* funcionamento sem usuário logado.

## Interface

Validar:

* abertura;
* fechamento;
* minimização;
* bandeja;
* reconexão ao IPC;
* serviço indisponível;
* interface desatualizada;
* serviço desatualizado;
* carregamento dos estados;
* tratamento de erros.

## IPC

Validar:

* operação válida;
* operação desconhecida;
* payload inválido;
* payload acima do limite;
* timeout;
* acesso não autorizado;
* desconexão inesperada;
* versão incompatível;
* múltiplas solicitações;
* reinício do serviço;
* reinício da interface.

## Segurança

Validar:

* interface sem acesso a tokens;
* interface sem acesso à senha do RustDesk;
* ausência de segredos no frontend;
* ausência de segredos em logs;
* rejeição de comandos arbitrários;
* Named Pipe com permissão restrita;
* sanitização de erros.

## Atualização

Validar:

* atualização somente da interface;
* atualização somente do serviço;
* atualização conjunta;
* hash inválido;
* artefato corrompido;
* falha durante instalação;
* rollback;
* interface incompatível;
* serviço incompatível.

---

# Critérios de aceite

A refatoração será considerada concluída quando:

1. O Wails continuar sendo utilizado na interface.
2. O serviço funcionar sem a interface instalada.
3. Fechar a interface não interromper o serviço.
4. A interface e o serviço forem executáveis separados.
5. A interface se comunicar com o serviço somente por IPC.
6. O IPC possuir contratos tipados e versionados.
7. A UI não acessar diretamente módulos operacionais.
8. A UI não acessar credenciais.
9. A UI não executar comandos arbitrários.
10. Atualizar a UI não reiniciar o serviço.
11. O serviço não depender do WebView2.
12. O agente funcionar sem usuário logado.
13. A interface funcionar pela bandeja.
14. A opção de sair fechar somente a interface.
15. O instalador validar o WebView2.
16. Logs estiverem separados e sanitizados.
17. Existirem testes de integração do IPC.
18. O código legado estiver removido após validação.
19. A funcionalidade atual estiver preservada.
20. A documentação técnica estiver atualizada.

---

# Ordem recomendada de implementação

Executar nesta ordem:

```text
1. Mapear a arquitetura atual
2. Criar testes de caracterização
3. Definir contratos compartilhados
4. Criar servidor IPC no serviço
5. Criar cliente IPC no Wails
6. Migrar consultas de status
7. Migrar status do RustDesk
8. Migrar status do Rathole
9. Migrar status de backup
10. Migrar diagnósticos
11. Migrar ações administrativas permitidas
12. Separar os executáveis
13. Ajustar a bandeja
14. Ajustar o instalador
15. Separar atualizações
16. Testar sem interface
17. Testar sem usuário logado
18. Implantar em ambiente controlado
19. Implantar em máquinas canário
20. Remover o código legado
```

---

# Estratégia de commits

Separar a implementação em commits pequenos e reversíveis.

Exemplo:

```text
test(ui): add characterization tests for current wails integration

feat(contracts): add versioned agent ui ipc contracts

feat(service): add local named pipe ipc server

feat(ui): add typed ipc client for wails

refactor(ui): read agent status through ipc

refactor(ui): move rustdesk actions to agent service

refactor(ui): move tunnel actions to agent service

refactor(ui): move backup actions to agent service

feat(ui): add tray lifecycle independent from service

feat(updater): support independent service and ui updates

refactor(installer): install service and wails ui separately

test(ipc): add security and compatibility coverage

chore(legacy): remove direct ui access to service internals

chore(legacy): remove combined process bootstrap
```

Cada commit deverá:

* compilar;
* manter os testes passando;
* ser revisável;
* ser reversível;
* evitar mudanças não relacionadas.

---

# Entregáveis esperados

Ao concluir o trabalho, apresentar:

1. diagrama da arquitetura anterior;
2. diagrama da nova arquitetura;
3. inventário do acoplamento encontrado;
4. lista de arquivos modificados;
5. lista de arquivos criados;
6. lista de arquivos removidos;
7. contratos IPC implementados;
8. controles de segurança adotados;
9. ajustes realizados no instalador;
10. estratégia de atualização;
11. estratégia de rollback;
12. testes adicionados;
13. código legado removido;
14. riscos ainda existentes;
15. instruções de implantação canário;
16. instruções de diagnóstico em produção.

---

# Instrução final ao agente de programação

Antes de modificar o código:

1. analise a implementação atual do Wails;
2. identifique todas as dependências entre interface e serviço;
3. identifique os bindings expostos ao frontend;
4. identifique qualquer acesso a credenciais;
5. identifique qualquer execução direta de processos;
6. identifique o comportamento atual da bandeja;
7. identifique como o serviço é inicializado e encerrado;
8. apresente um plano por arquivos e etapas;
9. crie testes de caracterização;
10. somente então inicie a refatoração.

Não realizar uma reescrita completa sem necessidade.

Preservar o frontend atual sempre que ele estiver adequado.

A prioridade é separar responsabilidades, melhorar a segurança e permitir que o serviço funcione de maneira completamente independente, mantendo o Wails como interface oficial do Trilink Agent.
