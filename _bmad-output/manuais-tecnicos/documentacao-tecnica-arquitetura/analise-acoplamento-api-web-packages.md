# Análise de Acoplamento: API, Web e Packages

**Data:** 2026-04-25
**Escopo:** `apps/web`, `apps/api`, `packages/*`
**Branch:** `claude/analyze-coupling-documentation-eIRvh`

---

## Visão Geral da Arquitetura Atual

O monorepo `dosc-syspro-workspace` organiza o sistema em três camadas:

```
apps/
  web/         → Next.js 15, runtime principal, rotas internas + server actions
  api/         → NestJS 11, shell HTTP dedicado (agente remoto + integrações)

packages/
  contracts/   → DTOs/schemas Zod (sem dependências externas)
  core/        → Lógica de negócio pura (sem dependências externas)
  database/    → Prisma schema + migrations
  application/ → Roteador BFF: procedures, contexto, rate-limit
  remote-domain/ → Domínio puro da plataforma remota
  remote-infra/  → Adaptadores infra: Prisma + portas de domínio remoto
  shared/      → Utilitários puros (currency, date, logger)
  config/      → Leitura de variáveis de ambiente (Zod)
  ui/          → Componentes React primitivos
```

### Grafo de dependências declaradas

```
apps/web
  ├─ @dosc-syspro/application
  ├─ @dosc-syspro/config
  ├─ @dosc-syspro/remote-infra          ← dependência direta de infra
  └─ @dosc-syspro/shared

apps/api
  ├─ @dosc-syspro/application           ← BFF usado no NestJS
  ├─ @dosc-syspro/config
  ├─ @dosc-syspro/contracts
  ├─ @dosc-syspro/core
  ├─ @dosc-syspro/database
  └─ @dosc-syspro/remote-domain

packages/application
  ├─ @dosc-syspro/config
  ├─ @dosc-syspro/remote-infra
  ├─ @dosc-syspro/remote-domain
  └─ @dosc-syspro/shared
  (sem @dosc-syspro/database declarado)  ← ghost dependency

packages/remote-infra
  ├─ @dosc-syspro/database
  └─ @dosc-syspro/remote-domain
```

---

## Problemas de Acoplamento Identificados

### P1 — Ghost Dependency: `@dosc-syspro/database` em `apps/web`

**Severidade:** Alta

`apps/web/package.json` não declara `@dosc-syspro/database`, mas o pacote é acessado diretamente:

```ts
// apps/web/src/lib/prisma.ts
export { prisma } from "@dosc-syspro/database";
```

Esse re-export é consumido em server actions das features:

```ts
// apps/web/src/features/documentos/application/actions.ts
import { prisma } from "@/lib/prisma";

export async function getDocumentos() {
  const docs = await prisma.documentoConfig.findMany({ ... });
}
```

```ts
// apps/web/src/features/contracts/application/queries.ts
import { prisma } from "@/lib/prisma";

export async function getContractsAction() {
  const contracts = await prisma.contract.findMany({ ... });
}
```

A resolução ocorre transitivamente através de:
`apps/web → @dosc-syspro/application → @dosc-syspro/remote-infra → @dosc-syspro/database`

**Riscos:**
- Refatorar ou remover `remote-infra` quebra silenciosamente o acesso ao banco no web
- `npm workspaces` resolve o pacote pelo hoisting, mas não garante a versão correta
- TypeCheck passa, mas a dependência não está auditada

**Correção recomendada:** Declarar `@dosc-syspro/database` explicitamente em `apps/web/package.json`.

---

### P2 — Ghost Dependency: `@dosc-syspro/database` em `packages/application`

**Severidade:** Alta

O roteador `contracts.ts` dentro do pacote `@dosc-syspro/application` importa diretamente do banco:

```ts
// packages/application/src/routers/contracts.ts
import { prisma } from "@dosc-syspro/database";
```

Mas `packages/application/package.json` não lista `@dosc-syspro/database` como dependência:

```json
{
  "name": "@dosc-syspro/application",
  "dependencies": {
    "@dosc-syspro/config": "0.0.0",
    "@dosc-syspro/remote-infra": "0.0.0",
    "@dosc-syspro/remote-domain": "0.0.0",
    "@dosc-syspro/shared": "0.0.0",
    "nodemailer": "^8.0.4"
  }
}
```

O acesso ao Prisma chega via `remote-infra → database`. Qualquer mudança no grafo de `remote-infra` pode quebrar routers não relacionados ao domínio remoto (ex.: `contracts.ts`, `settings.ts`).

**Correção recomendada:** Declarar `@dosc-syspro/database` explicitamente nas dependências de `packages/application`.

---

### P3 — `apps/api` importando pacote BFF (`@dosc-syspro/application`)

**Severidade:** Média

`@dosc-syspro/application` foi criado como camada BFF para o `apps/web`, exportando contexto de request HTTP, procedures e roteadores orientados a server actions do Next.js. Porém, `apps/api` (NestJS) também o consome:

```ts
// apps/api/src/modules/remote-admin/remote-admin.service.ts
import {
  ApiError,
  callProcedure,
  createApiContext,
  remoteRouter,
} from '@dosc-syspro/application';
```

```ts
// apps/api/src/modules/remote-admin/remote-public.service.ts
import { ApiError, callProcedure, createApiContext, remoteRouter } from '@dosc-syspro/application';
```

**Problemas gerados:**
1. O pacote `application` inclui `nodemailer` como dependência — ferramenta de infra que o próprio `apps/api` já gerencia independentemente
2. O `remoteRouter` da `application` contém lógica de sessão e portas orientadas ao contexto Next.js; reutilizá-lo no NestJS cria acoplamento implícito
3. O `apps/api` já tem acesso direto ao `@dosc-syspro/database` e ao `@dosc-syspro/remote-domain`, que é tudo que o remote admin efetivamente precisa

**Direção recomendada:** Extrair `ApiError`, `callProcedure` e `createApiContext` para um novo pacote `@dosc-syspro/rpc-core` (ou `@dosc-syspro/procedure-runner`) sem dependências de infra. O `remoteRouter` deve ser consumido diretamente do `@dosc-syspro/remote-domain`.

---

### P4 — 38 rotas proxy em `apps/web` duplicando a camada HTTP

**Severidade:** Média

`apps/web/src/app/api/` contém 38 rotas que apenas repassam a requisição para `apps/api` via HTTP:

```ts
// Padrão recorrente em apps/web/src/app/api/users/route.ts
import { proxyToBackend } from "@/app/api/_shared/backend-proxy";

export async function GET(request: NextRequest) {
  return proxyToBackend(request, { path: "/users" });
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: "/users" });
}
```

O `backend-proxy.ts` está bem implementado (preserva headers, body, query string, suporta `internal`), mas o padrão introduz:

| Problema | Impacto |
|---|---|
| Hop HTTP adicional por requisição | Latência extra browser → Next.js → NestJS |
| Sem tipagem na fronteira | Contratos perdidos entre proxy e consumidor |
| Duplicação de rotas | `/api/users` existe no web E no api |
| Autenticação redundante | `better-auth` verifica sessão nos dois lados |

**Contexto:** O README documenta que "o runtime principal continua sendo `apps/web`". O `apps/api` foi criado como shell de expansão incremental. A camada proxy é uma solução de transição — válida —, mas precisa de documentação explícita de quais rotas são proxy e quais são nativas do web.

**Recomendação:** Documentar no código a intenção de cada rota. Rotas que NÃO são proxy (18 identificadas abaixo) merecem revisão para verificar se o comportamento é intencional ou deve migrar para o API.

Rotas web-nativas (sem proxy para `apps/api`):

```
/api/sugerir-tributacao
/api/visualizar-danfe
/api/sefaz/check
/api/platform/notifications
/api/platform/session-role
/api/auth/[...all]
/api/search
/api/scripts
/api/revalidate
/api/platform/settings/chatwoot-behavior
/api/platform/settings/tickets
/api/platform/tickets/customer-emails
/api/docs/feedback
/api/platform/settings/integrations/diagnostics
/api/platform/tickets/[id]/quick-actions
/api/remote/sessions/events           ← SSE stream
/api/remote/hosts/[id]/events         ← SSE stream
/api/remote/hosts/[id]/ack-events     ← SSE stream
```

As rotas de SSE (`events`, `ack-events`) são legítimas no `apps/web` — streams de Server-Sent Events não fazem sentido como proxy HTTP.

---

### P5 — Constantes de roles duplicadas em `apps/api`

**Severidade:** Baixa

`apps/api/src/modules/users/users.service.ts` define localmente constantes já existentes em `@dosc-syspro/core`:

```ts
// Definidas localmente no API (duplicação)
const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];
const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.DEVELOPER]: 'Desenvolvedor',
  // ...
};
```

O pacote `@dosc-syspro/core` exporta essas mesmas constantes, e o `apps/api` já declara `@dosc-syspro/core` como dependência. A duplicação é um risco de divergência silenciosa se os labels ou grupos forem alterados no pacote mas não no serviço.

**Correção recomendada:**

```ts
// apps/api/src/modules/users/users.service.ts
import {
  SYSTEM_ROLES,
  CLIENT_ROLES,
  getRoleLabel,
} from '@dosc-syspro/core';
```

---

### P6 — ESLint não protege `application/actions.ts`

**Severidade:** Baixa

O `.eslintrc.json` atual restringe importação direta de Prisma em camadas de interface e componentes:

```json
{
  "files": ["src/features/*/interface/**/*.{ts,tsx}", "src/components/platform/**/*.{ts,tsx}"],
  "rules": {
    "no-restricted-imports": ["error", { "paths": [{ "name": "@/lib/prisma" }] }]
  }
}
```

Mas server actions em `src/features/*/application/actions.ts` e `src/features/*/application/queries.ts` não têm essa restrição. Files como `documentos/application/actions.ts` e `contracts/application/queries.ts` acessam Prisma diretamente — o que é **intencional** nessa arquitetura (server actions são a camada de dados do web), mas não está documentado como regra explícita.

**Recomendação:** Adicionar um comentário no `.eslintrc.json` deixando claro que `application/` nos features pode acessar Prisma porque é a borda de dados do server-side, prevenindo que futuros contribuidores tentem "corrigir" esse padrão.

---

### P7 — `apps/web` depende de `@dosc-syspro/remote-infra` diretamente

**Severidade:** Baixa

`apps/web/package.json` declara `@dosc-syspro/remote-infra` como dependência direta. Isso expõe ao `apps/web` toda a superfície de adaptadores de infraestrutura do domínio remoto, incluindo helpers do RustDesk e portas de sessão.

O web precisa de `remote-infra` porque `@dosc-syspro/application` depende dele — mas ao declarar como dependência direta, o web tem a liberdade de importar qualquer adapter de infra remota sem passar pela camada de domínio.

**Recomendação de médio prazo:** Se `@dosc-syspro/application` for a única razão para `remote-infra` no web, remover do `package.json` do web e deixar a resolução transitiva — com a ressalva de resolver antes o P1 (declarar `database` explicitamente).

---

## Tabela Resumo

| # | Problema | Localização | Severidade | Ação |
|---|---|---|---|---|
| P1 | Ghost dep `database` no web | `apps/web/package.json` | Alta | Declarar dependência |
| P2 | Ghost dep `database` no application | `packages/application/package.json` | Alta | Declarar dependência |
| P3 | API importando pacote BFF | `apps/api/remote-admin` | Média | Extrair `rpc-core` |
| P4 | 38 rotas proxy sem documentação | `apps/web/src/app/api/` | Média | Documentar intenção |
| P5 | Role constants duplicadas | `apps/api/users.service.ts` | Baixa | Importar de `@dosc-syspro/core` |
| P6 | ESLint sem regra para `actions.ts` | `.eslintrc.json` | Baixa | Comentar intenção |
| P7 | Web importa `remote-infra` direto | `apps/web/package.json` | Baixa | Avaliar remoção |

---

## Mapa de Dependências Corrigido (Estado Desejado)

```
apps/web
  ├─ @dosc-syspro/application
  ├─ @dosc-syspro/config
  ├─ @dosc-syspro/database          ← P1: declarar explicitamente
  ├─ @dosc-syspro/shared
  └─ (remover remote-infra direto)   ← P7: avaliar

packages/application
  ├─ @dosc-syspro/config
  ├─ @dosc-syspro/database          ← P2: declarar explicitamente
  ├─ @dosc-syspro/remote-infra
  ├─ @dosc-syspro/remote-domain
  └─ @dosc-syspro/shared

apps/api
  ├─ @dosc-syspro/config
  ├─ @dosc-syspro/contracts
  ├─ @dosc-syspro/core
  ├─ @dosc-syspro/database
  ├─ @dosc-syspro/remote-domain
  └─ (remover application)          ← P3: extrair rpc-core se necessário

packages/rpc-core (novo — P3)
  └─ (zero dependências de infra)
      ApiError, callProcedure, createApiContext
```

---

## Observações Positivas da Arquitetura Atual

A análise identificou os pontos de acoplamento, mas é importante registrar o que está bem:

- **`@dosc-syspro/contracts`** é uma fronteira limpa: sem dependências externas, usado por web, api e mobile sem criar ciclos
- **`@dosc-syspro/core`** é puro: lógica de negócio sem Prisma, sem HTTP, reutilizável em qualquer contexto
- **`backend-proxy.ts`** está bem implementado: preserva headers, body, suporta modo `internal` com `x-internal-api-key`
- **Padrão de feature** (`domain / application / infrastructure / interface`) está consistente nas features do web e previne que lógica de negócio vaze para componentes
- **ESLint com `no-restricted-imports`** já protege a camada de interface — é extensível para cobrir os casos restantes
- **`@dosc-syspro/remote-domain` e `remote-infra`** seguem corretamente o padrão de ports & adapters: domínio puro separado dos adaptadores Prisma

---

## Próximos Passos Sugeridos

1. **Imediato (sem risco):** Declarar `@dosc-syspro/database` em `apps/web/package.json` e `packages/application/package.json` (P1, P2)
2. **Curto prazo:** Migrar constantes de roles em `users.service.ts` para importar de `@dosc-syspro/core` (P5)
3. **Curto prazo:** Documentar no código as 38 rotas proxy com comentário padronizado indicando destino no API (P4)
4. **Médio prazo:** Avaliar extração de `ApiError` / `callProcedure` / `createApiContext` para `@dosc-syspro/rpc-core` desacoplando o NestJS do pacote BFF (P3)
5. **Médio prazo:** Revisar se `apps/web` precisa de `@dosc-syspro/remote-infra` declarado diretamente (P7)
