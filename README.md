Aqui está o arquivo **`README.md`** atualizado e profissional, refletindo a arquitetura moderna (Clean Architecture) que implementamos, com as explicações sobre a responsabilidade de cada camada (UI, Hooks, Core) e as novas integrações (Zammad, Email).

Você pode copiar e colar este conteúdo na raiz do seu projeto.

-----

# 🚀 Syspro ERP - Plataforma SaaS Multi-tenant

**Desenvolvido por Trilink Software**

O **Syspro ERP** é uma plataforma de gestão empresarial (SaaS) focada em manufatura, distribuição e gestão financeira. Este projeto utiliza uma arquitetura moderna baseada em **Next.js App Router**, **Clean Architecture** para regras de negócio complexas e **Multi-tenancy** via vínculo de membros.

-----

## 🛠 Tech Stack

  * **Framework:** [Next.js 14+](https://nextjs.org/) (App Router & Server Actions)
  * **Linguagem:** TypeScript
  * **Banco de Dados:** PostgreSQL (via [Supabase](https://supabase.com/))
  * **ORM:** [Prisma](https://www.prisma.io/)
  * **Autenticação:** Better Auth (Scrypt Hashing)
  * **Estilização:** Tailwind CSS + ShadcnUI + Magic UI
  * **Arquitetura:** Clean Architecture & MVVM (Model-View-ViewModel)
  * **Integrações:** Zammad (Helpdesk/Suporte)

-----

## 🧠 Arquitetura do Projeto

O projeto segue uma estrutura híbrida que separa a camada de apresentação (Next.js) do núcleo da aplicação (Core/Domain). Seguimos o princípio de **Separação de Responsabilidades**:

1.  **UI (Components):** Responsável apenas por **COMO** as coisas aparecem (JSX, Tailwind, Ícones). São componentes "burros" que recebem dados via props.
2.  **Logic (Hooks):** Responsável por **O QUE** a tela faz (Gerencia Estados `useState`, Loading, chama a função, trata erro `try/catch`).
3.  **Core (Gateways/Actions):** Responsável por **QUEM** resolve o problema (API Externa, Banco de Dados, Regras de Negócio, Cálculos).

### Estrutura de Pastas

```text
src/
├── actions/                  # Server Actions (Controllers) - O Backend do Next.js
│   ├── admin/                # Ações exclusivas de Admin (Gestão de Empresas, Usuários)
│   ├── auth/                 # Ações de Registro (autenticação é via API route)
│   └── tickets/              # Ações unificadas de Suporte (Zammad Integration)
│
├── app/                      # Roteamento (Next.js App Router)
│   ├── (auth)/               # Rotas públicas (Login, Register, Recover)
│   ├── (platform)/           # Rotas protegidas (Layout com Sidebar)
│   │   ├── admin/            # Painel do Super Admin
│   │   └── app/              # Painel do Cliente (Tenant)
│   └── api/                  # Webhooks e Rotas de API (Auth, Zammad Hooks)
│
├── components/               # Camada de Apresentação (UI)
│   ├── platform/             # Componentes de Negócio (TicketChat, UserTab, CompanyForm)
│   └── ui/                   # Componentes Base (Button, Input, Dialog - Shadcn)
│
├── core/                     # O Coração da Aplicação (Regras Puras)
│   ├── application/          # DTOs e Schemas de Validação (Zod)
│   ├── infrastructure/       # Implementações Técnicas
│   │   └── gateways/         # Adaptadores para APIs (ZammadGateway, AuthGateway)
│   └── config/               # Configurações Estáticas (Permissões RBAC)
│
├── hooks/                    # Camada de Lógica de Estado (Client-Side)
│   ├── use-ticket-chat.ts    # Ex: Lógica de envio, scroll e user identification
│   └── use-address-lookup.ts # Ex: Busca de CEP automática
│
└── lib/                      # Configurações de bibliotecas (Prisma, Utils, Auth Client)
```

-----

## Como Rodar o Projeto

### 1. Pré-requisitos

Certifique-se de ter o Node.js instalado (v18 ou superior).

### 2. Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-repo/syspro.git

# Instale as dependências
npm install
```

### 3. Configuração de Ambiente (.env)

Crie um arquivo `.env` na raiz baseado nas chaves necessárias:

```env
# Banco de Dados (Supabase)
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host:5432/db"

# Autenticação (Better Auth)
BETTER_AUTH_SECRET="sua-chave-secreta-gerada"
BETTER_AUTH_URL="http://localhost:3000" # Em produção: https://seu-dominio.com

# Integração Zammad (Suporte)
ZAMMAD_URL="https://suporte.suaempresa.com.br"
ZAMMAD_TOKEN="seu-token-de-agente"

# Envio de E-mail (Gmail SMTP)
GMAIL_USER="seu-email@gmail.com"
GMAIL_PASS="sua-senha-de-app"
```

### 4. Iniciar o Servidor

```bash
npm run dev
```

O sistema estará rodando em `http://localhost:3000`.

-----

## 🗄️ Gerenciamento do Banco de Dados (Prisma)

### Em Desenvolvimento

**1. Aplicar mudanças no Schema:**
Use este comando sempre que alterar o `schema.prisma`.

```bash
npx prisma migrate dev --name descricao_da_mudanca
```

**2. Gerar tipagem (Se o TS reclamar):**

```bash
npx prisma generate
```

**3. Visualizar o banco (Admin Visual):**

```bash
npx prisma studio
```

### Em Produção (Vercel/Deploy)

O comando de build já deve incluir o `prisma generate`, mas para aplicar migrações no banco de produção:

```bash
npx prisma migrate deploy
```

-----

## Controle de Acesso (RBAC)

O sistema utiliza um modelo de permissões estático e performático definido em `src/core/config/permissions.ts`.

  * **ADMIN:** Acesso irrestrito (Visão Global).
  * **DEVELOPER:** Acesso Restrito visão somente dos tickets de desenvolviment.
  * **SUPORTE:** Acesso a chamados e visualização básica de cadastros.
  * **CLIENTE_ADMIN:** Gestão total da própria empresa (cria usuários, vê contratos).
  * **CLIENTE_USER:** Acesso operacional limitado.

### Fluxo de Cadastro

1.  **Novo Cliente:** Criado via Painel Admin (Action `createCompany`).
2.  **Novo Usuário:**
      * Pode ser criado pelo Admin (vinculado a qualquer empresa).
      * Pode ser convidado pelo Gestor do Cliente (vinculado apenas à empresa dele).
3.  **Multi-Tenant:** Um mesmo e-mail pode ser vinculado a múltiplas empresas (tabela `Membership`).

-----

## Contato e Suporte

**Trilink Software**

  * **Suporte Técnico:** [rafael@trilinksoftware.com.br](mailto:rafael@trilinksoftware.com.br)
  * **Telefone:** +55 (34) 99771-3731
  * **Site:** [www.trilinksoftware.com.br](https://www.trilinksoftware.com.br)
  * **Horário:** Segunda a Sexta, das 8h às 18h.

-----

> **Nota para Desenvolvedores:**
> Ao criar novas funcionalidades, evite colocar lógica de negócio (regras, cálculos, chamadas de API) dentro dos arquivos `page.tsx` ou componentes visuais. Crie um **Hook** para o estado e uma **Server Action/Gateway** para o processamento de dados.