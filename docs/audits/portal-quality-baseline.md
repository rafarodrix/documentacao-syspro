# Baseline de Qualidade do Portal Trilink

**Data:** 2026-07-22  
**Escopo:** `apps/web`, `apps/api`, `apps/mobile`, `apps/agent`, `packages/*`

---

## 1. Inventário de Workspaces e Módulos

### 1.1 Aplicações (`apps/*`)
- **`apps/web` (`@dosc-syspro/web`)**: Next.js 15 App Router + Fumadocs MDX. Portal autenticado, operação de tickets, cadastros, infraestrutura, remoto, documentos, tax e BI.
- **`apps/api` (`@dosc-syspro/app-api`)**: Backend NestJS com suporte a REST, tRPC server, throttling e logger Pino.
- **`apps/agent`**: Agente local Windows em Go + Wails para integração com RustDesk, heartbeat e diagnóstico local.
- **`apps/mobile` (`@dosc-syspro/app-mobile`)**: Shell estrutural para futura expansão mobile.

### 1.2 Pacotes Compartilhados (`packages/*`)
- **`@dosc-syspro/contracts`**: Schemas Zod, tipos de transporte (DTOs) e interfaces de comunicação.
- **`@dosc-syspro/config`**: Leitor e validador de variáveis de ambiente e runtime.
- **`@dosc-syspro/core`**: Entidades de domínio puras, regras de negócio invariantes, enums e SLAS.
- **`@dosc-syspro/database`**: Schema Prisma, clientes gerados, migrações e scripts de higienização.
- **`@dosc-syspro/shared`**: Utilitários puros, formatadores, logs, tratamento de erros e auxiliares de autenticação.
- **`@dosc-syspro/ui`**: Componentes React genéricos (Primitives Shadcn/Radix) sem regra de negócio.
- **`packages/features/*`**: Módulos divididos em domain e infra:
  - `contacts` (`domain`, `infra`)
  - `crm` (`domain`, `infra`)
  - `remote` (`domain`, `infra`)
  - `tarefas` (`domain`, `infra`)
  - `tickets` (`domain`, `infra`)

---

## 2. Resultados da Suíte de Comandos (Baseline)

| Comando / Script | Status | Resultado / Evidência Principal |
| :--- | :---: | :--- |
| `npm run check:utf8` | ❌ Falha | Incompatibilidade de encoding em `apps/web/content/docs/admin/documentacao-portal/banco-dados/index.mdx` (caracteres `Ã`). |
| `npm run docs:check` | ❌ Falha | 80+ arquivos MDX sem metadados de tags no frontmatter; links quebrados em `tef-fiserve` e `revenda-frigorifico`. |
| `npm run lint` | ⚠️ Aprovado com Alertas | 0 erros fatais, 24+ warnings de cores brutas Tailwind (`bg-emerald-100`, `text-red-300`) no módulo tax. |
| `npm run typecheck` | ❌ Falha Parcial | Erro no Nest build/webpack do `@dosc-syspro/app-api` por vinculo de hooks externos (Console Ninja). Pacotes e web passam isoladamente. |
| `npm run test` | ❌ Falha Parcial | Falha no teste `tests/remote/directory-page.helpers.test.ts` por resolução do subpath `@dosc-syspro/shared/remote-operational-status`. |
| `npm run build` | ⚠️ Interrompido | Depende da correção de tipo e exportação do `@dosc-syspro/shared`. |
| `jscpd` | 📊 3.68% Duplicação | 529 clones, 6.585 linhas duplicadas (TS: 4.59%, TSX: 3.24%). |
| `knip` | 📊 Identificado | Dezenas de exportações e tipos não consumidos diretamente (ex: `RemoteAccessPolicy`, `TicketActionFailure`). |
| `npm audit` | ⚠️ 23 Vulnerabilidades | 1 Critical, 14 High, 7 Moderate, 1 Low (Next.js, Nodemailer, Sharp, Multer, Fast-XML-Builder, JS-YAML). |

---

## 3. Resumo de Duplicação (`jscpd`)

- **Total de Código Analisado:** 178.766 linhas / 1.028.096 tokens em 1.178 arquivos.
- **Duplicação Global:** 3.68% de linhas (4.19% de tokens).
- **Formatos Principais:**
  - TypeScript (`.ts`): 4.59% (3.462 linhas duplicadas em 302 blocos).
  - React/TypeScript (`.tsx`): 3.24% (2.172 linhas duplicadas em 151 blocos).
  - Go (`.go`): 0.93% (módulo `apps/agent`).

---

## 4. Segurança e Auditoria de Dependências (`npm audit`)

Vulnerabilidades identificadas em dependências diretas e transitivas:
1. **Next.js (`<15.5.15`)**: 14 vulnerabilidades de severidade Alta/Médias (DoS em Server Components, SSRF via WebSockets, bypass de middleware).
2. **Nodemailer (`<=9.0.0`)**: Injeção CRLF em cabeçalhos, bypass de restrição de arquivos locais.
3. **Sharp / Multer / Fast-XML-Builder**: Processamento de imagem/upload vulnerável a Negação de Serviço (DoS).
4. **JS-YAML / Kysely**: DoS por complexidade quadrática e injeção de caminho JSON.
