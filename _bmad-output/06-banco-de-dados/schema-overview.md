# Banco de Dados — Schema Overview

> PostgreSQL via Prisma ORM. Schema em `packages/database/prisma/schema.prisma`.
> Atualizado em: 2026-05-05

---

## Agrupamento por domínio

### Empresas e Contratos

```
Company
 ├── CompanyContact[]       (contatos da empresa)
 ├── Membership[]           (usuários vinculados)
 ├── Contract[]             (contratos de serviço)
 ├── RemoteHost[]           (hosts remotos)
 ├── Conversation[]         (conversas/atendimentos)
 ├── CrmLead[]              (leads CRM)
 └── DocumentoConfig[]      (configurações de docs)
```

**Company — campos principais:**
- `cnpj`, `razaoSocial`, `nomeFantasia`, `inscricaoEstadual`
- `status`: ACTIVE | INACTIVE | SUSPENDED
- `segment`: tipo de negócio (enum)
- `taxRegime`: Simples Nacional | Lucro Presumido | Lucro Real
- `matrizId`: referência à empresa matriz (hierarquia)
- `installationDirectory`: caminho do Syspro Server

---

### Usuários e Acesso

```
User
 ├── Membership[]           (vínculos com empresas)
 └── CompanyContact?        (contato associado)

Membership
 ├── User
 ├── Company
 └── role: Role             (ADMIN|SUPORTE|CLIENTE_ADMIN|CLIENTE_USER|DEVELOPER)

AccessProfile
 └── Permission[]           (permissões granulares)

Permission
 └── AccessProfile[]        (M:N)
```

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
- `status`: PENDING | ACKNOWLEDGED
- `result`: resultado após ACK do agente

---

### Mensageria e Atendimento

```
Conversation
 ├── Company
 ├── CompanyContact         (cliente)
 ├── ConversationMessage[]  (mensagens)
 └── ConversationAssignment[] (atribuições)

ConversationMessage
 ├── Conversation
 └── type: TEXT|IMAGE|DOCUMENT|AUDIO|VIDEO

TicketCategory              (categorias de tickets, independente)

ChatwootCsatRating
 └── Conversation
```

**Conversation — campos principais:**
- `channel`: WHATSAPP | EMAIL | PORTAL | PHONE
- `status`: OPEN | IN_PROGRESS | WAITING_CLIENT | RESOLVED | CLOSED
- `externalId`: ID no Chatwoot (sincronização)

---

### Tickets

Os tickets usam o modelo `Conversation` com `channel: PORTAL` para tickets internos.

Dados adicionais de ticket ficam em campos extras da `Conversation` ou em uma tabela separada dependendo da implementação atual.

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
enum CompanyStatus      { ACTIVE INACTIVE SUSPENDED }
enum RemoteHostStatus   { ACTIVE INACTIVE MAINTENANCE }
enum RemoteSessionStatus { REQUESTED STARTED ENDED }
enum ConversationChannel { WHATSAPP EMAIL PORTAL PHONE }
enum ConversationStatus  { OPEN IN_PROGRESS WAITING_CLIENT RESOLVED CLOSED }
enum CrmLeadStage       { LEAD MQL SQL PROPOSAL WON LOST }
enum CrmActivityType    { NOTE CALL MEETING EMAIL WHATSAPP }
enum SefazServiceType   { NFE NFCE MDFE }
enum SefazServiceStatus { ONLINE UNSTABLE OFFLINE }
enum CompanyContactSource { MANUAL WHATSAPP IMPORT }
enum ContractStatus     { ACTIVE INACTIVE SUSPENDED }
enum RemoteAgentCommandType {
  REAPPLY_ALIAS REAPPLY_CONFIG UPGRADE_CLIENT ROTATE_TOKEN_REQUIRED
}
enum RemoteAddressBookCredentialScope { GLOBAL COMPANY }
```

---

## Convenções do schema

- Todos os IDs são `String` UUIDs gerados com `@default(uuid())`
- `createdAt` e `updatedAt` em todos os modelos
- `deletedAt` (soft delete) em modelos onde histórico é necessário
- Índices em campos de busca frequente: `cnpj`, `rustdeskId`, `agentToken`, `externalId`
- Foreign keys com `onDelete: Cascade` onde semanticamente correto (ex: mensagens deletadas com conversa)
