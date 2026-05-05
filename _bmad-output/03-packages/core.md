# Package: @dosc-syspro/core

> Entidades de negócio, configurações e lógica de domínio transversal.
> Atualizado em: 2026-05-05

---

## Responsabilidade

`@dosc-syspro/core` contém regras de negócio e entidades que são compartilhadas entre `apps/api` e `apps/web`:
- Workflow de tickets
- Configuração de roles e labels
- Lógica de releases
- Cálculo de SLA
- Regras de bloqueio de contratos

---

## Estrutura

```
packages/core/src/
├── tickets/
│   ├── ticket.entity.ts         ← entidade Ticket com regras
│   ├── ticket-state-matrix.ts   ← matriz de transições de estado
│   ├── tickets-workflow.ts      ← workflow permitido por role
│   └── compute-ticket-sla.ts   ← cálculo de SLA por prioridade
│
├── releases/
│   ├── release.entity.ts        ← entidade Release
│   └── build-release.ts         ← buildReleaseFromTicket()
│
├── rbac/
│   ├── role-labels.ts           ← labels de roles para UI
│   └── contract-blocking.ts     ← razões de bloqueio de contratos
│
└── index.ts
```

---

## Tickets — workflow e estados

```typescript
// Estados possíveis de um ticket
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED'
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

// Matriz de transições: quem pode mover para qual estado
const ticketStateMatrix: Record<TicketStatus, TicketStatus[]> = {
  OPEN:           ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS:    ['WAITING_CLIENT', 'RESOLVED'],
  WAITING_CLIENT: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED:       ['OPEN', 'CLOSED'],
  CLOSED:         ['OPEN'],
}

// Workflow por role
const ticketsWorkflow: Record<Role, AllowedActions> = {
  ADMIN:        { canCreate: true, canClose: true, canReopen: true, ... },
  SUPORTE:      { canCreate: true, canClose: true, ... },
  CLIENTE_ADMIN:{ canCreate: true, canClose: false, ... },
  CLIENTE_USER: { canCreate: true, canClose: false, ... },
  DEVELOPER:    { canCreate: true, canClose: true, ... },
}
```

---

## SLA por prioridade

```typescript
const computeTicketSla = (priority: TicketPriority, createdAt: Date) => {
  const slaHours = {
    LOW:      72,
    MEDIUM:   24,
    HIGH:      8,
    CRITICAL:  2,
  }
  return new Date(createdAt.getTime() + slaHours[priority] * 3600_000)
}
```

---

## RBAC — labels de roles

```typescript
const roleLabels: Record<Role, string> = {
  ADMIN:        'Administrador',
  SUPORTE:      'Suporte Técnico',
  CLIENTE_ADMIN:'Administrador do Cliente',
  CLIENTE_USER: 'Usuário do Cliente',
  DEVELOPER:    'Desenvolvedor',
}
```

---

## Releases

```typescript
// Cria estrutura de release a partir de um ticket resolvido
const release = buildReleaseFromTicket(ticket, { version, date })
```

---

## Bloqueio de contratos

Define as razões pelas quais um contrato pode ser bloqueado/suspenso:

```typescript
type ContractBlockReason =
  | 'PAYMENT_OVERDUE'
  | 'MANUAL_SUSPENSION'
  | 'TRIAL_EXPIRED'
  | 'VIOLATION'
```
