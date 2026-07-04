---
name: syspro-prisma-migrations
description: Padrões para alterações de schema, migrações seguras (expand-and-contract) e operações com Prisma ORM.
---

# syspro-prisma-migrations

Use esta skill quando houver mudanca de schema, relation, indice, query Prisma ou erro de tipagem do client.

## Regras

- O schema oficial vive em `packages/database/prisma/schema.prisma`.
- `apps/web` e `apps/api` nao mantem schema proprio.
- Migrations devem ser pequenas, rastreaveis e com intencao clara.
- Mudanca de banco que afeta contrato ou mapper deve ser aplicada junto na mesma passada.

## Expand and contract

Prefira rollout em duas etapas quando houver risco de quebra:

1. adicionar campos, estruturas ou caminhos de leitura compativeis
2. migrar consumidores
3. remover legado em passada posterior

## Comandos de validacao

- `npm run db:validate`
- `npm run db:generate`
- `npm run db:migrate`

## Alertas

- Schema novo com client antigo costuma aparecer como propriedades faltando no `PrismaService`.
- Mudancas de relacao devem revisar filtros, includes, mappers e docs do modulo afetado.
