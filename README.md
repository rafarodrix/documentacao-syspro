# 📘 Trilink Syspro — Documentação Técnica & Portal do Cliente

Este repositório concentra **a documentação oficial, manuais operacionais e o portal do cliente do Syspro ERP**, desenvolvido pela **Trilink Software**.

O projeto foi construído com **Next.js 15 (App Router)**, **React 19** e **Fumadocs**, adotando **Clean Architecture + DDD** para garantir escalabilidade, organização e isolamento das regras de negócio em relação à interface.

Além de documentação, esta aplicação atua como **plataforma funcional**, integrando:

* Autenticação e controle de acesso
* Integrações fiscais (SEFAZ, XML, documentos)
* Portal do cliente
* Base para APIs e automações

---

## 🚀 Stack Tecnológica

### Core

* **Next.js 15.2** (App Router)
* **React 19**
* **TypeScript**
* **Clean Architecture + Domain Driven Design (DDD)**

### Documentação

* **Fumadocs (MDX)**
* **KaTeX / Remark Math** para fórmulas técnicas
* **Gray Matter** (front‑matter)

### UI / UX

* **Tailwind CSS 4**
* **Shadcn/UI + Radix UI**
* **Magic UI**
* **Framer Motion**
* **Lucide Icons**

### Backend & Infra

* **Prisma ORM**
* **PostgreSQL**
* **Better‑Auth + NextAuth**
* **Axios**
* **Fast XML Parser / xml2js**
* **jsPDF / jsPDF‑AutoTable**

---

## 📂 Estrutura de Pastas (Visão Geral)

```
.
├── content
├── prisma
├── public
├── src
│   ├── actions
│   ├── app
│   ├── components
│   ├── core
│   ├── data
│   ├── hooks
│   ├── lib
│   ├── providers
│   ├── middleware.ts
├── .env
├── package.json
├── README.md
```

Abaixo está o **detalhamento completo de cada pasta e seus papéis no projeto**.

---

## 📁 Raiz do Projeto

### `content/`

Fonte principal da **documentação em MDX**.

* Manuais do usuário
* Documentação fiscal
* Guias técnicos
* Tutoriais passo a passo

Este conteúdo é consumido diretamente pelo **Fumadocs**.

---

### `prisma/`

Responsável por **persistência de dados e versionamento do banco**.

* `schema.prisma` — Definição de modelos, enums e relacionamentos
* `migrations/` — Histórico de migrações do banco
* `seed.ts` — Dados iniciais (ambientes de dev/test)

Scripts disponíveis:

```bash
npm run db:migrate
npm run db:generate
```

---

### `public/`

Arquivos estáticos acessíveis diretamente:

* Logos
* Ícones
* Imagens
* Assets públicos

---

## 📁 `src/app` — Rotas & Navegação

Implementa o **App Router do Next.js**, organizado por **Route Groups**.

### Estrutura

* `(autenticacao)/`

  * Login
  * Recuperação de senha
  * Registro

* `(platform)/`

  * Área autenticada do cliente
  * Dashboards
  * Funcionalidades internas

* `(site)/`

  * Páginas públicas
  * Landing page
  * Contato / Institucional

* `api/`

  * API Routes
  * Webhooks
  * Integrações externas

* `docs/`

  * Rota base da documentação
  * Renderização dinâmica MDX via Fumadocs

### Arquivos globais

* `layout.tsx` — Layout raiz da aplicação
* `globals.css` — Estilos globais (Tailwind 4)
* `not-found.tsx` — Página 404

---

## 📁 `src/components` — UI por Contexto

Componentes React organizados **por domínio visual**, não por tipo genérico.

### Pastas

* `ui/`

  * Componentes base do Shadcn/UI
  * Button, Input, Dialog, Tabs, etc

* `auth/`

  * Formulários de autenticação
  * Guards visuais

* `docs/`

  * Componentes exclusivos para MDX
  * Callouts, Cards, Alertas

* `magicui/`

  * Animações avançadas
  * Bento Grid, Marquee, Motion blocks

* `platform/`

  * Componentes da área logada

* `site/`

  * Componentes do site público

* `sefaz/`

  * Visualização de XML
  * Componentes fiscais

### Arquivos de Base

* `providers.tsx` — Wrapper global de contextos
* `ThemeProvider.tsx` — Dark / Light mode
* `ModeToggle.tsx` — Alternador de tema

---

## 🧠 `src/core` — Coração da Aplicação

**Totalmente desacoplado do Next.js**.
Aqui vivem as **regras de negócio puras**.

### `application/`

Camada de **orquestração**.

* `use-cases/`

  * Casos de uso (regras aplicacionais)
  * Ex: `ConsultarDocumentoFiscal`, `AbrirTicket`

* `dto/`

  * Data Transfer Objects
  * Contratos de entrada e saída

* `schema/`

  * Schemas Zod
  * Validação de dados

---

### `domain/`

O **domínio do negócio**.

* `entities/`

  * Entidades ricas
  * Ex: Empresa, Documento, Usuário

* `interfaces/`

  * Contratos de repositórios e serviços

* `errors/`

  * Exceções do domínio

---

### `infrastructure/`

Implementações técnicas.

* `gateways/`

  * Integrações externas (SEFAZ, APIs)

* `mappers/`

  * Conversão DTO ↔ Entity

---

### Outros diretórios do Core

* `config/` — Permissões e regras globais
* `constants/` — Constantes do domínio
* `shared/` — Utilitários compartilhados
* `types/` — Tipagens globais

---

## ⚙️ Outras Pastas em `src/`

### `actions/`

* **Server Actions do Next.js**
* Mutação de dados
* Segurança no servidor

### `hooks/`

* Hooks React reutilizáveis

### `lib/`

* Utilitários gerais
* Prisma Client
* Axios Instances

### `providers/`

* Context Providers isolados

### `data/scripts/`

* Scripts manuais
* Processamentos auxiliares

### `middleware.ts`

* Controle de acesso
* Proteção de rotas

---

## 🛠 Scripts Disponíveis

| Script                | Descrição                   |
| --------------------- | --------------------------- |
| `npm run dev`         | Ambiente de desenvolvimento |
| `npm run build`       | Build de produção           |
| `npm run start`       | Start produção              |
| `npm run postinstall` | Gera Fumadocs + Prisma      |
| `npm run db:migrate`  | Migrações do banco          |
| `npm run db:generate` | Geração do Prisma Client    |

---

## 📌 Princípios do Projeto

* UI **não contém regra de negócio**
* Use Cases são a aplicação
* Domínio é independente de framework
* Documentação é código
* Escalável para Mobile e Backend dedicado

---

**Trilink Software — 2026**

> Este projeto é a base oficial de documentação e evolução contínua do Syspro ERP.
