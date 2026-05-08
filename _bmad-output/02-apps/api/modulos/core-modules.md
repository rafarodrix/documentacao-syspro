# API — Módulos Core de Negócio

> Módulos de domínio principal do `apps/api`. Atualizado em: 2026-05-05

---

## companies

**Path:** `src/modules/companies/`

Gerencia empresas do portal (clientes Trilink).

| Arquivo                  | Responsabilidade                                       |
|--------------------------|-------------------------------------------------------|
| `companies.router.ts`    | Procedures tRPC de empresas                           |
| `companies.service.ts`   | Lógica: criação, atualização, status, segmentação     |
| `companies.module.ts`    | Módulo NestJS com `forwardRef(TrpcModule)`            |

**Funcionalidades:**
- CRUD completo de empresas com dados fiscais (CNPJ, razão social, IE)
- Segmentação de empresas (tipo de negócio)
- Hierarquia matriz/filial
- Status da empresa: ACTIVE, INACTIVE, SUSPENDED
- Busca por CNPJ com consulta a API externa
- Integração com contratos de serviço
- Configuração de parâmetros SEFAZ por empresa
- Controle de acesso com escopo (usuário CLIENTE vê apenas sua empresa)

---

## contacts

**Path:** `src/modules/contacts/`

Gerencia contatos vinculados a empresas.

**Funcionalidades:**
- Contatos com CPF, email, telefone, cargo
- `source`: MANUAL | WHATSAPP | IMPORT
- Sincronização de contatos com Evolution (WhatsApp)
- Controle de acesso por empresa via `user-contact-access.service.ts`
- Stats de contatos por empresa

---

## users

**Path:** `src/modules/users/`

Gerencia usuários do portal. **Totalmente migrado para tRPC** — sem controller REST.

| Arquivo                          | Responsabilidade                                  |
|----------------------------------|--------------------------------------------------|
| `users.router.ts`                | Procedures tRPC (lista, busca, CRUD, perfil, SSO) |
| `users.service.ts`               | Lógica de negócio: CRUD, perfis, Chatwoot sync    |
| `user-contact-access.service.ts` | Sincronização de memberships a partir do contato  |
| `users.module.ts`                | Módulo NestJS com `forwardRef(TrpcModule)`        |

**Procedures tRPC expostas (`trpc.users.*`):**

| Procedure              | Tipo     | Descrição                                        |
|------------------------|----------|--------------------------------------------------|
| `list`                 | query    | Lista usuários com filtros `search` e `role`     |
| `getOne`               | query    | Busca usuário por ID                             |
| `checkEmail`           | query    | Verifica disponibilidade de e-mail               |
| `getCurrentProfile`    | query    | Retorna perfil + empresas do usuário logado      |
| `getChatwootSsoLink`   | query    | Gera link SSO para acesso unificado ao Chatwoot  |
| `create`               | mutation | Cria usuário e sincroniza com auth provider      |
| `update`               | mutation | Atualiza dados ou status do usuário              |
| `updateCurrentProfile` | mutation | Atualiza perfil e dados de empresa do usuário    |
| `remove`               | mutation | Soft-delete (isActive=false, deletedAt)          |

**Funcionalidades:**
- CRUD completo com validação de e-mail e controle de role
- Sincronização automática de memberships via contato vinculado
- Perfil do usuário com dados de empresa editáveis
- SSO com Chatwoot com provisionamento automático de agente
- Controle de acesso por escopo: admin global vs. gestor de unidade

---

## auth

**Path:** `src/modules/auth/`

Autenticação via Better Auth.

- Endpoints montados em `/api/auth/[...all]` (Better Auth handler)
- Login, registro, esqueceu senha, reset
- Session management com cookie HttpOnly
- Verificação de email

---

## authorization

**Path:** `src/modules/authorization/`

Resolução de escopo e permissões.

| Arquivo                        | Responsabilidade                          |
|--------------------------------|------------------------------------------|
| `authorization.service.ts`     | Resolve role, escopo e permissões        |
| `authorization.module.ts`      | Módulo global                            |

**Escopo resolvido:**
```typescript
{
  userId: string
  role: 'ADMIN' | 'SUPORTE' | 'CLIENTE_ADMIN' | 'CLIENTE_USER' | 'DEVELOPER'
  companyIds: string[]  // [] = acesso global
  permissions: string[] // ex: ['companies:view_all', 'remote:manage']
}
```

---

## tickets

**Path:** `src/modules/tickets/`

Sistema de chamados técnicos internos.

| Arquivo                        | Responsabilidade                          |
|--------------------------------|------------------------------------------|
| `tickets.service.ts`           | CRUD, workflow, busca full-text          |
| `ticket-history.service.ts`    | Histórico de alterações                  |
| `ticket-contract.mapper.ts`    | Mapeia modelo Prisma → contrato público  |
| `create-ticket.dto.ts`         | DTO de criação com validação Zod         |
| `update-ticket.dto.ts`         | DTO de atualização                       |

**Funcionalidades:**
- Criação de tickets com categoria, prioridade, empresa vinculada
- Workflow de estados (ver `@dosc-syspro/core/tickets`)
- Mensagens com suporte a Markdown
- Histórico de alterações
- Busca por texto
- Integração com Chatwoot (mensagens sincronizadas)
- Quick actions (fechar, reabrir, escalar)

---

## crm

**Path:** `src/modules/crm/`

CRM de leads e oportunidades.

**Modelos:**
- `CrmLead`: stages LEAD → MQL → SQL → PROPOSAL → WON | LOST
- `CrmActivity`: NOTE, CALL, MEETING, EMAIL, WHATSAPP
- `CrmTask`: tarefas com status e vencimento

---

## dashboard

**Path:** `src/modules/dashboard/`

Agrega métricas e KPIs para o painel inicial.

**Métricas expostas:**
- Total de empresas por status
- Tickets abertos por prioridade
- Volume de mensagens WhatsApp
- Status de serviços SEFAZ

---

## releases

**Path:** `src/modules/releases/`

Gerencia releases e changelogs do produto Syspro.

- Releases organizadas por ano/mês
- Vinculação de tickets a uma release
- `buildReleaseFromTicket` (via `@dosc-syspro/core`)
- Endpoint público de listagem

---

## settings

**Path:** `src/modules/settings/`

Configurações globais e por empresa.

| Arquivo                              | Responsabilidade                          |
|--------------------------------------|------------------------------------------|
| `settings.controller.ts`            | REST endpoints de configurações          |
| `permissions/permissions.service.ts` | CRUD de perfis e permissões              |
| `permissions/permissions.catalog.ts` | Catálogo de todas as permissões          |
| `integration-connections.service.ts` | Conexões com integrações externas        |
| `integration-context.service.ts`     | Contexto de integração por empresa       |
| `sefaz-monitor.service.ts`           | Monitor periódico de status SEFAZ        |

**Configurações disponíveis:**
- Permissões e perfis de acesso
- Configuração Chatwoot por empresa
- Configuração Evolution (WhatsApp)
- Configurações SEFAZ (rotas, UF)
- Configurações do módulo remoto
- Automações de atendimento
- Configurações de tickets

---

## tax

**Path:** `src/modules/tax/`

Configurações tributárias para NFe/NFCe.

**Funcionalidades:**
- Lookup de NCM (Nomenclatura Comum do Mercosul)
- Sincronização de CST, CFOP, ICMS, ICMS-ST
- TaxSyncJob: jobs de sincronização em background
- Sugestão de tributação por NCM
- ICMS interestadual (DIFAL)

---

## documentos

**Path:** `src/modules/documentos/`

Armazenamento de documentos de empresas.

- Upload de arquivos para Cloudflare R2
- Metadata persistida no PostgreSQL
- Download com URL assinada ou URL pública

---

## agents

**Path:** `src/modules/agents/`

Gerencia o inventário de agentes/dispositivos registrados.

- Lista de dispositivos com status de conexão
- Vinculação de agente a empresa
- Dados de hardware (via sync do agente Go)
