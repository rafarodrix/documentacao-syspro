# @dosc-syspro/database

Pacote responsável por centralizar a camada de banco do workspace.

## Escopo atual

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma/seed.ts`
- `prisma/seed-remote-hosts.mjs`
- bootstrap compartilhado do `PrismaClient`
- helpers de persistência reutilizados por outros pacotes

O schema e o client oficiais do workspace vivem aqui.

## Papel na arquitetura

- fonte única de verdade do schema Prisma
- origem do `PrismaClient` compartilhado
- base de persistência usada por `apps/web`, `apps/api`, `packages/application` e adapters remotos

Quando o schema muda, todos os consumidores dependem de `prisma generate` atualizado.

## Refatorações recentes

O pacote agora sustenta o RBAC persistido introduzido no sistema.

Modelos relevantes adicionados para autorização:

- `Permission`
- `AccessProfile`
- `AccessProfilePermission`
- `UserAccessProfile`

Objetivo desses modelos:

- persistir o catálogo de permissões
- persistir perfis de acesso editáveis
- vincular permissões a perfis
- vincular perfis a usuários com escopo global ou por empresa

Isso substitui a antiga dependência exclusiva de matriz hardcoded para o comportamento real do sistema.

## Scripts

```bash
npm run db:validate -w @dosc-syspro/database
npm run db:generate -w @dosc-syspro/database
npm run db:migrate -w @dosc-syspro/database
npm run db:deploy -w @dosc-syspro/database
npm run db:seed:remote -w @dosc-syspro/database
```

## Quando rodar `db:generate`

Rode `db:generate` sempre que:

- novos modelos Prisma forem adicionados
- campos ou relações forem alterados
- migrations de schema forem aplicadas
- o editor acusar que propriedades do client não existem, por exemplo:
  - `prisma.accessProfile`
  - `prisma.userAccessProfile`
  - `prisma.permission`

Comando:

```bash
npm run db:generate -w @dosc-syspro/database
```

## Observações sobre migrations

- migrations de autorização já fazem parte da base atual
- a geração do client precisa estar compatível com o `schema.prisma` mais recente
- schema atualizado com client desatualizado é a causa mais comum de erro de tipagem em `PrismaService`

## Origem oficial de consumo

- `apps/web` e `apps/api` não devem manter schema Prisma próprio
- qualquer evolução estrutural de banco deve nascer em `packages/database`
