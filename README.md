# Syspro ERP - Plataforma SaaS Multi-tenant

**Desenvolvido por Trilink Software**

O **Syspro ERP** é uma plataforma de gestão empresarial (SaaS) focada em manufatura, distribuição e gestão financeira. Este projeto utiliza uma arquitetura moderna baseada em **Next.js App Router**, **Clean Architecture** para regras de negócio complexas e **Multi-tenancy** via vínculo de membros.

-----

## Stack

  * **Framework:** [Next.js 14+](https://nextjs.org/) (App Router & Server Actions)
  * **Linguagem:** TypeScript
  * **Banco de Dados:** PostgreSQL (via [Supabase](https://supabase.com/))
  * **ORM:** [Prisma](https://www.prisma.io/)
  * **Autenticação:** Better Auth
  * **Estilização:** Tailwind CSS + ShadcnUI
  * **Arquitetura:** Clean Architecture & DDD (Domain-Driven Design)
  * **Integrações:** Zammad (Helpdesk)

-----

## Estrutura do Projeto

O projeto segue uma estrutura híbrida que separa a camada de apresentação (Next.js) do núcleo da aplicação (Core/Domain).

UI (Componente): Só deve se preocupar com COMO as coisas aparecem (JSX, Tailwind, Ícones). Ele deve ser "burro".
Logic (Custom Hook): Só deve se preocupar com O QUE a tela faz (Estados, Loading, chama a função, trata erro).
Core (Gateway/Services): Só deve se preocupar com QUEM resolve o problema (API, Banco de Dados, Cálculos).

```text
src/
├── actions/                  # Server Actions (Controllers) - Ponto de entrada do Backend
│   ├── auth/                 # Login, Registro, Logout
│   ├── admin/                # Ações do Super Admin (Global)
│   ├── app/                  # Ações dos Usuários/Clientes (Tenants)
│   └── tickets/              # Ações compartilhadas (ex: Zammad)
│
├── app/                      # Roteamento e UI (Next.js App Router)
│   ├── (auth)/               # Rotas públicas (Login, Register) - Sem Sidebar
│   ├── (platform)/           # Rotas protegidas
│   │   ├── admin/            # Painel do Super Admin (Gestão de Saas)
│   │   └── app/              # Painel do Cliente (Dashboard, Equipe, Configs)
│   └── api/                  # Webhooks e rotas REST externas
│
├── components/               # Componentes UI Reutilizáveis
│   ├── ui/                   # ShadcnUI (Botões, Inputs)
│   └── ...                   # Componentes específicos
│
├── core/                     # Clean Architecture (Regras de Negócio Puras)
│   ├── application/          # Use Cases e Schemas (Zod)
│   ├── domain/               # Entidades e Interfaces do Domínio
│   ├── infrastructure/       # Implementações (Gateways, Mappers, Services Externos)
│   └── config/               # Permissões e Configurações estáticas
│
├── lib/                      # Configurações de bibliotecas (Prisma Client, Utils)
└── prisma/                   # Schema do Banco de Dados e Migrations
```

-----

## Como Rodar o Projeto

### Pré-requisitos

Certifique-se de ter o Node.js instalado (v18 ou superior).

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-repo/syspro.git

# Instale as dependências
npm install
```

### 3\. Configuração de Ambiente (.env)

Crie um arquivo `.env` na raiz baseado no `.env.example`:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host:5432/db"
BETTER_AUTH_SECRET="sua-chave-secreta"
# Outras chaves (Zammad, AWS, etc.)
```

### 4\. Iniciar o Servidor

```bash
npm run dev
```

O sistema estará rodando em `http://localhost:3000`.

-----

## Gerenciamento do Banco de Dados (Prisma)

Como utilizamos PostgreSQL com Prisma, siga os comandos abaixo dependendo do cenário:

### Em Desenvolvimento (Local)

**1. Aplicar mudanças no Schema (Criar tabelas/colunas):**
Use este comando sempre que alterar o `schema.prisma`. Ele cria o arquivo de migração e aplica no banco.

```bash
npx prisma migrate dev
```

**2. Apenas gerar a tipagem (Se o VS Code reclamar de erro):**
Se você fez um `pull` do git e o código está vermelho, rode isso:

```bash
npx prisma generate
```

**3. Popular o banco (Seed):**
Para criar a empresa padrão e o usuário Admin inicial (conforme configurado em `prisma/seed.ts`):

```bash
npx prisma db seed
```

**4. Visualizar o banco (Admin Visual):**

```bash
npx prisma studio
```

### Em Produção

**1. Aplicar migrações:**

```bash
npx prisma migrate deploy
```

**2. Gerar cliente:**
Geralmente feito automaticamente no `build`, mas se necessário:

```bash
npx prisma generate
```

-----

## 🔐 Fluxos de Acesso e Permissões

O sistema possui uma divisão lógica de acessos baseada em **Roles** e **Tenancy**:

1.  **Rota `/register` (Público):**
      * Cria uma nova `Company` e um novo `User`.
      * Gera automaticamente um vínculo `Membership` com role `ADMIN`.
2.  **Rota `/admin` (Super Admin):**
      * Exclusivo para gestão da plataforma (Criar planos, banir empresas).
      * Requer permissão global.
3.  **Rota `/app` (Cliente):**
      * Área de trabalho da empresa.
      * Usuários `ADMIN` podem convidar novos membros em `/app/settings/team`.
      * Usuários `USER` acessam apenas suas funções permitidas.

-----

## Contato e Suporte

**Trilink Software**

  * **Suporte Técnico:** [rafael@trilinksoftware.com.br](mailto:rafael@trilinksoftware.com.br)
  * **Telefone/WhatsApp:** +55 (34) 99771-3731
  * **Site:** [www.trilinksoftware.com.br](https://www.google.com/search?q=http://www.trilinksoftware.com.br)
  * **Horário:** Segunda a Sexta, das 8h às 18h (Horário de Brasília).

-----

> **Nota:**
> Ao criar novas funcionalidades que envolvam lógica de negócio complexa (ex: Integração Zammad), utilize a pasta `src/core`. Evite colocar regras de negócio pesadas dentro dos componentes React ou Server Actions. As Actions devem apenas orquestrar a chamada para os Use Cases.