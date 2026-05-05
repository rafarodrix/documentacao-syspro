# Package: @dosc-syspro/contracts

> Zod schemas e tipos TypeScript para todos os domínios do monorepo.
> Atualizado em: 2026-05-05

---

## Responsabilidade

`@dosc-syspro/contracts` é a **porta de domínio** do monorepo. Define schemas Zod e tipos TypeScript que:
- Validam dados em runtime nos boundaries de integração
- Garantem type safety entre apps (API ↔ Web)
- Servem como documentação viva dos contratos de dados

**Não contém lógica de negócio** — apenas schemas de validação e tipos.

---

## Subpaths exportados

O package usa exports condicionais (subpath imports):

| Subpath                        | Conteúdo                                              |
|--------------------------------|-------------------------------------------------------|
| `@dosc-syspro/contracts`       | Re-exporta tudo (barrel)                              |
| `@dosc-syspro/contracts/company`        | Schemas de empresa (list, create, update, status) |
| `@dosc-syspro/contracts/contact`        | Schemas de contatos                           |
| `@dosc-syspro/contracts/ticket`         | Schemas de tickets (status, priority, history) |
| `@dosc-syspro/contracts/user`           | Schemas de usuários e perfis                  |
| `@dosc-syspro/contracts/agent`          | Schemas de agentes/dispositivos               |
| `@dosc-syspro/contracts/chatwoot`       | Tipos de integração Chatwoot                  |
| `@dosc-syspro/contracts/evolution`      | Tipos de integração Evolution/WhatsApp        |
| `@dosc-syspro/contracts/evolution-webhook` | Payloads de webhooks Evolution            |
| `@dosc-syspro/contracts/remote`         | Contratos RustDesk (heartbeat, bootstrap, sync, ack, discover) |
| `@dosc-syspro/contracts/remote-module-settings` | Configurações do módulo remoto       |
| `@dosc-syspro/contracts/crm`            | Tipos de CRM (leads, atividades, tarefas)     |
| `@dosc-syspro/contracts/automation`     | Tipos de automação e triggers                 |
| `@dosc-syspro/contracts/dashboard`      | Tipos de métricas e KPIs                      |
| `@dosc-syspro/contracts/sefaz-routes`   | Rotas SEFAZ por UF e tipo de nota             |
| `@dosc-syspro/contracts/platform-notifications` | Notificações do portal              |
| `@dosc-syspro/contracts/settings`       | Schemas de configurações gerais               |

---

## Domínio remote — detalhamento

Por ser o mais crítico para a comunicação agent ↔ portal:

```typescript
// @dosc-syspro/contracts/remote

// Discovery (primeiro contato da máquina)
export const DiscoverPayloadV1Schema = z.object({ ... })
export type DiscoverPayloadV1 = z.infer<typeof DiscoverPayloadV1Schema>

// Bootstrap (registro e obtenção de agentToken)
export const BootstrapPayloadV1Schema = z.object({ ... })

// Heartbeat (ciclo periódico)
export const HeartbeatPayloadV1Schema = z.object({
  agentToken: z.string(),
  rustdeskId: z.string(),
  // ... stats de hardware
})

// Sync (relatório de atualizações)
export const SyncPayloadV1Schema = z.object({
  agentToken: z.string(),
  sysproUpdates: z.array(SysproUpdateSchema),
  // ...
})

// ACK (confirmação de comandos)
export const AckPayloadV1Schema = z.object({
  agentToken: z.string(),
  commandId: z.string(),
  result: z.enum(['SUCCESS', 'FAILURE']),
  message: z.string().optional(),
})
```

Versão dos payloads: sufixo `.v1` permite versionamento sem breaking change.

---

## Uso no código

```typescript
// Na API (validação de entrada)
import { HeartbeatPayloadV1Schema } from '@dosc-syspro/contracts/remote'

const parsed = HeartbeatPayloadV1Schema.safeParse(body)
if (!parsed.success) throw new BadRequestException(parsed.error)

// No Web (tipagem de formulários)
import type { CreateCompanyInput } from '@dosc-syspro/contracts/company'
const form: CreateCompanyInput = { ... }
```

---

## Convenções

- Schemas nomeados como `<Entidade>Schema` (PascalCase)
- Tipos inferidos como `type <Entidade> = z.infer<typeof <Entidade>Schema>`
- Payloads versionados como `<Ação>PayloadV1` para futura evolução
- Schemas de listagem incluem paginação e filtros padronizados
