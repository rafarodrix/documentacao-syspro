# Trilink Agent Frontend (Wails + React)

Este diretório contém a interface gráfica oficial do Trilink Agent, desenvolvida utilizando [Wails](https://wails.io/), React e TypeScript.

A interface deverá servir apenas como a camada de experiência do usuário, não possuindo regras de negócio operacionais, que são delegadas ao serviço principal do agente.

## Nova Arquitetura e Refatoração

A arquitetura do Trilink Agent está passando por uma refatoração para separar as responsabilidades da interface gráfica das responsabilidades do serviço (backend).

Consulte o documento completo de arquitetura e refatoração em:
👉 [ARCHITECTURE_REFACTOR.md](../ARCHITECTURE_REFACTOR.md)

### Princípios para o Frontend

Ao desenvolver ou ajustar funcionalidades no frontend do agente, os seguintes princípios **obrigatórios** devem ser seguidos:

1. **Apenas Camada de Interface**: O frontend Wails será somente a camada de interface gráfica.
2. **Sem Execução de Rotinas**: A interface não deverá executar as rotinas principais do agente.
3. **Sem Credenciais Sensíveis**: A interface não deverá armazenar credenciais sensíveis (ex: senhas do RustDesk, tokens, credenciais do banco).
4. **Comunicação Segura**: A comunicação entre a interface (frontend) e o serviço principal será feita unicamente via **IPC** (local, autenticada e tipada), intermediada pelos bindings do Wails.
5. **Sem Comandos Arbitrários**: Não poderá existir execução arbitrária de comandos ou scripts (ex: chamadas diretas ao `powershell.exe`) iniciadas pela interface.
6. **Desacoplamento do Serviço**: A interface deverá estar preparada para lidar com o cenário em que o serviço principal está offline, apresentando mensagens de erro amigáveis ou estado de "desconectado".
7. **Opções de Preferência (UI)**: O armazenamento local da interface (ex: `%LOCALAPPDATA%\Trilink\AgentUI\`) servirá apenas para preferências de interface, como inicialização minimizada, tamanho da janela, tema, etc.

## Estrutura Atual e Bindings

Atualmente, o frontend pode possuir acoplamentos legados. Como parte da refatoração descrita no documento `ARCHITECTURE_REFACTOR.md`, as invocações diretas aos módulos do serviço devem ser progressivamente substituídas por chamadas IPC via contratos tipados.

Consulte a documentação principal para guiar a migração.
