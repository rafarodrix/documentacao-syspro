# Packages — Visão Geral e Mapa de Dependências

> Atualizado em: 2026-05-05

---

## Lista de packages

| Package                      | Versão | Linguagem       | Propósito                                         |
|------------------------------|--------|-----------------|---------------------------------------------------|
| `@dosc-syspro/contracts`     | —      | TypeScript/Zod  | Schemas e tipos compartilhados (porta de domínio) |
| `@dosc-syspro/remote-domain` | —      | TypeScript      | Lógica de domínio do módulo remoto (pura)         |
| `@dosc-syspro/remote-infra`  | —      | TypeScript      | Implementações das ports do remote-domain         |
| `@dosc-syspro/database`      | —      | TypeScript      | PrismaClient + tipos gerados                      |
| `@dosc-syspro/shared`        | —      | TypeScript      | Utilitários: formatadores, logger, auth helpers   |
| `@dosc-syspro/core`          | —      | TypeScript      | Entidades de negócio: tickets, releases, RBAC     |
| `@dosc-syspro/ui`            | —      | TypeScript/React| Componentes UI base (Radix UI)                    |
| `@dosc-syspro/config`        | —      | TypeScript      | Leitura de env vars com validação Zod             |

---

## Mapa de dependências

```
                    ┌──────────────┐
                    │  contracts   │ ← tipos Zod, sem deps internas
                    └──────┬───────┘
                           │ importado por
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────────┐  ┌──────────┐
    │  shared  │    │ remote-domain│  │   core   │
    └────┬─────┘    └──────┬───────┘  └────┬─────┘
         │                │               │
         │         ┌──────▼───────┐       │
         │         │ remote-infra │       │
         │         └──────┬───────┘       │
         │                │               │
         │         ┌──────▼───────┐       │
         │         │   database   │◄──────┤
         │         └──────────────┘       │
         │                                │
         └──────────────┬─────────────────┘
                        │ consumido por
              ┌─────────┴────────┐
              ▼                  ▼
           apps/api           apps/web
```

**Regras:**
- `contracts` não importa nenhum package interno
- `remote-domain` não importa `database`, `remote-infra` ou frameworks externos
- `remote-infra` implementa as interfaces de `remote-domain` usando `database`
- `database` exporta apenas o Prisma client — sem lógica de negócio
- `ui` é exclusivo do `apps/web` (dependências React)

---

## Como adicionar um novo package

1. Crie a pasta em `packages/<nome>/`
2. Adicione `package.json` com nome `@dosc-syspro/<nome>` e `"main": "./src/index.ts"`
3. Adicione `tsconfig.json` estendendo `../../tsconfig.base.json`
4. Registre no workspace root `package.json` se necessário
5. Importe nos apps/packages que precisam com `@dosc-syspro/<nome>`

> Ver `07-guias/novo-package.md` para passo a passo detalhado.
