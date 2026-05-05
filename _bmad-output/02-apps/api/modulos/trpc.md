# API — Módulo tRPC

> `apps/api/src/modules/trpc/` · Atualizado em: 2026-05-05

---

## Responsabilidade

O módulo `trpc` expõe um roteador tRPC que o frontend (`apps/web`) consome para chamadas type-safe. Segue o padrão **federated router** — cada domínio registra seu sub-roteador no router principal.

---

## Arquivos

```
src/modules/trpc/
├── trpc.module.ts      ← módulo NestJS, importa todos os módulos de domínio
├── trpc.router.ts      ← router principal (mescla sub-routers)
├── trpc.service.ts     ← inicialização do tRPC (context, middlewares)
└── trpc.context.ts     ← extrai contexto da request (user, session, scope)
```

---

## Router principal

O `trpc.router.ts` agrega procedures de cada domínio:

```typescript
export const appRouter = router({
  companies:   companiesRouter,
  contacts:    contactsRouter,
  users:       usersRouter,
  tickets:     ticketsRouter,
  crm:         crmRouter,
  dashboard:   dashboardRouter,
  releases:    releasesRouter,
  settings:    settingsRouter,
  agents:      agentsRouter,
  tax:         taxRouter,
  // ...
})

export type AppRouter = typeof appRouter
```

O tipo `AppRouter` é exportado e importado pelo `apps/web` para inferência automática.

---

## Contexto tRPC

`trpc.context.ts` extrai da request HTTP:
- Sessão do usuário (Better Auth)
- Role e permissões resolvidas
- CompanyIds vinculadas
- IP e headers para rate limiting

Disponível em todas as procedures via `ctx`.

---

## Middlewares

- **`isAuthenticated`**: garante sessão válida — procedures protegidas usam este middleware
- **`hasPermission(permission)`**: verifica permissão granular
- **`hasRole(role)`**: verifica role mínimo

---

## Consumindo no frontend

```typescript
// apps/web (tRPC client)
const companies = await trpc.companies.list.query({ page: 1 })
const ticket = await trpc.tickets.create.mutate({ ... })
```

Erros do servidor são propagados como `TRPCError` e tratados no cliente automaticamente.

---

## Endpoint

O roteador tRPC fica montado em:
```
POST /trpc/[procedure]
```

Não usa GET para queries (configuração padrão do tRPC HTTP adapter no NestJS).
