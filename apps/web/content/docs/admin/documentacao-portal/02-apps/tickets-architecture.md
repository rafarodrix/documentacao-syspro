# Módulo de Tickets — Arquitetura Completa

> Atualizado em: 2026-05-13

---

## Visão geral

O módulo de tickets é o núcleo de atendimento técnico do portal. Permite que clientes abram chamados, e que as equipes de suporte e desenvolvimento gerenciem o ciclo de vida de cada atendimento — incluindo mensagens em Markdown, anexos, SLA, histórico de alterações e automações via WhatsApp.

---

## Nomenclatura: Conversation ≠ Ticket (atenção)

O banco de dados usa o modelo `Conversation` para tickets internos (canal `PORTAL`). Esse nome vem da fase em que o sistema unificava WhatsApp, email e chamados em um único modelo de conversa. Hoje os dois convivem:

| Contexto | Nome usado | Motivo |
|----------|------------|--------|
| Banco (Prisma) | `Conversation`, `ConversationMessage`, `ConversationStatus` | Nome histórico, mantido por compatibilidade |
| API backend | `tickets.service.ts`, `ticket-contract.mapper.ts` | Nome semântico do negócio |
| Frontend web | `TicketListItem`, `TicketDetailsItem` | Domain model da feature |
| Contracts package | `TicketModuleRecord`, `TicketModuleMessage` | Contrato público compartilhado |
| Chatwoot/WhatsApp | Também usa `Conversation`, `channel: WHATSAPP` | Origem diferente, mesmo modelo |

**Regra prática:** `Conversation` com `channel: PORTAL` = ticket interno. Tudo que é "ticket" no código corresponde a essa condição.

---

## Estrutura de camadas

### Web — Clean Architecture

```
apps/web/src/features/tickets/
├── domain/
│   ├── ticket-model.ts                  ← tipos locais da web: TicketListItem, TicketDetailsItem
│   └── repositories/
│       └── ticket-observability.gateway.ts  ← interface (não implementada)
├── application/
│   ├── ticket-actions.ts                ← server actions: getTicketsAction, createTicketAction
│   ├── ticket-list.mapper.ts            ← TicketModuleRecord → TicketListItem
│   ├── ticket-details.mapper.ts         ← TicketModuleDetailsResponse → TicketDetailsItem
│   ├── ticket-csv.helpers.ts
│   ├── ticket-dashboard.ts
│   └── customer-emails.ts
├── infrastructure/
│   ├── gateways/
│   │   └── tickets.gateway.ts           ← HTTP: fetchTicketsGateway, updateTicketGateway
│   └── observability/
│       └── ticket-observability.ts
├── interface/
│   ├── components/
│   │   ├── tickets-container.tsx        ← coordenador: recebe dados SSR, renderiza tudo
│   │   ├── tickets-table.tsx            ← tabela/cards com sort, tooltips, badges
│   │   ├── tickets-filters.tsx          ← filtros de status, busca, equipe, fila, categoria
│   │   ├── ticket-dialog.tsx            ← formulário de novo chamado (modal)
│   │   ├── ticket-details.tsx           ← detalhes + ações de um ticket específico
│   │   ├── ticket-chat.tsx              ← timeline de mensagens
│   │   ├── ticket-finalize-dialog.tsx   ← finalizar com release
│   │   ├── ticket-testing-return-dialog.tsx
│   │   ├── ticket-attachment-field.tsx
│   │   ├── ticket-rich-text-editor.tsx  ← Markdown com preview
│   │   ├── ticket-module-cascade-select.tsx ← seletor módulo/categoria em cascata
│   │   ├── ticket-company-picker.tsx
│   │   ├── ticket-badges.tsx            ← StatusBadge, PriorityBadge
│   │   └── create-ticket-page-form.tsx
│   ├── hooks/
│   │   ├── use-ticket-chat.ts
│   │   ├── use-ticket-dialog.ts
│   │   ├── use-ticket-filters.ts        ← URL params como estado dos filtros
│   │   ├── use-ticket-hotkeys.ts
│   │   └── use-ticket-module-settings.ts
│   └── lib/
│       ├── ticket-module-hierarchy.ts   ← humanização de hierarquia módulo/submódulo
│       └── ticket-filter-preferences.ts
└── lib/
    └── ticket-markdown.ts               ← normalização de Markdown colado
```

### API — NestJS

```
apps/api/src/modules/tickets/
├── tickets.module.ts          ← DI: controller, services, providers
├── tickets.controller.ts      ← HTTP endpoints REST
├── tickets.service.ts         ← lógica core: criar, listar, atualizar tickets
├── ticket-history.service.ts  ← log de mudanças de campo
├── ticket-contract.mapper.ts  ← Prisma Conversation → TicketModuleRecord
└── update-ticket.dto.ts       ← DTO mínimo (maioria vem de @dosc-syspro/contracts)
```

### Packages compartilhados

```
packages/contracts/src/ticket/
├── ticket-module-api.types.ts       ← TicketModuleRecord, TicketModuleMessage, status/prioridade
├── ticket-module-settings.types.ts  ← categorias, equipes, prioridades, módulos
├── ticket-form.types.ts             ← ticketFormSchema (validação do formulário)
├── ticket-attachment-policy.ts      ← MIME types permitidos, max filesize
├── ticket-global-settings.types.ts  ← configurações globais do módulo
└── ticket-provider-api.types.ts     ← TicketProviderTicketApi (Chatwoot)

packages/core/src/
├── config/ticket-provider-state-matrix.ts  ← mapeamento status provider → module
├── config/tickets-workflow.ts              ← QueueKey, TicketStatusGroup, parse functions
└── services/ticket-provider-sla.service.ts ← cálculo SLA por prioridade
```

---

## Fluxo de dados principal

```
Browser
  ↓
app/(platform)/portal/tickets/page.tsx        [RSC — Server Component]
  ↓  getTicketsAction()
apps/web/features/tickets/application/ticket-actions.ts  [Server Action]
  ↓  fetchTicketsGateway()
apps/web/features/tickets/infrastructure/gateways/tickets.gateway.ts  [HTTP]
  ↓  GET /api/tickets
apps/api/modules/tickets/tickets.controller.ts  [NestJS Controller]
  ↓
apps/api/modules/tickets/tickets.service.ts  [Lógica de negócio + Prisma]
  ↓  Conversation.findMany({ where: { channel: 'PORTAL' } })
packages/database (Prisma)  [PostgreSQL]
  ↑  Conversation[] (modelo bruto)
apps/api/modules/tickets/ticket-contract.mapper.ts  [Mapper]
  ↑  TicketModuleRecord[] (@dosc-syspro/contracts)
  [HTTP response JSON]
apps/web/features/tickets/application/ticket-list.mapper.ts  [Mapper]
  ↑  TicketListItem[] (domain model web)
  [props para RSC → Client Components]
TicketsContainer → TicketsTable → TicketsFilters
```

---

## Ciclo de vida de um ticket

```
CLIENTE abre ticket via TicketDialog
  ↓  POST /api/tickets (multipart)
tickets.service.ts: createTicket()
  → cria Conversation { channel: PORTAL, status: NEW }
  → cria ConversationMessage inicial
  → dispara automação WhatsApp (notifica equipe de suporte)
  → sincroniza com Chatwoot se configurado

SUPORTE/DEV atualiza status
  ↓  PATCH /api/tickets/:id
tickets.service.ts: updateTicket()
  → valida transição de estado (state matrix)
  → registra ticket-history (campo, valorAnterior, valorNovo)
  → recalcula SLA se prioridade mudou
  → dispara automação WhatsApp conforme regra (ex: status → TESTING)

SUPORTE finaliza (status → RESOLVED)
  → ticket-finalize-dialog.tsx solicita número de release
  → cria Release vinculada ao ticket
  → status → ARCHIVED após período de inatividade
```

---

## Estados e transições

```
         ┌──────────────────────────────────────────┐
         ▼                                          │
NEW → UNASSIGNED → TRIAGE → IN_PROGRESS → TESTING → RESOLVED → ARCHIVED
                               │                        │
                    WAITING_CUSTOMER           WAITING_INTERNAL
                               │
                          IN_PROGRESS (retorno)
```

| Status | Label na UI | Quem pode definir |
|--------|-------------|-------------------|
| `NEW` | Novo | Sistema (ao criar) |
| `UNASSIGNED` | Sem responsável | ADMIN, SUPORTE |
| `TRIAGE` | Em triagem | ADMIN, SUPORTE |
| `IN_PROGRESS` | Em andamento | ADMIN, SUPORTE, DEVELOPER |
| `WAITING_CUSTOMER` | Aguardando cliente | ADMIN, SUPORTE |
| `WAITING_INTERNAL` | Aguardando interno | ADMIN, SUPORTE |
| `TESTING` | Em testes | ADMIN, DEVELOPER |
| `RESOLVED` | Resolvido | ADMIN, SUPORTE, DEVELOPER |
| `ARCHIVED` | Arquivado | Sistema |

> Matriz completa de transições: `packages/core/src/config/ticket-provider-state-matrix.ts`

---

## SLA

| Prioridade | Tempo de resposta | Tempo de resolução |
|------------|-------------------|-------------------|
| `LOW` | 72h | 120h |
| `NORMAL` | 24h | 48h |
| `HIGH` | 8h | 16h |
| `CRITICAL` | 2h | 4h |

**Pausa automática de SLA:** quando ticket entra em `WAITING_CUSTOMER`, `RESOLVED` ou `ARCHIVED`, o contador de SLA para. Retoma ao voltar para `IN_PROGRESS`.

Campos na `Conversation`:
- `slaResponseDueAt` — prazo de primeira resposta
- `slaResolutionDueAt` — prazo de resolução
- `slaResponseHitAt` — quando respondeu
- `slaResolutionHitAt` — quando resolveu

---

## Anexos (Attachments)

Policy definida em `packages/contracts/src/ticket/ticket-attachment-policy.ts`:
- Upload multipart em criação (`POST /api/tickets`) e resposta (`POST /api/tickets/:id/reply`)
- MIME types permitidos: imagens (jpeg, png, gif, webp), documentos (pdf, doc, docx, xls, xlsx), texto, vídeo (mp4)
- Armazenamento dual: banco de dados (base64) ou Cloudflare R2 (recomendado em produção)
- Checksum para integridade de arquivo

---

## Filas (QueueKey)

| Fila | Critério |
|------|----------|
| `all` | Todos os tickets |
| `my_queue` | Atribuídos ao usuário logado |
| `unassigned` | Sem responsável |
| `critical` | Prioridade CRITICAL |
| `no_response` | Aguardando sem resposta há X horas |

Definido em: `packages/core/src/config/tickets-workflow.ts`

---

## Integração com Chatwoot

Tickets com `metadata.source = 'chatwoot'` foram originados via Chatwoot:
- `metadata.chatwootConversationId` — ID da conversa no Chatwoot
- `metadata.chatwootContactId` — ID do contato no Chatwoot
- `metadata.chatwootAccountId` — conta Chatwoot de origem

Sincronização bidirecional:
- Chatwoot → Portal: webhook `conversation_created` cria `Conversation { channel: PORTAL }`
- Portal → Chatwoot: `tickets.service.ts` chama `ChatwootService.updateStatus()` ao mudar status

---

## Controle de acesso (RBAC)

| Role | Pode criar | Pode ver todos | Pode mudar status | Pode fechar |
|------|-----------|----------------|-------------------|-------------|
| `ADMIN` | ✅ | ✅ | ✅ todos | ✅ |
| `SUPORTE` | ✅ | ✅ (fila suporte) | ✅ fluxo suporte | ✅ |
| `DEVELOPER` | ✅ | ✅ (fila dev) | ✅ fluxo dev | ✅ |
| `CLIENTE_ADMIN` | ✅ | Apenas sua empresa | ❌ | ❌ |
| `CLIENTE_USER` | ✅ | Apenas seus tickets | ❌ | ❌ |

Verificação via `AuthorizationService.resolveScope()` no controller.

---

## Automações WhatsApp

Disparadas por `tickets.service.ts` via `AutomationService` ao mudar estado:

| Evento | Destinatário |
|--------|-------------|
| Ticket criado (equipe suporte) | Grupo WhatsApp de suporte |
| Ticket criado (equipe dev) | Grupo WhatsApp de desenvolvimento |
| Transferido para desenvolvimento | Grupo dev |
| Status → TESTING | Grupo de QA/testes |

> Detalhes: `_bmad-output/02-apps/api/modulos/automation.md`

---

## Gaps conhecidos e backlog técnico

### P0 — Estabilidade

| Item | Impacto |
|------|---------|
| Sem testes unitários em `tickets.service.ts` | Lógica complexa de criação/atualização sem cobertura; refatorações arriscadas |
| Sem testes em mappers (`ticket-list.mapper.ts`, `ticket-contract.mapper.ts`) | Transformações de dados sem validação automatizada |

### P1 — Consistência

| Item | Detalhe |
|------|---------|
| Dois sistemas de status | `packages/core/entities/ticket.entity.ts` define "Aberto/Em Análise/Resolvido" que não bate com `TICKET_MODULE_STATUS_VALUES` em contracts — usar apenas contracts |
| Três representações de prioridade | core: "Alta/Média/Baixa"; contracts: "LOW/NORMAL/HIGH/CRITICAL"; web: número 1–3 — unificar em contracts |
| `ticket.entity.ts` não usado | `packages/core/src/entities/ticket.entity.ts` define `Ticket { id, number, subject }` mas não é importado em nenhum lugar — remover ou alinhar |
| `TicketObservabilityGateway` incompleto | Interface definida, sem implementação — remover ou completar |

### P2 — DX

| Item | Detalhe |
|------|---------|
| `metadata: Record<string, unknown>` | Schema não tipado; `readStringMetadata()` manual sem autocomplete — criar schema Zod |
| `ticket-details.tsx` com lógica misturada | 7+ useState, chama tRPC diretamente — extrair para hook |
| `customer-emails/route.ts` sem Zod | Query params `q` e `limit` sem schema versionado |
| Renomear Conversation → Ticket | Decisão de longo prazo; enquanto isso, documentar convenção explicitamente |

---

## Rotas do módulo (API REST)

| Método | Path | Descrição |
|--------|------|-----------|
| `GET` | `/api/tickets` | Lista tickets com filtros (status, queue, team, search, pagination) |
| `POST` | `/api/tickets` | Cria novo ticket (multipart/form-data com anexos) |
| `GET` | `/api/tickets/:id` | Detalhes de um ticket com mensagens e histórico |
| `PATCH` | `/api/tickets/:id` | Atualiza campos (status, prioridade, responsável, equipe) |
| `POST` | `/api/tickets/:id/reply` | Adiciona mensagem (multipart, com anexos) |
| `GET` | `/api/tickets/linked-companies` | Empresas elegíveis para vincular ao ticket |
| `GET` | `/api/platform/settings/tickets` | Configurações do módulo (categorias, prioridades, módulos) |
| `PUT` | `/api/platform/settings/tickets` | Atualiza configurações do módulo |
| `GET` | `/api/platform/tickets/customer-emails` | Busca emails de clientes para autocomplete |
| `POST` | `/api/platform/tickets/:id/quick-actions` | Ações rápidas (fechar, reabrir, escalar) |

---

## Rotas Next.js (Frontend)

| Rota | Arquivo | Tipo |
|------|---------|------|
| `/portal/tickets` | `app/(platform)/portal/tickets/page.tsx` | RSC (lista) |
| `/portal/tickets/[id]` | `app/(platform)/portal/tickets/[id]/page.tsx` | RSC (detalhes) |
| `/portal/tickets/novo` | `app/(platform)/portal/tickets/novo/page.tsx` | RSC (formulário) |

Skeletons automáticos (Next.js App Router):
- `/portal/tickets/loading.tsx` — skeleton da lista
- `/portal/tickets/[id]/loading.tsx` — skeleton do detalhe
