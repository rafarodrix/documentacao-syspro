# Guia: Como criar um novo módulo na API (NestJS)

> Passo a passo para adicionar um novo domínio ao `apps/api`. Atualizado em: 2026-05-08

---

## Padrão ouro: módulo tRPC (sem controller REST)

O padrão adotado para módulos que expõem dados ao frontend é **tRPC puro** — sem `Controller` REST. Os módulos `companies` e `users` são a referência.

```
src/modules/<nome>/
├── <nome>.module.ts      ← declara providers, imports com forwardRef(TrpcModule), exports
├── <nome>.service.ts     ← lógica de negócio + autorização via AuthorizationService
└── <nome>.router.ts      ← procedures tRPC (injetável NestJS)
```

---

## Passo 1 — Criar o service

```typescript
// exemplo.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common'
import type { IncomingHttpHeaders } from 'node:http'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthorizationService } from '../authorization/authorization.service'

@Injectable()
export class ExemploService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async findAll(rawHeaders?: IncomingHttpHeaders) {
    const requester = await this.authorizationService.getRequester(rawHeaders)
    // lógica de negócio + controle de acesso
    return this.prisma.exemplo.findMany()
  }
}
```

---

## Passo 2 — Criar o router tRPC

```typescript
// exemplo.router.ts
import { Injectable } from '@nestjs/common'
import { z } from 'zod'
import { TrpcService } from '../trpc/trpc.service'
import { ExemploService } from './exemplo.service'
import { createExemploSchema } from '@dosc-syspro/contracts/exemplo'

@Injectable()
export class ExemploRouter {
  public router!: ReturnType<typeof this.createRouter>

  constructor(
    private readonly trpc: TrpcService,
    private readonly exemploService: ExemploService,
  ) {
    this.router = this.createRouter()
  }

  private createRouter() {
    return this.trpc.router({
      list: this.trpc.publicProcedure
        .query(({ ctx }) =>
          this.exemploService.findAll(ctx.headers),
        ),

      create: this.trpc.publicProcedure
        .input(createExemploSchema)
        .mutation(({ input, ctx }) =>
          this.exemploService.create(input, ctx.headers),
        ),
    })
  }
}
```

---

## Passo 3 — Configurar o módulo NestJS

```typescript
// exemplo.module.ts
import { Module, forwardRef } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { TrpcModule } from '../trpc/trpc.module'
import { ExemploService } from './exemplo.service'
import { ExemploRouter } from './exemplo.router'

@Module({
  imports: [PrismaModule, forwardRef(() => TrpcModule)],
  providers: [ExemploService, ExemploRouter],
  exports: [ExemploService, ExemploRouter],
})
export class ExemploModule {}
```

---

## Passo 4 — Registrar no TrpcModule e TrpcRouter

```typescript
// trpc.module.ts — adicionar import
import { ExemploModule } from '../exemplo/exemplo.module'

@Module({
  imports: [
    forwardRef(() => CompaniesModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ExemploModule),  // ← adicionar
  ],
  // ...
})
export class TrpcModule { ... }
```

```typescript
// trpc.router.ts — adicionar ao router
constructor(
  private readonly trpc: TrpcService,
  private readonly companiesRouter: CompaniesRouter,
  private readonly usersRouter: UsersRouter,
  private readonly exemploRouter: ExemploRouter,  // ← adicionar
) {
  this.appRouter = this.createRouter()
}

private createRouter() {
  return this.trpc.router({
    companies: this.companiesRouter.router,
    users:     this.usersRouter.router,
    exemplo:   this.exemploRouter.router,  // ← adicionar
  })
}
```

---

## Passo 5 — Adicionar schemas ao contracts

```typescript
// packages/contracts/src/exemplo/exemplo.types.ts
import { z } from 'zod'

export const createExemploSchema = z.object({
  name: z.string().min(1),
})

export type CreateExemploInput = z.input<typeof createExemploSchema>
```

```typescript
// packages/contracts/src/exemplo/index.ts
export * from './exemplo.types'
```

Registrar subpath export no `package.json` do package contracts.

---

## Passo 6 — Consumir no frontend

```typescript
// apps/web (server component ou server action)
import { trpc } from "@/lib/api/trpc-client"

const items = await trpc.exemplo.list.query()
await trpc.exemplo.create.mutate({ name: "Novo item" })
```

---

## Checklist

- [ ] `<nome>.service.ts` com `rawHeaders?: IncomingHttpHeaders` em todos os métodos públicos
- [ ] Autorização via `AuthorizationService.getRequester(rawHeaders)` no início de cada método
- [ ] `<nome>.router.ts` injectable com `publicProcedure` e `ctx.headers` repassado ao service
- [ ] `<nome>.module.ts` com `forwardRef(() => TrpcModule)` nos imports e router exportado
- [ ] `TrpcModule` importando o novo módulo com `forwardRef`
- [ ] `TrpcRouter` injetando e montando o sub-router
- [ ] Schemas Zod em `@dosc-syspro/contracts/<nome>`
- [ ] Testes de autorização em `apps/web/tests/` ou `apps/api/tests/`
