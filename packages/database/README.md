# @dosc-syspro/database

Pacote responsavel por centralizar a camada de banco do workspace.

## Escopo atual

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma/seed.ts`
- `prisma/seed-remote-hosts.mjs`
- bootstrap compartilhado do `PrismaClient`

O `apps/web` continua consumindo o client por um wrapper de compatibilidade em `src/lib/prisma.ts`, mas a origem oficial agora e este pacote.

## Scripts

```bash
npm run db:validate -w @dosc-syspro/database
npm run db:generate -w @dosc-syspro/database
npm run db:migrate -w @dosc-syspro/database
npm run db:deploy -w @dosc-syspro/database
npm run db:seed:remote -w @dosc-syspro/database
```
