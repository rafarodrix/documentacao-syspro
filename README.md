# Trilink Syspro Platform

**Plataforma SaaS de Gestão Unificada — Monorepo Enterprise**

> **Desenvolvido por Trilink Software**

O **Syspro Platform** é um ecossistema completo para gestão empresarial (ERP), manufatura e operações financeiras. Projetado com foco em escalabilidade, segurança e multi-tenancy, o sistema unifica operações web e mobile em uma arquitetura limpa e desacoplada.

---

## 🛠 Tech Stack

| Categoria | Tecnologias |
| :--- | :--- |
| **Apps** | [Next.js 15+](https://nextjs.org/) (Web), [React Native](https://reactnative.dev/) (Mobile/Expo) |
| **Core/API** | [NestJS](https://nestjs.com/) (Backend), Node.js |
| **Linguagem** | TypeScript (Estrito) |
| **Banco de Dados** | PostgreSQL (via [Supabase](https://supabase.com/)) |
| **ORM** | [Prisma](https://www.prisma.io/) |
| **Autenticação** | Better Auth (Sessão Centralizada) |
| **Arquitetura** | Clean Architecture + DDD (Domain-Driven Design) |
| **UI** | Tailwind CSS, ShadcnUI, Magic UI |

---

## Arquitetura do Monorepo

O projeto utiliza **Turborepo** para gerenciar múltiplos aplicativos e pacotes compartilhados.

```text
syspro-platform/
├── apps/
│   ├── web/                # Portal Web (Next.js - Admin & Cliente)
│   ├── api/                # API Gateway & Core (NestJS)
│   └── mobile/             # App Mobile (React Native + Expo)
│
├── packages/
│   ├── core/               # O Cérebro: Entidades, UseCases e Regras de Negócio (Puro TS)
│   ├── ui/                 # Design System: Componentes React compartilhados (Web/Native)
│   ├── database/           # Prisma Schema e Clientes de Banco
│   ├── config/             # ESLint, TSConfig, Tailwind Presets
│   └── api-client/         # SDK tipado para consumir a API no Front/Mobile
│
├── infra/
│   ├── docker/             # Containers (Redis, Postgess para dev)
│   └── scripts/            # Automação de CI/CD e Seeds
│
└── README.md               # Documentação Geral
````

-----

## Design da Arquitetura

A plataforma segue rigorosamente a **Clean Architecture** para garantir que as regras de negócio independam de frameworks.

### 1. Camada de Domínio (`packages/core`)

É o núcleo agnóstico da aplicação.

  * **Entidades & Value Objects:** Modelam o negócio (ex: `Ticket`, `Contract`, `CNPJ`).
  * **Use Cases:** Executam as regras (ex: `CreateCompanyUseCase`, `CalculateTax`).
  * **Interfaces:** Definem contratos para Repositórios e Gateways.
  * *Não possui dependência de NestJS, Next.js ou React.*

### 2. Backend API (`apps/api` - NestJS)

Responsável pela infraestrutura e exposição dos dados.

  * **Controllers:** Rotas REST/GraphQL.
  * **Auth & RBAC:** Guardiões de segurança e Multi-tenant.
  * **Workers:** Processamento de filas (BullMQ) e CronJobs.
  * **Integrações:** Conexão com Zammad, E-mail, Pagamentos.

### 3. Frontend Web (`apps/web` - Next.js)

Focado exclusivamente na experiência do usuário.

  * **BFF (Backend for Frontend):** Server Actions para orquestração leve.
  * **UI:** Dashboards, Tabelas, Formulários (React Hook Form + Zod).
  * **Consumo:** Utiliza o `@packages/api-client` para falar com o NestJS.

### 4. Mobile (`apps/mobile` - React Native)

Para operações em campo e acesso do cliente final.

  * Visualização de Chamados.
  * Aprovações e Notificações Push.
  * Scanner de QR Code/NFC.

-----

## Segurança e Acesso (RBAC)

O sistema implementa **Multi-tenancy** lógico.

  * **User:** A conta de acesso (E-mail/Senha).
  * **Company:** O Tenant (Cliente).
  * **Membership:** O vínculo `User <-> Company` com um cargo específico (`Role`).

**Perfis de Acesso (Roles):**

1. **ADMIN:** Acesso global (God Mode).
2. **SUPORTE/DEVELOPER:** Acesso à gestão de tickets e visualização de empresas.
3. **CLIENTE_ADMIN:** Gestor da empresa (pode criar usuários, ver financeiro).
4. **CLIENTE_USER:** Acesso operacional limitado.

-----

## Integrações Ativas

| Integração | Função | Status |
| :--- | :--- | :--- |
| **Zammad** | Central de Tickets e Helpdesk | ✅ Ativo |
| **Gmail SMTP** | Envio de e-mails transacionais | ✅ Ativo |
| **Supabase** | Banco de Dados Gerenciado | ✅ Ativo |
| **Better Auth** | Autenticação e Sessão | ✅ Ativo |

-----

## Como Rodar o Projeto

### 1\. Instalação

```bash
npm install
```

### 2\. Banco de Dados

Certifique-se de que o `.env` está configurado e rode as migrações:

```bash
npx prisma migrate dev
```

### 3\. Executando os Apps (Turbo)

Para rodar tudo simultaneamente em modo de desenvolvimento:

```bash
npm run dev
```

Ou rode individualmente:

  * **Web:** `cd apps/web && npm run dev` (Porta 3000)
  * **API:** `cd apps/api && npm run start:dev` (Porta 3001)
  * **Mobile:** `cd apps/mobile && npm start` (Expo)

-----

## Roadmap de Evolução

### Fase 1 — Consolidação (Atual)

  * [x] Autenticação Robusta
  * [x] Multi-tenant (Empresas e Usuários)
  * [x] Integração Zammad (Tickets)
  * [x] UI/UX Profissional (Shadcn)

### Fase 2 — Financeiro e Expansão

  * [ ] Módulo de Contratos
  * [ ] Faturamento Recorrente
  * [ ] App Mobile para Técnicos
  * [ ] Filas de Processamento (Background Jobs)

### Fase 3 — Inteligência

  * [ ] Chatbot com RAG (IA) para suporte nível 1
  * [ ] Dashboards de BI automáticos
  * [ ] Automação Fiscal

-----

## Suporte e Contato

**Trilink Software**

  * **E-mail:** [rafael@trilinksoftware.com.br](mailto:rafael@trilinksoftware.com.br)
  * **Site:** [trilinksoftware.com.br](https://trilinksoftware.com.br)
  * **Telefone:** (34) 99771-3731
