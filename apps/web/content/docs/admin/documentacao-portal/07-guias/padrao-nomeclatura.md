# Guia: Padrão de Nomenclatura

> Convenções de nomes adotadas no monorepo. Atualizado em: 2026-05-05

---

## TypeScript / Node.js

| Item                  | Convenção         | Exemplo                              |
|-----------------------|-------------------|--------------------------------------|
| Arquivos              | `kebab-case`      | `remote-host-admin.port.ts`          |
| Classes               | `PascalCase`      | `RemoteHostAdminPort`                |
| Interfaces e tipos    | `PascalCase`      | `ProcessHeartbeatInput`              |
| Funções e métodos     | `camelCase`       | `createRemoteHostAdminPort`          |
| Variáveis e consts    | `camelCase`       | `agentToken`, `lastHeartbeatAt`      |
| Enums (nome)          | `PascalCase`      | `RemoteHostStatus`                   |
| Enums (valores)       | `SCREAMING_SNAKE` | `ROTATE_TOKEN_REQUIRED`              |
| Schemas Zod           | `<Nome>Schema`    | `HeartbeatPayloadV1Schema`           |
| Tipos inferidos Zod   | `type <Nome>`     | `type HeartbeatPayloadV1`            |

---

## Go

| Item                  | Convenção          | Exemplo                        |
|-----------------------|--------------------|--------------------------------|
| Arquivos              | `snake_case`       | `portal_client.go`             |
| Tipos e structs       | `PascalCase`       | `BootstrapInput`               |
| Funções exportadas    | `PascalCase`       | `ProcessHeartbeat`             |
| Funções internas      | `camelCase`        | `buildConfig`                  |
| Variáveis             | `camelCase`        | `agentToken`                   |
| Sufixos de plataforma | `_windows.go`      | `rustdesk_windows.go`          |
| Sufixos de plataforma | `_other.go`        | `rustdesk_other.go` (não-Win)  |

---

## Banco de dados (Prisma)

| Item               | Convenção          | Exemplo                        |
|--------------------|--------------------|--------------------------------|
| Modelos            | `PascalCase`       | `RemoteHost`, `CompanyContact` |
| Campos             | `camelCase`        | `lastHeartbeatAt`, `rustdeskId`|
| Enums (nome)       | `PascalCase`       | `RemoteHostStatus`             |
| Enums (valores)    | `SCREAMING_SNAKE`  | `ACTIVE`, `SESSION_BUSY`       |
| Tabelas geradas    | `snake_case`       | `remote_host`, `company_contact` (automático) |

---

## API REST (NestJS)

| Item                  | Convenção       | Exemplo                        |
|-----------------------|-----------------|--------------------------------|
| Prefixo de rota       | `kebab-case`    | `/remote-admin/`, `/companies/`|
| Parâmetros de rota    | `camelCase`     | `/:hostId`, `/:companyId`      |
| Query params          | `camelCase`     | `?pageSize=10&companyId=...`   |

---

## Packages do monorepo

| Item                  | Convenção              | Exemplo                          |
|-----------------------|------------------------|----------------------------------|
| Nome de package       | `@dosc-syspro/<nome>`  | `@dosc-syspro/remote-domain`     |
| Nome de diretório     | `kebab-case`           | `packages/remote-domain/`        |

---

## Features do Web (Next.js)

| Item                  | Convenção       | Exemplo                        |
|-----------------------|-----------------|--------------------------------|
| Diretório de feature  | `kebab-case`    | `src/features/remote/`         |
| Componentes React     | `PascalCase`    | `RemoteHostCard.tsx`           |
| Hooks                 | `use` prefix    | `useRemoteHosts.ts`            |
| Server actions        | `camelCase`     | `createTicketAction.ts`        |
| Rotas Next.js         | `kebab-case`    | `/portal/infraestrutura/hosts` |

---

## Regras de bom senso

1. **Seja descritivo**: `createRemoteHostAdminPort` > `createPort`
2. **Evite abreviações**: `company` > `co`, `authentication` > `auth` é OK porque é universal
3. **Verbos para funções**: `processHeartbeat`, `buildToken`, `resolveScope`
4. **Substantivos para tipos**: `RemoteHost`, `AgentToken`, `SessionStatus`
5. **Sufixo de papel para arquivos**: `.service.ts`, `.controller.ts`, `.port.ts`, `.module.ts`
