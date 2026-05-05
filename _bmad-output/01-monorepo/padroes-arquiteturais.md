# Padrões Arquiteturais

> Decisões arquiteturais consolidadas do monorepo. Atualizado em: 2026-05-05

---

## Hexagonal (Ports & Adapters) — módulo remote

O domínio de acesso remoto segue arquitetura hexagonal pura:

```
packages/remote-domain/   ← núcleo de domínio (zero deps externas)
  src/
    remote-domain.port.ts        ← interfaces das ports (contratos)
    remote-domain.contracts.ts   ← tipos de entrada/saída dos use cases
    agent-token.ts               ← lógica de token de agente
    errors.ts                    ← erros de domínio tipados
    index.ts                     ← factory: createTrilinkRemote(ports)

packages/remote-infra/    ← implementação das ports (adapters)
  src/
    ports/
      remote-session.port.ts     ← persiste sessões no Prisma
      remote-host-admin.port.ts  ← CRUD de hosts no Prisma
      remote-bootstrap.port.ts   ← lógica de bootstrap do agente
      remote-sync.port.ts        ← processamento de sync reports
      ...

apps/api/
  src/modules/remote-admin/     ← controllers HTTP que orquestram os use cases
```

**Regra:** `remote-domain` não importa nada de `remote-infra`, `database`, ou qualquer framework. Apenas recebe ports injetadas via factory.

---

## CQRS — módulo de mensageria

O processamento de mensagens segue separação command/query:

```
apps/api/src/modules/integrations/messaging/application/
  process-incoming-message.usecase.ts  ← recebe mensagem (command)
  process-outgoing-message.usecase.ts  ← envia mensagem (command)
  integration-webhook-dedup.service.ts ← deduplicação de webhooks
```

Não há event bus dedicado — os use cases são chamados diretamente pelos controllers de webhook.

---

## Injeção de dependências (NestJS)

Toda a API usa o sistema de DI do NestJS:

```typescript
// Módulo declara providers e exporta o que outros módulos precisam
@Module({
  imports: [PrismaModule],
  providers: [CompaniesService],
  exports: [CompaniesService],
  controllers: [CompaniesController],
})
export class CompaniesModule {}
```

**Regras:**
- Cada feature é um `Module` NestJS
- Services são injetados por constructor (não property injection)
- `PrismaModule` é global — disponível em toda a aplicação
- Módulos compartilhados (Authorization, Settings) são importados onde necessário

---

## Type safety ponta a ponta

O projeto usa três camadas para garantir type safety:

1. **Zod** (runtime): valida payloads em controllers e boundaries de integração
   - `@dosc-syspro/contracts` define os schemas
   - Controllers usam `@Body()` com pipes de validação Zod

2. **TypeScript strict** (compile time): todos os workspaces com strict mode
   - `tsconfig.base.json` na raiz com configuração base compartilhada
   - Cada workspace estende com suas particularidades

3. **tRPC** (ponta a ponta): o tipo do procedimento no servidor é inferido automaticamente no cliente
   - Sem geração de código — inferência nativa do TypeScript
   - Mudanças no servidor quebram o cliente em compile time

---

## RBAC — controle de acesso

Modelo de permissões em três camadas:

```
User
 └── Membership (user + company + role)
      └── role: ADMIN | SUPORTE | CLIENTE_ADMIN | CLIENTE_USER | DEVELOPER

AccessProfile
 └── Permission[] (permissões granulares)
      ex: companies:view_own, companies:view_all, tickets:create, remote:manage
```

**Escopo de acesso:**
- Usuários `ADMIN` / `SUPORTE` / `DEVELOPER`: escopo global (todas as empresas)
- Usuários `CLIENTE_ADMIN` / `CLIENTE_USER`: escopo restrito à(s) empresa(s) do vínculo

`AuthorizationService` resolve o escopo antes de qualquer operação e injeta no contexto da request.

Para o módulo remoto, `resolveScopedCompanyContext` (em `remote-infra`) garante que um usuário de empresa X não acessa hosts da empresa Y.

---

## Estrutura de features no Web

Cada feature do `apps/web` segue a estrutura:

```
src/features/<feature>/
  ├── application/    use cases, DTOs, server actions
  ├── domain/         entidades, regras de negócio locais
  ├── infrastructure/ adapters: tRPC client, fetch wrappers
  ├── interface/      componentes, pages, hooks React
  └── index.ts        exports públicos da feature
```

**Features existentes:**
`agents`, `auth`, `chatwoot`, `company`, `contracts`, `crm`, `dashboard`, `docs`, `documentos`, `evolution`, `releases`, `remote`, `settings`, `sql-scripts`, `tax`, `tickets`, `user-access`

---

## Convenções de nomenclatura

### Arquivos TypeScript
- `kebab-case` para nomes de arquivo: `remote-host-admin.port.ts`
- `PascalCase` para classes e interfaces: `RemoteHostAdminPort`
- `camelCase` para funções e variáveis: `createRemoteHostAdminPort`

### Arquivos Go
- `snake_case` para nomes de arquivo: `portal_client.go`
- `PascalCase` para tipos e funções exportadas: `BootstrapInput`
- Sufixos de plataforma: `_windows.go`, `_other.go` para código condicional

### Rotas da API (NestJS)
- `kebab-case` nos paths: `/remote-admin/`, `/companies/`
- Versionamento via path prefix quando necessário

### Banco de dados (Prisma)
- Modelos em `PascalCase`: `RemoteHost`, `CompanyContact`
- Campos em `camelCase`: `lastHeartbeatAt`, `rustdeskId`
- Enums em `SCREAMING_SNAKE_CASE`: `RemoteHostStatus`, `ConversationChannel`

---

## Padrão de erros

### Domínio (remote-domain)
Erros tipados retornados como `Result<T, DomainError>` — sem throw.
`mapRemoteDomainError()` converte para HTTP exceptions no controller.

### NestJS (API)
- Usa `HttpException` e variantes (`NotFoundException`, `BadRequestException`, etc.)
- Erros de validação Zod são interceptados por global exception filter

### Agente (Go)
- Erros explícitos na assinatura de retorno: `func doSomething() (Result, error)`
- Retry com backoff exponencial em chamadas HTTP ao portal
