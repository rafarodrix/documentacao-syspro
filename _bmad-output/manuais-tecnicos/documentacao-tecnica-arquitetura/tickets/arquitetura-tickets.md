# Arquitetura do Módulo de Tickets

O módulo de Tickets gerencia todo o atendimento, solicitações e tratativas técnicas dos clientes do portal Syspro, integrando-se nativamente com a infraestrutura do NestJS no backend, contratos monorepo e UI moderna no Next.js.

## Visão Geral

A arquitetura de tickets é desenhada para suportar multi-tenancy e scope access. Existem usuários corporativos (clientes com acesso restrito) e usuários do sistema (administradores), ambos interagindo no mesmo pool de `Conversations` (Conversas), porém isolados por regras geridas no backend através de Tokens e Scopes de Empresa.

### 1. Backend (NestJS)

- **Local:** `apps/api/src/modules/tickets`
- **Controller (`tickets.controller.ts`)**: Expõe as APIs REST (`/tickets`) validando os payloads através dos `zod` schemas compartilhados na lib de contatos `@dosc-syspro/contracts/ticket`.
- **Service (`tickets.service.ts`)**: Contém a lógica de negócio principal:
  - Resolução de `Access Scope` (empresa global vs restrito a certas empresas do cliente).
  - Criação de número do ticket gerado automaticamente (`generateTicketNumber`).
  - Associação inicial a membros de time baseada nas métricas do Módulo (Suporte vs Desenvolvimento).

#### Relacionamentos Prisma
O módulo de Tickets se apoia na tabela `Conversation` que armazena os chamados. Esta se liga com:
- `User`: Usuário de sistema responsável (`assignedUser`, `resolvedUser`).
- `CompanyContact`: O contato externo que originou a requisição ou está associado.
- `Company`: Filiation empresarial (Obrigatória se requisição originou internamente por empresa cliente).
- `ConversationMessage`: Fio da ocorrência. Cada interação cria uma destas.

### 2. Contratos (Zod Shared Library)

- **Local:** `packages/contracts/src/ticket/`
A segurança de dados se estende pelas APIs, definindo Request e Response payloads rígidos para garantir integridade.
Exemplos essenciais:
- `ticketModuleSettingsSchema`: Define atributos de SLAs globais, categorias e departamentos operacionais salvos como objeto JSON opaco no provedor.
- `ticketModuleListQuerySchema`: Define como as paginações por filtros, `status` (open, closed, pending) e times são filtrados e passados com precisão.

### 3. Frontend (Next.js - Plataforma Web)

- **Local:** `apps/web/src/features/tickets/`
A UI do Portal opera estritamente através dos React Hooks consumindo as Actions.
A arquitetura de Interface usa componentes separados em `features/tickets/interface/components` como o `TicketDialog.tsx` (criação e edição robusta) e `TicketsTable.tsx`.

#### Regras de Acesso Frontend
- O usuário do sistema conta com a tag `isSystemAdmin` repassada nas queries, que permite a este pesquisar qualquer ticket do fluxo global e associá-los de volta às corporações via UI Dropdown.
- A configuração (aba Settings) reflete o uso ativo global para o módulo de Tickets, centralizando parâmetros como: Categorias, Fluxos, e Auto-Atribuir quando um chamado é criado sob a mesa do Suporte.

## Considerações de Integrações
Para as mensagens vindas originadas de bots externos (Chatwoot, Whatsapps) - o banco persiste um `chatwootConversationId`, atrelando o modelo base de Tickets da Syspro ao ecossistema multi-canal assíncrono.
