# Guia: Como criar um novo módulo na API (NestJS)

> Passo a passo para adicionar um novo domínio ao `apps/api`. Atualizado em: 2026-05-05

---

## Estrutura mínima de um módulo

```
src/modules/<nome>/
├── <nome>.module.ts      ← declara providers, controllers, imports, exports
├── <nome>.service.ts     ← lógica de negócio
├── <nome>.controller.ts  ← endpoints REST
└── <nome>.router.ts      ← procedures tRPC (opcional)
```

---

## Passo 1 — Criar os arquivos

```typescript
// exemplo.module.ts
import { Module } from '@nestjs/common'
import { ExemploService } from './exemplo.service'
import { ExemploController } from './exemplo.controller'

@Module({
  providers: [ExemploService],
  controllers: [ExemploController],
  exports: [ExemploService],
})
export class ExemploModule {}
```

```typescript
// exemplo.service.ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ExemploService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.exemplo.findMany()
  }
}
```

```typescript
// exemplo.controller.ts
import { Controller, Get } from '@nestjs/common'
import { ExemploService } from './exemplo.service'

@Controller('exemplo')
export class ExemploController {
  constructor(private readonly exemploService: ExemploService) {}

  @Get()
  findAll() {
    return this.exemploService.findAll()
  }
}
```

---

## Passo 2 — Registrar no AppModule

```typescript
// src/app.module.ts
import { ExemploModule } from './modules/exemplo/exemplo.module'

@Module({
  imports: [
    // ... outros módulos
    ExemploModule,
  ],
})
export class AppModule {}
```

---

## Passo 3 — Adicionar ao roteador tRPC (opcional)

```typescript
// exemplo.router.ts
import { z } from 'zod'

export const exemploRouter = router({
  list: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.exemploService.findAll()
    }),
  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.exemploService.create(input)
    }),
})
```

```typescript
// src/modules/trpc/trpc.router.ts — adicionar:
export const appRouter = router({
  // ... outros routers
  exemplo: exemploRouter,
})
```

---

## Passo 4 — Validação com Zod

```typescript
// No controller, usar pipes Zod para validar body
import { ZodValidationPipe } from '...'
import { CreateExemploSchema } from '@dosc-syspro/contracts/exemplo'

@Post()
@UsePipes(new ZodValidationPipe(CreateExemploSchema))
create(@Body() dto: CreateExemploDto) {
  return this.exemploService.create(dto)
}
```

---

## Passo 5 — Adicionar schema ao contracts (se necessário)

```typescript
// packages/contracts/src/exemplo.ts
import { z } from 'zod'

export const CreateExemploSchema = z.object({
  name: z.string().min(1),
})

export type CreateExemploInput = z.infer<typeof CreateExemploSchema>
```

Registrar no `package.json` de contracts como subpath export se necessário.

---

## Checklist

- [ ] Módulo criado com `@Module()`
- [ ] Service injetado via constructor (não property)
- [ ] Controller com prefixo de rota kebab-case
- [ ] Registrado no `AppModule`
- [ ] Schema Zod em `@dosc-syspro/contracts` se necessário
- [ ] Procedure tRPC adicionada ao router se exposto ao frontend
- [ ] Testes em `apps/api/tests/`
