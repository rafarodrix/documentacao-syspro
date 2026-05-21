# Documentação Técnica — Trilink Portal

> Última atualização: 2026-05-05

Documentação técnica do monorepo **documentacao-syspro** (Trilink Portal). Organizada por projeto e submódulo para facilitar navegação e pesquisa de contexto.

---

## Estrutura desta documentação

```
_bmad-output/
  01-monorepo/
    visao-geral.md            ← stack, apps, packages, turbo pipelines
    comunicacao-entre-apps.md ← tRPC, REST, IPC, webhooks, fluxos
    padroes-arquiteturais.md  ← hexagonal, CQRS, RBAC, naming

  02-apps/
    tickets-architecture.md   ← arquitetura completa do módulo de tickets
    api/
      visao-geral.md          ← NestJS, módulos, configuração
      modulos/
        core-modules.md       ← companies, contacts, users, tickets, crm, releases...
        integracoes.md        ← chatwoot, evolution, messaging, storage
        remote-admin.md       ← módulo de administração remota (RustDesk)
        trpc.md               ← roteador tRPC
    web/
      visao-geral.md          ← Next.js 15, features, rotas, API routes
    agent/
      visao-geral.md          ← Go, Wails, 2 binários, módulos
      fluxo-operacional.md    ← discover → bootstrap → heartbeat → ack
    mobile/
      visao-geral.md          ← placeholder / roadmap

  03-packages/
    visao-geral.md            ← mapa de dependências entre packages
    contracts.md              ← @dosc-syspro/contracts (Zod schemas)
    remote-domain.md          ← @dosc-syspro/remote-domain (ports & adapters)
    remote-infra.md           ← @dosc-syspro/remote-infra (implementações)
    database.md               ← @dosc-syspro/database (Prisma)
    shared.md                 ← @dosc-syspro/shared (utilitários)
    core.md                   ← @dosc-syspro/core (entidades de negócio)

  04-integracoes/
    chatwoot.md               ← integração Chatwoot (customer support)
    evolution.md              ← integração Evolution/WhatsApp
    rustdesk.md               ← integração RustDesk (acesso remoto)
    r2-storage.md             ← Cloudflare R2 (object storage)
    sefaz.md                  ← SEFAZ / NFe / NFCe / MDF-e

  05-acesso-remoto/
    arquitetura.md            ← visão completa do módulo remoto
    fluxo-tokens-e-sessoes.md ← agentToken, ACK queue, sessões

  06-banco-de-dados/
    schema-overview.md        ← modelos Prisma, enums, relações principais

  07-guias/
    novo-modulo-api.md        ← como criar módulo NestJS novo
    novo-package.md           ← como criar package no monorepo
    padrao-nomeclatura.md     ← convenções de nomenclatura
```

---

## Mapa rápido: projeto → documentação

| Quero entender...                      | Leia                                               |
|----------------------------------------|----------------------------------------------------|
| Visão geral do projeto                 | `01-monorepo/visao-geral.md`                       |
| Como os apps se comunicam              | `01-monorepo/comunicacao-entre-apps.md`            |
| O backend NestJS (API)                 | `02-apps/api/visao-geral.md`                       |
| Módulos de negócio da API              | `02-apps/api/modulos/core-modules.md`              |
| **Módulo de tickets (arquitetura)**    | **`02-apps/tickets-architecture.md`**              |
| Automações WhatsApp (tickets/SEFAZ)    | `02-apps/api/modulos/automation.md`                |
| Integração Chatwoot/Evolution          | `02-apps/api/modulos/integracoes.md`               |
| O agente Windows (Go)                  | `02-apps/agent/visao-geral.md`                     |
| Como o agente se registra e opera      | `02-apps/agent/fluxo-operacional.md`               |
| O frontend Next.js                     | `02-apps/web/visao-geral.md`                       |
| Contratos e schemas (Zod)              | `03-packages/contracts.md`                         |
| Lógica de domínio remoto               | `03-packages/remote-domain.md`                     |
| Schema do banco de dados               | `06-banco-de-dados/schema-overview.md`             |
| Fluxo completo de acesso remoto        | `05-acesso-remoto/arquitetura.md`                  |
| Tokens e sessões do agente             | `05-acesso-remoto/fluxo-tokens-e-sessoes.md`       |
| Como criar um novo módulo na API       | `07-guias/novo-modulo-api.md`                      |
