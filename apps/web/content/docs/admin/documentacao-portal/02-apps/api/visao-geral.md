# app/api — Backend NestJS

> Stack: NestJS 11 · TypeScript 5.8 · Prisma 5.22 · PostgreSQL · tRPC 11
> Atualizado em: 2026-05-05

---

## Responsabilidade

O `apps/api` é o backend principal do Trilink Portal. Expõe:
- **tRPC** para comunicação type-safe com o frontend (`apps/web`)
- **REST** para webhooks de integrações (Chatwoot, Evolution) e para o agente Go
- **Prisma** como ORM para acesso ao PostgreSQL

---

## Estrutura de diretórios

```
apps/api/
├── src/
│   ├── app.module.ts          ← módulo raiz, importa todos os módulos
│   ├── main.ts                ← bootstrap NestJS (porta, CORS, pipes)
│   ├── exports.ts             ← exports de tipos públicos da API
│   │
│   ├── common/
│   │   ├── auth/
│   │   │   └── internal-api-auth.ts    ← auth de API interna (HMAC)
│   │   └── system-settings/
│   │       └── remote-module-settings-snapshot.ts
│   │
│   ├── modules/               ← todos os módulos de domínio (ver abaixo)
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts   ← módulo global do Prisma
│   │   └── prisma.service.ts  ← PrismaService com lifecycle hooks
│   │
│   └── types/
│       └── nodemailer.d.ts    ← type declarations
│
├── tests/                     ← testes de integração
├── deploy/
│   ├── Dockerfile
│   └── docker-compose.yml
└── .env.example
```

---

## Módulos disponíveis

| Módulo              | Path                          | Descrição                                      |
|---------------------|-------------------------------|------------------------------------------------|
| `agents`            | `modules/agents/`             | Gerenciamento de agentes/dispositivos          |
| `auth`              | `modules/auth/`               | Autenticação (Better Auth)                     |
| `authorization`     | `modules/authorization/`      | RBAC — resolução de permissões e escopo        |
| `automation`        | `modules/automation/`         | Automações de WhatsApp e configurações         |
| `companies`         | `modules/companies/`          | CRUD de empresas, segmentos, contratos         |
| `contacts`          | `modules/contacts/`           | Contatos por empresa                           |
| `crm`               | `modules/crm/`                | CRM: leads, atividades, tarefas                |
| `dashboard`         | `modules/dashboard/`          | Métricas e KPIs agregados                      |
| `docs`              | `modules/docs/`               | Feedback e views de documentação               |
| `documentos`        | `modules/documentos/`         | Armazenamento de documentos de empresa         |
| `integrations`      | `modules/integrations/`       | Chatwoot, Evolution, Messaging, R2 Storage     |
| `releases`          | `modules/releases/`           | Releases e changelogs do produto               |
| `remote-admin`      | `modules/remote-admin/`       | Administração de hosts remotos (RustDesk)      |
| `settings`          | `modules/settings/`           | Configurações: permissões, SEFAZ, integrações  |
| `tax`               | `modules/tax/`                | Tributação: NCM, CST, CFOP, ICMS               |
| `tickets`           | `modules/tickets/`            | Tickets/chamados internos com workflow         |
| `trpc`              | `modules/trpc/`               | Roteador tRPC (federated router)               |
| `users`             | `modules/users/`              | Usuários, perfis, acesso a contatos            |

---

## Autenticação

Usa **Better Auth** — biblioteca de autenticação para Node.js.

- Session via cookie HttpOnly (seguro contra XSS)
- O módulo `auth` expõe endpoints REST (`/api/auth/[...all]`) que o frontend usa diretamente
- Sessions são verificadas no middleware NestJS antes de qualquer rota protegida

**API interna:**
Chamadas entre `apps/web` → `apps/api` que não passam pelo browser usam HMAC-SHA256 (`internal-api-auth.ts`) para autenticar.

---

## Configuração principal (app.module.ts)

O `AppModule` importa todos os módulos de domínio e configura:
- `PrismaModule` como **global** (disponível em toda a aplicação sem importar)
- `ValidationPipe` global (valida DTOs com class-validator / Zod)
- CORS configurado para a origem do frontend
- Prefixo `/api` em todas as rotas REST

---

## Configuração de build

O build usa **Webpack** customizado (`webpack.config.js`) para gerar um bundle Node.js único. Binary targets do Prisma configurados para:
- `native` (desenvolvimento local)
- `linux-musl-openssl-3.0.x` (container Docker)

**Docker:**
```bash
# Build e execução via Docker Compose
cd apps/api/deploy
docker-compose up --build
```

---

## Variáveis de ambiente obrigatórias

```env
DATABASE_URL=postgresql://...     # PostgreSQL via PgBouncer
DIRECT_URL=postgresql://...       # Direct URL para migrations Prisma
BETTER_AUTH_SECRET=...            # Secret de sessão
BETTER_AUTH_URL=...               # URL base da aplicação
R2_BUCKET_NAME=...                # Cloudflare R2
R2_ENDPOINT=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_BASE_URL=...
CHATWOOT_API_URL=...              # Chatwoot (opcional)
CHATWOOT_API_KEY=...
EVOLUTION_API_URL=...             # Evolution/WhatsApp (opcional)
EVOLUTION_API_KEY=...
```

---

## Testes

```bash
npx turbo test:api
# ou diretamente:
cd apps/api && npx vitest
```

Testes ficam em `apps/api/tests/`. Atualmente cobrem:
- `agents.service.test.ts`
- `conversations.controller.test.ts`
