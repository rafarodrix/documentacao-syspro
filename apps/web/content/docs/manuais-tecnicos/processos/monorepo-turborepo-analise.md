# Analise de Reestruturacao: Monorepo com Turborepo

## 1. Diagnostico do Estado Atual

### 1.1 Arquitetura Atual

O projeto e uma **aplicacao Next.js monolitica** (`dosc-syspro`) com:

- **Framework:** Next.js 15.2.4 + React 19 + TypeScript 5.8
- **Database:** PostgreSQL (Supabase) via Prisma 5.22
- **Auth:** Better Auth 1.3.34
- **UI:** Radix UI + shadcn/ui + Tailwind CSS 4
- **Docs:** Fumadocs (MDX)

```
src/
├── app/
│   ├── (autenticacao)/     # Rotas publicas de auth
│   ├── (platform)/
│   │   ├── admin/          # Area administrativa (16 paginas)
│   │   └── app/            # Area do cliente (12 paginas)
│   ├── (site)/             # Site publico
│   ├── docs/               # Documentacao
│   └── api/                # API Routes
├── actions/                # Server Actions
├── components/             # React Components
├── core/                   # Domain Logic (DDD)
├── hooks/                  # Custom Hooks
├── lib/                    # Utilidades
└── providers/              # Context Providers
```

### 1.2 Problema Central: Duplicacao de Rotas Admin/App

A analise revelou **14 paginas duplicadas** entre `/admin` e `/app`:

| Rota | Admin | App | Duplicada |
|------|-------|-----|-----------|
| Dashboard (home) | `admin/page.tsx` | `app/page.tsx` | Sim |
| Layout | `admin/layout.tsx` | `app/layout.tsx` | Sim |
| Cadastros | `admin/cadastros/` | `app/cadastros/` | Sim |
| Chamados | `admin/chamados/` | `app/chamados/` | Sim |
| Chamados [id] | `admin/chamados/[id]/` | `app/chamados/[id]/` | Sim |
| Perfil | `admin/perfil/` | `app/perfil/` | Sim |
| Tools (index) | `admin/tools/` | `app/tools/` | Sim |
| Analisador XML | `admin/tools/analisador-xml/` | `app/tools/analisador-xml/` | Sim |
| Calculadora DIFAL | `admin/tools/calculadora-difal/` | `app/tools/calculadora-difal/` | Sim |
| Calculadora Precificacao | `admin/tools/calculadora-precificacao/` | `app/tools/calculadora-precificacao/` | Sim |
| Config Documentos | `admin/tools/configuracao-documentos/` | `app/tools/configuracao-documentos/` | Sim |
| Custos Departamento | `admin/tools/custos-departamento/` | `app/tools/custos-departamento/` | Sim |
| Fator Producao | `admin/tools/fator-producao/` | `app/tools/fator-producao/` | Sim |
| Visualizador DANFE | `admin/tools/visualizador-danfe/` | `app/tools/visualizador-danfe/` | Sim |

**Rotas exclusivas do Admin (4):**
- `admin/configuracoes/` - Configuracoes do sistema
- `admin/contratos/` - Gestao de contratos
- `admin/reforma-tributaria/` - Reforma tributaria
- `admin/tools/configuracao-documento/` - Config documento individual

**Rotas exclusivas do App:** Nenhuma - app e um subconjunto de admin.

### 1.3 Metricas do Projeto Atual

| Categoria | Total | Admin-Only | Duplicados | Compartilhados |
|-----------|-------|-----------|------------|----------------|
| Paginas (routes) | 32 | 4 | 14 | 0 |
| Componentes | 22 | 11 | 1 | 8 |
| Server Actions | 10 | 5 | 0 | 5 |
| Core (DDD) | 28 | 0 | 0 | 28 |
| Hooks | 8 | 0 | 0 | 8 |
| Lib/Utils | 14 | 0 | 0 | 14 |

### 1.4 Sistema de Permissoes Existente (RBAC)

Ja existe um sistema robusto de RBAC:

**Roles (Prisma enum):**
- `DEVELOPER` - Acesso total ao sistema
- `ADMIN` - Acesso total ao sistema
- `SUPORTE` - Equipe de suporte (leitura + reset senha)
- `CLIENTE_ADMIN` - Gestor da empresa cliente
- `CLIENTE_USER` - Usuario comum

**Matriz de Permissoes (`permissions.ts`):**
```
ADMIN/DEVELOPER  -> Todas as permissoes
SUPORTE          -> dashboard:view, companies:view, users:view, users:reset_password
CLIENTE_ADMIN    -> dashboard:view, companies:view/edit, users:view/create/edit/status
CLIENTE_USER     -> dashboard:view
```

**Funcoes RBAC (`rbac.ts`):**
- `hasPermission(role, permission)` - Verifica permissao especifica
- `hasAnyPermission(role, permissions[])` - Verifica se tem pelo menos uma

---

## 2. Arquitetura Proposta: Monorepo com Turborepo

### 2.1 Estrutura do Monorepo

```
cadens/
├── apps/
│   ├── web/                    # Next.js - Aplicacao Web (Unificada)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/             # Login, Register, Reset
│   │   │   │   ├── (site)/             # Landing, Termos, Privacidade
│   │   │   │   ├── (platform)/         # ROTA UNICA - acesso por perfil
│   │   │   │   │   ├── layout.tsx      # Layout unificado com RBAC
│   │   │   │   │   ├── page.tsx        # Dashboard (adaptativo por role)
│   │   │   │   │   ├── cadastros/      # Cadastros (filtrado por permissao)
│   │   │   │   │   ├── chamados/       # Chamados (todos os roles)
│   │   │   │   │   ├── contratos/      # Contratos (guard: RBAC)
│   │   │   │   │   ├── configuracoes/  # Settings (guard: RBAC)
│   │   │   │   │   ├── perfil/         # Perfil (todos)
│   │   │   │   │   ├── reforma-tributaria/ # (guard: RBAC)
│   │   │   │   │   └── tools/          # Ferramentas (filtradas por perfil)
│   │   │   │   ├── docs/               # Fumadocs
│   │   │   │   └── api/                # API Routes
│   │   │   ├── components/
│   │   │   │   ├── layout/             # Layout unificado (Sidebar, Header)
│   │   │   │   ├── modules/            # Componentes por modulo
│   │   │   │   │   ├── cadastros/
│   │   │   │   │   ├── chamados/
│   │   │   │   │   ├── contratos/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── settings/
│   │   │   │   │   └── tools/
│   │   │   │   └── auth/               # Formularios de auth
│   │   │   ├── actions/                # Server Actions (unificados)
│   │   │   ├── hooks/                  # Hooks especificos do web
│   │   │   └── providers/              # Context providers
│   │   ├── public/
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── mobile/                 # React Native + Expo (Fase 2)
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   ├── navigation/
│   │   │   └── components/
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── api/                    # NestJS - Backend Dedicado (Fase 3)
│       ├── src/
│       │   ├── modules/
│       │   ├── guards/
│       │   └── main.ts
│       └── package.json
│
├── packages/
│   ├── core/                   # Regras de Negocio (Domain + Use Cases)
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   │   ├── entities/           # User, Company, Contract, Ticket...
│   │   │   │   └── interfaces/         # Contratos (ports)
│   │   │   ├── application/
│   │   │   │   ├── use-cases/          # Logica de negocio
│   │   │   │   ├── schemas/            # Validacao Zod
│   │   │   │   └── dto/                # Data Transfer Objects
│   │   │   ├── config/
│   │   │   │   ├── permissions.ts      # RBAC: Matriz de permissoes
│   │   │   │   └── roles.ts            # Definicao de roles
│   │   │   ├── constants/              # Constantes de negocio
│   │   │   └── types/                  # TypeScript types globais
│   │   ├── tsconfig.json
│   │   └── package.json                # @cadens/core
│   │
│   ├── ui/                     # Design System Compartilhado
│   │   ├── src/
│   │   │   ├── primitives/             # Radix UI wrappers (Button, Input...)
│   │   │   ├── composites/             # Componentes compostos (DataTable, Forms...)
│   │   │   ├── layout/                 # Shell, Sidebar, Header (base)
│   │   │   └── styles/                 # Tokens, theme, global CSS
│   │   ├── tsconfig.json
│   │   └── package.json                # @cadens/ui
│   │
│   ├── config/                 # Configuracoes Compartilhadas
│   │   ├── eslint/                     # ESLint config base
│   │   ├── typescript/                 # TSConfig base
│   │   └── tailwind/                   # Tailwind preset
│   │   └── package.json                # @cadens/config
│   │
│   └── utils/                  # Utilitarios Compartilhados
│       ├── src/
│       │   ├── formatters.ts           # Formatacao (CNPJ, CPF, moeda, data)
│       │   ├── validators.ts           # Validacoes puras
│       │   ├── date.ts                 # Helpers de data
│       │   └── cn.ts                   # Utility classnames
│       ├── tsconfig.json
│       └── package.json                # @cadens/utils
│
├── tooling/                    # Scripts e ferramentas dev
│   ├── scripts/
│   │   ├── seed.ts                     # Database seeding
│   │   └── migrate.ts                  # Migration helpers
│   └── package.json
│
├── turbo.json                  # Turborepo config
├── package.json                # Root workspace config
├── pnpm-workspace.yaml         # pnpm workspaces
└── .gitignore
```

### 2.2 Configuracao Turborepo

**`turbo.json` (raiz):**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "clean": {
      "cache": false
    }
  }
}
```

**`package.json` (raiz):**
```json
{
  "name": "cadens",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=@cadens/web",
    "dev:mobile": "turbo dev --filter=@cadens/mobile",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "db:generate": "turbo db:generate --filter=@cadens/web",
    "db:migrate": "turbo db:migrate --filter=@cadens/web",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.5.0"
  },
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=20"
  }
}
```

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tooling"
```

---

## 3. Unificacao de Rotas: Rota Unica com Controle por Perfil

### 3.1 Problema Atual

Hoje existem **duas arvores de rotas** (`/admin/*` e `/app/*`) que duplicam funcionalidade. O roteamento e feito por **role no layout**:

```
Middleware → Verifica sessao
  ↓
/(platform)/admin/layout.tsx → Se nao e ADMIN/DEVELOPER/SUPORTE, redirect /app
/(platform)/app/layout.tsx   → Qualquer role autenticado
```

### 3.2 Solucao: Rota Unica `/(platform)/*`

Eliminar a separacao `/admin` vs `/app`. Todos os usuarios acessam a **mesma rota**, e a **visibilidade dos modulos** e controlada pelo RBAC existente.

**Novo fluxo:**
```
Middleware → Verifica sessao
  ↓
/(platform)/layout.tsx → Layout UNICO (Sidebar/Header adaptativo por role)
  ↓
Cada pagina → Usa hasPermission() para filtrar conteudo
```

### 3.3 Evolucao do Sistema de Permissoes

O RBAC atual precisa ser expandido para cobrir os novos modulos unificados:

```typescript
// packages/core/src/config/permissions.ts

export const SYSTEM_PERMISSIONS = {
  // --- DASHBOARD ---
  "dashboard:view": "Visualizar Dashboard",
  "dashboard:stats_full": "Ver estatisticas completas",     // NOVO

  // --- CADASTROS: EMPRESAS ---
  "companies:view": "Visualizar Lista de Empresas",
  "companies:view_all": "Ver TODAS as empresas",            // NOVO
  "companies:view_own": "Ver apenas a propria empresa",     // NOVO
  "companies:create": "Cadastrar Nova Empresa",
  "companies:edit": "Editar Dados da Empresa",
  "companies:status": "Ativar/Desativar Empresa",

  // --- CADASTROS: USUARIOS ---
  "users:view": "Visualizar Lista de Usuarios",
  "users:view_all": "Ver TODOS os usuarios",                // NOVO
  "users:view_team": "Ver equipe da propria empresa",       // NOVO
  "users:create": "Cadastrar/Convidar Usuario",
  "users:edit": "Editar Usuario",
  "users:reset_password": "Resetar Senha de Usuario",
  "users:status": "Ativar/Desativar Acesso",

  // --- CONTRATOS ---
  "contracts:view": "Visualizar Contratos",                  // NOVO
  "contracts:create": "Criar Contrato",                      // NOVO
  "contracts:edit": "Editar Contrato",                       // NOVO

  // --- CONFIGURACOES ---
  "settings:view": "Visualizar Configuracoes",               // NOVO
  "settings:edit": "Editar Configuracoes",                   // NOVO

  // --- FERRAMENTAS ---
  "tools:view": "Acessar Ferramentas",                       // NOVO
  "tools:all": "Todas as ferramentas",                       // NOVO
  "tools:basic": "Ferramentas basicas",                      // NOVO

  // --- CHAMADOS ---
  "tickets:view_own": "Ver proprios chamados",               // NOVO
  "tickets:view_all": "Ver todos os chamados",               // NOVO
  "tickets:create": "Criar chamado",                         // NOVO
  "tickets:manage": "Gerenciar chamados (atribuir, fechar)", // NOVO

  // --- REFORMA TRIBUTARIA ---
  "tax_reform:view": "Visualizar Reforma Tributaria",        // NOVO
  "tax_reform:manage": "Gerenciar Dados Tributarios",        // NOVO

  // --- SISTEMA ---
  "system_team:view": "Visualizar Equipe Interna",
  "system_team:manage": "Gerenciar Equipe Interna",
} as const;
```

**Nova Matriz de Acesso:**
```typescript
export const ACCESS_MATRIX: AccessControlMatrix = {
  DEVELOPER: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],
  ADMIN: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],

  SUPORTE: [
    "dashboard:view",
    "companies:view", "companies:view_all",
    "users:view", "users:view_all", "users:reset_password",
    "tickets:view_all", "tickets:manage",
    "tools:view", "tools:all",
    "tax_reform:view",
  ],

  CLIENTE_ADMIN: [
    "dashboard:view",
    "companies:view", "companies:view_own", "companies:edit",
    "users:view", "users:view_team", "users:create", "users:edit", "users:status",
    "tickets:view_own", "tickets:create",
    "tools:view", "tools:basic",
  ],

  CLIENTE_USER: [
    "dashboard:view",
    "tickets:view_own", "tickets:create",
    "tools:view", "tools:basic",
  ],
};
```

### 3.4 Layout Unificado

**Antes (2 layouts separados):**
```
AdminLayout → AdminSidebar + AdminHeader
ClientLayout → ClientSidebar + ClientHeader
```

**Depois (1 layout adaptativo):**
```typescript
// apps/web/src/app/(platform)/layout.tsx

export default async function PlatformLayout({ children }) {
  const session = await getProtectedSession();
  if (!session) redirect('/login');

  return (
    <PlatformShell role={session.role} user={session}>
      {children}
    </PlatformShell>
  );
}
```

```typescript
// apps/web/src/components/layout/PlatformShell.tsx

export function PlatformShell({ role, user, children }) {
  // O sidebar renderiza APENAS os modulos que o role tem permissao
  const navigation = buildNavigationForRole(role);

  return (
    <div className="flex h-screen">
      <Sidebar navigation={navigation} user={user} />
      <div className="flex-1 flex flex-col">
        <Header user={user} role={role} />
        <main>{children}</main>
      </div>
    </div>
  );
}
```

```typescript
// apps/web/src/components/layout/navigation.ts

export function buildNavigationForRole(role: Role): NavItem[] {
  const items: NavItem[] = [];

  // Dashboard - todos veem
  items.push({ label: "Dashboard", href: "/", icon: Home });

  // Cadastros - quem tem permissao
  if (hasAnyPermission(role, ["companies:view", "users:view"])) {
    items.push({ label: "Cadastros", href: "/cadastros", icon: Users });
  }

  // Chamados - todos, mas escopo diferente
  items.push({ label: "Chamados", href: "/chamados", icon: MessageSquare });

  // Contratos - apenas quem tem permissao
  if (hasPermission(role, "contracts:view")) {
    items.push({ label: "Contratos", href: "/contratos", icon: FileText });
  }

  // Configuracoes - apenas admin
  if (hasPermission(role, "settings:view")) {
    items.push({ label: "Configuracoes", href: "/configuracoes", icon: Settings });
  }

  // Ferramentas - todos com tools:view
  if (hasPermission(role, "tools:view")) {
    items.push({ label: "Ferramentas", href: "/tools", icon: Wrench });
  }

  // Reforma Tributaria - apenas quem tem permissao
  if (hasPermission(role, "tax_reform:view")) {
    items.push({ label: "Reforma Tributaria", href: "/reforma-tributaria", icon: Calculator });
  }

  return items;
}
```

### 3.5 Protecao em Nivel de Pagina

Cada pagina que tem restricao de acesso usa um guard:

```typescript
// apps/web/src/app/(platform)/contratos/page.tsx

import { getProtectedSession } from "@/lib/auth-helpers";
import { hasPermission } from "@cadens/core/rbac";
import { redirect } from "next/navigation";

export default async function ContratosPage() {
  const session = await getProtectedSession();
  if (!session) redirect("/login");

  // Guard: Apenas quem tem permissao de ver contratos
  if (!hasPermission(session.role, "contracts:view")) {
    redirect("/"); // Ou pagina de "Sem Permissao"
  }

  // ... render
}
```

### 3.6 Conteudo Adaptativo por Role

Para paginas que existem para todos mas mostram dados diferentes:

```typescript
// apps/web/src/app/(platform)/chamados/page.tsx

export default async function ChamadosPage() {
  const session = await getProtectedSession();

  // Admin/Suporte veem TODOS os chamados
  // Cliente vee apenas os proprios
  const canViewAll = hasPermission(session.role, "tickets:view_all");

  const tickets = canViewAll
    ? await getAllTickets()
    : await getTicketsByUser(session.userId);

  return <TicketList tickets={tickets} canManage={hasPermission(session.role, "tickets:manage")} />;
}
```

---

## 4. Mapeamento de Migracao

### 4.1 Onde Cada Arquivo Vai

```
ORIGEM (atual)                          →  DESTINO (monorepo)
=================================================================

# CORE (Domain + Application)
src/core/domain/                        →  packages/core/src/domain/
src/core/application/schemas/           →  packages/core/src/application/schemas/
src/core/application/dto/               →  packages/core/src/application/dto/
src/core/application/use-cases/         →  packages/core/src/application/use-cases/
src/core/config/permissions.ts          →  packages/core/src/config/permissions.ts
src/core/constants/                     →  packages/core/src/constants/
src/core/types/                         →  packages/core/src/types/
src/lib/rbac.ts                         →  packages/core/src/rbac.ts

# UTILS
src/lib/formatters.ts                   →  packages/utils/src/formatters.ts
src/lib/date.ts                         →  packages/utils/src/date.ts
src/lib/utils.ts (cn function)          →  packages/utils/src/cn.ts
src/core/shared/utils/                  →  packages/utils/src/

# UI (Design System)
src/components/ui/*                     →  packages/ui/src/primitives/
                                           (Button, Input, Card, Dialog, etc)

# WEB APP
src/app/(autenticacao)/                 →  apps/web/src/app/(auth)/
src/app/(site)/                         →  apps/web/src/app/(site)/
src/app/(platform)/admin/*              →  apps/web/src/app/(platform)/*  (UNIFICADO)
src/app/(platform)/app/*                →  apps/web/src/app/(platform)/*  (MERGE)
src/app/docs/                           →  apps/web/src/app/docs/
src/app/api/                            →  apps/web/src/app/api/
src/middleware.ts                        →  apps/web/src/middleware.ts
src/lib/auth.ts                         →  apps/web/src/lib/auth.ts
src/lib/auth-client.ts                  →  apps/web/src/lib/auth-client.ts
src/lib/auth-helpers.ts                 →  apps/web/src/lib/auth-helpers.ts
src/lib/prisma.ts                       →  apps/web/src/lib/prisma.ts
src/lib/email.ts                        →  apps/web/src/lib/email.ts
src/lib/zammad-client.ts               →  apps/web/src/lib/zammad-client.ts
src/actions/                            →  apps/web/src/actions/
src/hooks/                              →  apps/web/src/hooks/
src/providers/                          →  apps/web/src/providers/
prisma/                                 →  apps/web/prisma/

# COMPONENTES UNIFICADOS
src/components/platform/admin/          →  apps/web/src/components/modules/
src/components/platform/app/            →  (merge com modules/)
src/components/platform/shared/         →  apps/web/src/components/shared/
src/components/auth/                    →  apps/web/src/components/auth/

# LAYOUT UNIFICADO (novo)
src/components/platform/admin/admin-layout/  →  apps/web/src/components/layout/
src/components/platform/app/app-layout/      →  (merge em layout/)

# CONFIG
tailwind.config.ts                      →  packages/config/tailwind/
tsconfig.json                           →  packages/config/typescript/
next.config.mjs                         →  apps/web/next.config.mjs

# CONTEUDO
content/                                →  apps/web/content/
public/                                 →  apps/web/public/
```

### 4.2 Resolucao de Imports

**Antes:**
```typescript
import { hasPermission } from "@/lib/rbac";
import { SYSTEM_PERMISSIONS } from "@/core/config/permissions";
import { Button } from "@/components/ui/button";
import { formatCNPJ } from "@/lib/formatters";
```

**Depois:**
```typescript
import { hasPermission } from "@cadens/core/rbac";
import { SYSTEM_PERMISSIONS } from "@cadens/core/config/permissions";
import { Button } from "@cadens/ui/button";
import { formatCNPJ } from "@cadens/utils/formatters";
```

### 4.3 Configuracao de Packages

**`packages/core/package.json`:**
```json
{
  "name": "@cadens/core",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./rbac": "./src/rbac.ts",
    "./config/*": "./src/config/*.ts",
    "./schemas/*": "./src/application/schemas/*.ts",
    "./entities/*": "./src/domain/entities/*.ts",
    "./constants/*": "./src/constants/*.ts",
    "./types/*": "./src/types/*.ts"
  },
  "dependencies": {
    "zod": "^4.1.13"
  }
}
```

**`packages/ui/package.json`:**
```json
{
  "name": "@cadens/ui",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    "./*": "./src/primitives/*.tsx"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "dependencies": {
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-tooltip": "^1.2.8",
    "class-variance-authority": "^0.7.1",
    "lucide-react": "^0.483.0"
  }
}
```

**`packages/utils/package.json`:**
```json
{
  "name": "@cadens/utils",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./formatters": "./src/formatters.ts",
    "./date": "./src/date.ts",
    "./cn": "./src/cn.ts",
    "./validators": "./src/validators.ts"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.4.0",
    "date-fns": "^4.1.0"
  }
}
```

---

## 5. Fases de Implementacao

### Fase 1: Setup Monorepo + Unificacao de Rotas (Prioridade)

**Objetivo:** Reestruturar para monorepo e eliminar duplicacao admin/app.

**Etapas:**

1. **Setup do workspace**
   - Inicializar Turborepo na raiz
   - Configurar pnpm workspaces
   - Criar `turbo.json`

2. **Extrair `packages/core`**
   - Mover `src/core/` para `packages/core/src/`
   - Mover `src/lib/rbac.ts` para `packages/core/src/`
   - Expandir permissoes (novas permissions para modulos unificados)
   - Configurar exports no `package.json`

3. **Extrair `packages/utils`**
   - Mover `src/lib/formatters.ts`, `src/lib/date.ts`, `src/lib/utils.ts`
   - Mover `src/core/shared/utils/`

4. **Extrair `packages/ui`**
   - Mover `src/components/ui/` para `packages/ui/src/primitives/`

5. **Extrair `packages/config`**
   - Criar base configs para TypeScript, ESLint, Tailwind

6. **Criar `apps/web`**
   - Mover aplicacao Next.js para `apps/web/`
   - Atualizar imports para usar `@cadens/*`

7. **Unificar rotas**
   - Eliminar `(platform)/admin/` e `(platform)/app/`
   - Criar `(platform)/` unico com guards RBAC por pagina
   - Criar layout unificado `PlatformShell`
   - Criar `buildNavigationForRole()`

8. **Merge de componentes**
   - Unificar `AdminSidebar` + `ClientSidebar` -> `PlatformSidebar`
   - Unificar `AdminHeader` + `ClientHeader` -> `PlatformHeader`
   - Unificar `DashboardStats` (admin + app) -> Um unico com conteudo adaptativo

### Fase 2: Mobile App

**Objetivo:** Criar app React Native + Expo consumindo `@cadens/core` e `@cadens/utils`.

**Etapas:**
1. Criar `apps/mobile/` com Expo SDK
2. Configurar React Native para consumir packages do workspace
3. Implementar telas: Login, Dashboard, Chamados, Perfil
4. Reutilizar schemas Zod, DTOs, entities do `@cadens/core`

### Fase 3: API Backend Dedicado

**Objetivo:** Extrair logica de API para NestJS independente.

**Etapas:**
1. Criar `apps/api/` com NestJS
2. Migrar API Routes do Next.js para controllers NestJS
3. Mover Prisma para `packages/database` compartilhado
4. Implementar autenticacao JWT para mobile
5. `apps/web` consome a API ao inves de Server Actions para rotas compartilhadas

---

## 6. Beneficios da Reestruturacao

### 6.1 Eliminacao de Duplicacao

| Metrica | Antes | Depois | Reducao |
|---------|-------|--------|---------|
| Paginas duplicadas | 14 | 0 | -100% |
| Layouts | 2 | 1 | -50% |
| Sidebars | 2 | 1 | -50% |
| Headers | 2 | 1 | -50% |
| DashboardStats | 2 | 1 | -50% |
| Total paginas platform | 32 | ~18 | -44% |

### 6.2 Compartilhamento entre Plataformas

| Package | Web | Mobile | API |
|---------|-----|--------|-----|
| `@cadens/core` (regras, schemas, RBAC) | Sim | Sim | Sim |
| `@cadens/utils` (formatters, helpers) | Sim | Sim | Sim |
| `@cadens/ui` (design system) | Sim | Parcial* | Nao |
| `@cadens/config` (TS, ESLint) | Sim | Sim | Sim |

*Mobile usa React Native, entao apenas logica/tokens do design system.

### 6.3 Experiencia de Desenvolvimento

- **Build incremental:** Turborepo cacheia builds - so reconstroi o que mudou
- **Desenvolvimento paralelo:** Equipes podem trabalhar em `apps/web`, `apps/mobile`, `packages/core` independentemente
- **Type safety cross-package:** TypeScript paths garantem consistencia
- **Single source of truth:** Permissoes, schemas e entidades definidos uma vez

### 6.4 Evolucao do Controle de Acesso

**Antes:** Acesso definido pela URL (`/admin` vs `/app`)
**Depois:** Acesso definido pela **permissao do usuario** - mesma URL, conteudo adaptativo

Isso permite cenarios como:
- Um `CLIENTE_ADMIN` que ganha acesso a ferramenta especifica sem mudar de area
- Um `SUPORTE` que vee chamados de todos os clientes na mesma interface
- Novos roles adicionados editando apenas a `ACCESS_MATRIX`, sem criar rotas

---

## 7. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| Quebra de imports durante migracao | Alto | Fazer migracao arquivo por arquivo com testes |
| Regressao visual (layouts unificados) | Medio | Screenshots antes/depois de cada role |
| Performance do Turborepo em CI | Baixo | Configurar Remote Caching (Vercel) |
| Complexidade do pnpm workspaces | Baixo | Documentar setup e scripts |
| Prisma em monorepo | Medio | Manter Prisma em `apps/web` inicialmente, mover para `packages/database` na Fase 3 |
| Better Auth em contexto multi-app | Medio | Manter auth centralizado em `apps/web`, mobile usa tokens JWT |

---

## 8. Dependencias entre Packages

```
apps/web
  ├── @cadens/core      (regras de negocio, RBAC, schemas)
  ├── @cadens/ui        (componentes de interface)
  ├── @cadens/utils     (formatters, helpers)
  └── @cadens/config    (tsconfig, eslint, tailwind)

apps/mobile (Fase 2)
  ├── @cadens/core
  ├── @cadens/utils
  └── @cadens/config

apps/api (Fase 3)
  ├── @cadens/core
  ├── @cadens/utils
  └── @cadens/config

packages/ui
  ├── @cadens/utils     (cn, formatters)
  └── @cadens/config    (tailwind preset)

packages/core
  └── (sem dependencias internas - standalone)

packages/utils
  └── (sem dependencias internas - standalone)
```

---

## 9. Checklist de Migracao - Fase 1

- [ ] Inicializar raiz com Turborepo + pnpm
- [ ] Criar `packages/core/` com domain, schemas, RBAC expandido
- [ ] Criar `packages/utils/` com formatters, date, cn
- [ ] Criar `packages/ui/` com componentes shadcn/radix
- [ ] Criar `packages/config/` com TS, ESLint, Tailwind presets
- [ ] Mover Next.js app para `apps/web/`
- [ ] Atualizar todos os imports para `@cadens/*`
- [ ] Eliminar rotas `/admin` e `/app`
- [ ] Criar rota unica `/(platform)/*`
- [ ] Criar `PlatformShell` (layout unificado)
- [ ] Criar `buildNavigationForRole()` (sidebar dinamica)
- [ ] Adicionar guards RBAC por pagina
- [ ] Unificar componentes duplicados (Sidebar, Header, DashboardStats)
- [ ] Testar todos os roles (DEVELOPER, ADMIN, SUPORTE, CLIENTE_ADMIN, CLIENTE_USER)
- [ ] Verificar middleware com nova estrutura
- [ ] Atualizar scripts de deploy (Vercel)
- [ ] Atualizar CI/CD pipeline
