# Arquitetura de Informação: Portal de Infraestrutura (Host Details)

Este documento descreve o modelo mental e a arquitetura de informação aplicados à tela de **Detalhes do Dispositivo** (`Host Details`) dentro do Portal de Infraestrutura. 

Qualquer futura refatoração ou adição de abas e componentes deve aderir a estes princípios.

## 1. Princípio Central

> **"O Dispositivo é a entidade principal."**

O portal projeta a visão de gerenciamento de **infraestrutura**. Isso significa que a entidade central é a máquina do cliente (o hardware/SO). O Agente, o RustDesk, o Firebird, o IIS, o sistema de Backup e o Monitoramento não são as entidades principais — eles são **capacidades ou componentes** instalados neste dispositivo.

Não devemos misturar informações da infraestrutura geral da empresa com informações técnicas locais em painéis não relacionados.

## 2. Mapa de Navegação (Host Details)

Para eliminar duplicações, evitar estados contraditórios e organizar as informações de forma limpa, a navegação secundária da tela de Detalhes do Dispositivo é composta **exclusivamente** pelas seguintes abas:

```text
Visão geral | Diagnóstico | Serviços | Backup | Eventos | Configurações
```

### 2.1. Visão Geral
- **Objetivo:** O resumo executivo do estado do host.
- **O que deve conter:** Informações macro de identificação (IP, Hostname), cards de saúde (ERP, Conectividade do Agente), e um resumo das principais instalações e métricas (uso atual de CPU/RAM em mini-gráficos, se houver).
- **O que NÃO deve conter:** Formulários de edição (que vão para Configurações) ou listas exaustivas (que vão para Diagnóstico).

### 2.2. Diagnóstico
- **Objetivo:** O inventário passivo e o estado técnico consolidado do dispositivo.
- **O que deve conter:** Sub-abas para fatiar o inventário (Sistema, Rede, Armazenamento, Serviços Monitorados, Softwares Instalados, Instalações Syspro). Todos os dados devem ser consumidos passivamente da estrutura `agentTelemetry`, sendo o front-end um reflexo fiel (um "snapshot") das informações enviadas pelo Agente.
- **O que NÃO deve conter:** Ações destrutivas, botões de ligar/desligar (vão para a aba Serviços).

### 2.3. Serviços (antiga "Componentes")
- **Objetivo:** Ações operacionais ativas sobre os serviços rodando na máquina.
- **O que deve conter:** Inicialização e parada de serviços Windows, restart de pools IIS, terminal remoto e painéis interativos. Tudo que invoca Comandos no Agente (`RemoteAgentCommandType`).

### 2.4. Backup
- **Objetivo:** Visão consolidada da saúde do banco de dados (geralmente Firebird) e políticas de cópia de segurança.
- **O que deve conter:** Agendamentos, últimas execuções, tamanho dos arquivos de backup e logs da rotina de backup.

### 2.5. Eventos
- **Objetivo:** Log de auditoria e linha do tempo de tudo que ocorreu no dispositivo.
- **O que deve conter:** Histórico de sessões (acessos via RustDesk), histórico de comandos enviados pelo portal (Start/Stop, Update), e alertas emitidos pelo agente.

### 2.6. Configurações
- **Objetivo:** O único local destinado a alterar o *desired state* ou o cadastro do dispositivo.
- **O que deve conter:** Alteração do Nome (apelido), mudança de vínculo com Empresa, aplicação de perfis (Workstation, Server), remoção (Excluir Host) e associação de licenças/paths Syspro.

## 3. Diretrizes de Consumo de Telemetria (Frontend x Backend)

O backend do Syspro consolida as métricas do Agente no nó `agentTelemetry` do tipo `RemoteHostDetails`.

- **Mapeamento 1:1:** O front-end não deve inventar dados. O design dos cards (`diagnostics-*`) deve refletir as _structs_ brutas (ex: `[]NetworkAdapter`, `DiskVolume`) coletadas em Go.
- **Tratamento de Dados Desatualizados:** Todos os nós de telemetria possuem uma data associada (ex: `networkSnapshotAt`). A UI sempre deve assumir que os dados são retratos no tempo e não informações em tempo real contínuo (a menos que a aba explicitamente lide com streaming).
- **Sem Cálculos Pesados na UI:** Cálculos complexos (como conversão de discos de string com letras, ou processamento de flags de rede) já foram movidos para o back-end (no mapeamento gRPC) ou para o próprio Agente. O front-end React deve focar primariamente na **apresentação limpa** e **formatação** (MB para GB, renderização de barras de progresso de uso, etc).
