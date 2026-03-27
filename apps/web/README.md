# @dosc-syspro/web

Aplicacao principal do workspace.

## Responsabilidades

- portal autenticado
- documentacao MDX com Fumadocs
- area publica
- integracoes operacionais do produto

## Stack

- Next.js 15
- React 19
- TypeScript
- Prisma
- Better Auth
- Fumadocs

## Estrutura principal

```text
apps/web/
  content/docs/
  src/app/
  src/features/
  src/components/
  src/lib/
```

## Regras do app

- regras funcionais novas entram em `src/features/<feature>`
- `src/app` compoe rotas, layouts e route handlers
- `src/lib` guarda infraestrutura transversal, nao regra de dominio da feature
- componentes nao devem reimplementar consultas, authz ou mapeamentos ja existentes em `application`

## Scripts

```bash
npm run dev -w @dosc-syspro/web
npm run build -w @dosc-syspro/web
npm run typecheck -w @dosc-syspro/web
npm run test -w @dosc-syspro/web
npm run docs:check -w @dosc-syspro/web
```

## Observacoes

- o `postinstall` gera tipos do Fumadocs e `Prisma Client`
- o schema Prisma usado pelo app fica em `../../packages/database/prisma/schema.prisma`
- parte das integracoes externas pode operar com fallback local quando o provider estiver indisponivel
