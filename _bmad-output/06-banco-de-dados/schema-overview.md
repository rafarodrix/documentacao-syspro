# Banco de Dados — Schema Overview

> PostgreSQL via Prisma ORM. Schema em `packages/database/prisma/schema.prisma`.
> Atualizado em: 2026-05-05

---

## Agrupamento por domínio

### Empresas e Contratos

```
Company
 ├── CompanyContactCompanyLink[] (vínculos de contatos com ordem/prioridade)
 ├── Membership[]           (usuários vinculados)
 ├── UserContactLink[]      (espelho do contato principal do usuário por empresa)
 ├── Contract[]             (contratos de serviço)
 ├── RemoteHost[]           (hosts remotos)
 ├── Conversation[]         (conversas/atendimentos)
 ├── CrmLead[]              (leads CRM)
 └── AgentDevice[]          (dispositivos/agentes vinculados)
```

**Company — campos principais:**
- `cnpj`, `razaoSocial`, `nomeFantasia`, `inscricaoEstadual`
- `status`: ACTIVE | INACTIVE | SUSPENDED | PENDING_DOCS
- `segment`: tipo de negócio (enum)
- `regimeTributario`: Simples Nacional | Lucro Presumido | Lucro Real | MEI
- `parentCompanyId`: referência à empresa matriz (hierarquia)
- `installationDirectory`: caminho do Syspro Server
- `remoteConnections`: conexões remotas normalizadas em JSON

---

### Usuários e Acesso

```
User
 ├── Membership[]           (vínculos com empresas)
 ├── CompanyContact?        (contato associado)
 └── UserContactLink[]      (contato efetivo por empresa)

Membership
 ├── User
 ├── Company
 └── role: Role             (ADMIN|SUPORTE|CLIENTE_ADMIN|CLIENTE_USER|DEVELOPER)

CompanyContact
 ├── CompanyContactCompanyLink[] (M:N com empresas)
 ├── User[]                      (usuários ligados ao contato)
 └── UserContactLink[]           (espelho por empresa)

AccessProfile
 ├── AccessProfilePermission[]
 └── UserAccessProfile[]

Permission
 └── AccessProfilePermission[]
```

**Fluxo real de escopo entre módulos:**
1. `User.contactId` aponta para um `CompanyContact`
2. `CompanyContact.companyLinks` define as empresas válidas para esse contato
3. `UserContactAccessService` replica isso em `Membership` e `UserContactLink`
4. `AuthorizationService` resolve permissões globais e por empresa a partir desses vínculos

---

### Acesso Remoto

```
RemoteHost
 ├── Company
 ├── RemoteAgentCommand[]   (fila de comandos)
 ├── RemoteSession[]        (histórico de sessões)
 └── RemoteHostSysproUpdate[] (versões detectadas)

RemoteDiscoveredHost        (hosts ainda não vinculados)
 └── Company?

RemoteSession
 ├── RemoteHost
 ├── User                   (técnico)
 └── Ticket?                (ticket vinculado, opcional)

RemoteAddressBookCredential
 ├── User                   (criador)
 └── Company?               (escopo COMPANY, opcional)
```

**RemoteHost — campos principais:**
- `rustdeskId`: ID no RustDesk (sem espaços, único)
- `hostname`: nome Windows da máquina
- `agentToken`: token do agente (persistido com hash)
- `agentTokenExpiresAt`: expiração do token
- `lastHeartbeatAt`: último contato do agente
- `status`: ACTIVE | INACTIVE | MAINTENANCE

**RemoteAgentCommand — campos principais:**
- `type`: REAPPLY_ALIAS | REAPPLY_CONFIG | UPGRADE_CLIENT | ROTATE_TOKEN_REQUIRED
- `status`: PENDING | DELIVERED | ACKNOWLEDGED | CANCELLED | FAILED
- `result`: resultado após ACK do agente

---

### Mensageria, Atendimento e Tickets

> **Convenção importante:** O modelo `Conversation` é usado tanto para mensageria (WhatsApp, Email) quanto para tickets internos. A distinção é feita pelo campo `channel`:
> - `channel: PORTAL` → **ticket interno** (chamado técnico)
> - `channel: WHATSAPP | EMAIL | PHONE` → conversa de atendimento/mensageria

```
Conversation
 ├── Company
 ├── CompanyContact               (cliente que abriu o chamado)
 ├── ConversationMessage[]        (mensagens e respostas)
 ├── ConversationAssignment[]     (atribuições de responsável)
 └── ChatwootCsatRating?          (pesquisa de satisfação pós-fechamento)

ConversationMessage
 ├── Conversation
 ├── type: TEXT | IMAGE | DOCUMENT | AUDIO | VIDEO
 └── direction: INBOUND | OUTBOUND

TicketCategory                   (categorias configuráveis, independente)

ChatwootCsatRating
 └── Conversation
```

**Conversation — campos principais:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `channel` | enum | `WHATSAPP \| EMAIL \| PORTAL \| PHONE` |
| `status` | enum | Estado atual no workflow (ver abaixo) |
| `priority` | string | `LOW \| NORMAL \| HIGH \| CRITICAL` |
| `team` | string | Equipe responsável (`SUPORTE \| DESENVOLVIMENTO`) |
| `assignedUserId` | string? | Usuário responsável pelo ticket |
| `externalId` | string? | ID no Chatwoot (sincronização bidirecional) |
| `slaResponseDueAt` | DateTime? | Prazo de primeira resposta |
| `slaResolutionDueAt` | DateTime? | Prazo de resolução |
| `slaResponseHitAt` | DateTime? | Quando a primeira resposta ocorreu |
| `slaResolutionHitAt` | DateTime? | Quando o ticket foi resolvido |
| `metadata` | JSON | Dados extras: `source`, `chatwootConversationId`, etc. |
| `resolvedAt` | DateTime? | Timestamp de resolução |

**ConversationStatus — workflow de tickets:**

```
NEW → UNASSIGNED → TRIAGE → IN_PROGRESS → TESTING → RESOLVED → ARCHIVED
                                │                        │
                     WAITING_CUSTOMER          WAITING_INTERNAL
```

**Tickets com origem no Chatwoot** têm `metadata.source = 'chatwoot'` e `externalId` preenchido.

**Arquitetura completa do módulo:** `02-apps/tickets-architecture.md`

---

### CRM

```
CrmLead
 ├── Company                (empresa do lead)
 ├── CrmActivity[]          (atividades relacionadas)
 └── CrmTask[]              (tarefas)

CrmActivity
 └── CrmLead

CrmTask
 └── CrmLead
```

**CrmLead — stage pipeline:**
```
LEAD → MQL → SQL → PROPOSAL → WON
                            └→ LOST
```

---

### Fiscal e Tributação

```
TaxNcm                      (tabela NCM completa)
TaxCST                      (Código de Situação Tributária)
TaxClassification           (classificações fiscais)
SefazStatus                 (status dos webservices por UF)
TaxSyncJob                  (jobs de sincronização)
```

---

### Configuração

```
DocumentoConfig             (tipos de documentos por empresa)
SystemSetting               (configurações key-value globais)
```

---

## Enums de referência rápida

```prisma
enum Role               { ADMIN SUPORTE CLIENTE_ADMIN CLIENTE_USER DEVELOPER }
enum CompanyStatus      { ACTIVE INACTIVE SUSPENDED PENDING_DOCS }
enum RemoteHostStatus   { ACTIVE INACTIVE MAINTENANCE }
enum RemoteSessionStatus { REQUESTED STARTED ENDED FAILED CANCELLED }
enum ConversationChannel { WHATSAPP EMAIL PORTAL PHONE }
enum ConversationStatus  { NEW UNASSIGNED TRIAGE IN_PROGRESS WAITING_CUSTOMER WAITING_INTERNAL TESTING RESOLVED ARCHIVED }
enum CrmLeadStage       { LEAD MQL SQL PROPOSAL NEGOTIATION WON LOST }
enum CrmActivityType    { NOTE CALL MEETING EMAIL WHATSAPP SYSTEM_EVENT }
enum SefazServiceType   { NFE NFCE }
enum SefazStatusType    { ONLINE UNSTABLE OFFLINE }
enum CompanyContactSource { MANUAL WHATSAPP IMPORT }
enum CompanyContactStatus { PENDING_LINK LINKED ARCHIVED }
enum ContractStatus     { ACTIVE CANCELLED SUSPENDED }
enum RemoteAgentCommandType {
  REAPPLY_ALIAS REAPPLY_CONFIG UPGRADE_CLIENT ROTATE_TOKEN_REQUIRED
}
enum RemoteAgentCommandStatus { PENDING DELIVERED ACKNOWLEDGED CANCELLED FAILED }
enum RemoteAddressBookCredentialScope { GLOBAL COMPANY }
```

---

## Convenções do schema

- Todos os IDs são `String` gerados com `@default(cuid())`
- `createdAt` e `updatedAt` em todos os modelos
- `deletedAt` (soft delete) em modelos onde histórico é necessário
- Índices em campos de busca frequente: `cnpj`, `rustdeskId`, `agentToken`, `externalId`
- Foreign keys com `onDelete: Cascade` onde semanticamente correto (ex: mensagens deletadas com conversa)
