# Regras de Dependência e Fronteiras Arquiteturais

## Matriz de Matriz de Workspaces

| Workspace | Responsabilidade Principal | Pode Depender De | NÃO Pode Depender De | Direção Esperada |
| :--- | :--- | :--- | :--- | :--- |
| **`apps/web`** | Interface visual, navegação, documentação MDX, Server Actions | `packages/contracts`, `packages/ui`, `packages/config`, `packages/shared`, `packages/core` | `apps/api`, `packages/database`, `@prisma/client` | Consumidor final de frontend |
| **`apps/api`** | Backend HTTP/tRPC, autenticação, autorização central, adapters NestJS | `packages/application`, `packages/domain`, `packages/contracts`, `packages/database`, `packages/config`, `packages/shared`, `packages/core` | `apps/web`, componentes React | Provedor de API e serviços de backend |
| **`packages/domain`** / `packages/core` | Entidades puras, objetos de valor e regras invariantes de negócio | Nenhum framework ou biblioteca externa de I/O | NestJS, Next.js, Prisma, React, Express, Axios | Núcleo puro sem dependências |
| **`packages/application`** / `packages/features/*/domain` | Casos de uso e orquestração de negócios | `packages/domain`, `packages/contracts` | Controllers NestJS, React, Prisma diretamente | Camada de orquestração desacoplada |
| **`packages/database`** | Persistência, schema Prisma, repositórios e migrações | Prisma, `packages/domain` | `apps/web`, `packages/ui`, React, Next.js | Infraestrutura de dados |
| **`packages/contracts`** | Schemas DTO (Zod), validação de fronteira, interfaces de transporte | Zod | Prisma, Next.js, NestJS, React, `packages/ui` | Contratos tipados e imutáveis |
| **`packages/ui`** | Componentes visuais reutilizáveis (Design System) | Tailwind, Radix UI, Lucide | `packages/database`, APIs do backend, regras de negócio | Apresentação pura |
| **`packages/shared`** | Formatadores, utilitários puros de data/moeda, loggers | Utilitários agnósticos | UI, Prisma, Controllers, Next Router | Utilitários agnósticos |

---

## Regras Fundamentais do Monorepo

1. **Separação Frontend/Backend**:
   - `apps/web` NUNCA pode importar diretamente de `apps/api` (exceto tipos DTO exportados via `@dosc-syspro/contracts`).
   - `apps/api` NUNCA pode importar componentes ou arquivos do `apps/web`.

2. **Isolamento de Pacotes**:
   - Nenhum pacote dentro de `packages/*` pode importar de `apps/*`.
   - Importações entre pacotes devem usar exclusivamente a API pública declarada no `package.json` (`exports`).
   - Proibido uso de deep imports privados como `@dosc-syspro/pacote/src/interno/...`.

3. **Invariantes por Camada**:
   - **Domain/Core**: Sem importação de Next.js, NestJS, React ou Prisma. Não realiza I/O de rede ou disco.
   - **Database**: Encapsula o client Prisma e expõe apenas interfaces/repositories.
   - **Contracts**: Schemas Zod versionados sem lógica operacional ou modelos internos expostos.
   - **UI**: Zero acesso a banco ou autorização; sem acoplamento a regras de negócio de empresas.
