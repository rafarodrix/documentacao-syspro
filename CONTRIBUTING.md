# Contribuindo no Monorepo

## Estrutura alvo

- `apps/web`: UI, admin e BFF legado em transicao
- `apps/api`: backend central (Nest)
- `apps/mobile`: shell mobile
- `packages/*`: contratos, dominio, banco e bibliotecas compartilhadas

## Convencoes de nomenclatura

- Componentes React: `PascalCase.tsx`
- Hooks, actions, services, gateways, controllers e utilitarios: `kebab-case.ts`
- Arquivos de tipos locais: `types.ts`
- Testes: `*.test.ts` ou `*.test.tsx`
- Excecao controlada: componentes vendorizados em `apps/web/src/components/ui/*` podem manter `kebab-case.tsx` para compatibilidade com o ecossistema shadcn/radix.
- Evitar duplicidade por estilo (ex.: `ThemeProvider.tsx` e `theme-provider.tsx` para a mesma responsabilidade).
- Excecao de entrypoint: `index.tsx` e `index.ts` sao permitidos quando o objetivo for apenas expor o modulo/pasta.

## Convencoes de responsabilidade

- `apps/web` deve ficar focado em UI/admin.
- Integracoes e regras de negocio novas devem entrar no `apps/api` ou `packages/*`.
- Nao commitar artefatos gerados em `src` (`*.js` compilado, `node_modules`, outputs de teste).

## Arquitetura por feature no web

- Cada modulo em `apps/web/src/features/*` deve manter sempre as camadas:
  - `application/`
  - `domain/`
  - `infrastructure/`
  - `interface/`
- `hooks` de UI ficam em `interface/hooks`.
- Utilitarios compartilhados da feature ficam em `application/utils` (ou em `infrastructure/*` quando forem tecnicos de adaptadores).

## Comandos principais

- Web:
  - `npm run test -w @dosc-syspro/web`
  - `npm run test:e2e -w @dosc-syspro/web`
- API app:
  - `npm run typecheck -w @dosc-syspro/app-api`
  - `npm run test -w @dosc-syspro/app-api`
- Package API:
  - `npm run test -w @dosc-syspro/api`

## Checklist para PR

- Rodar `typecheck` no escopo alterado.
- Rodar testes do escopo alterado.
- Garantir que nao houve inclusao de arquivos gerados.
- Atualizar documentacao tecnica quando o comportamento mudar.
