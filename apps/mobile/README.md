# @dosc-syspro/app-mobile

Shell estrutural do app mobile do monorepo.

## Objetivo

- fixar o boundary do mobile em cima de `packages/contracts`, `packages/core` e `packages/shared`
- evitar dependencia de `Next.js`, Prisma e componentes web
- permitir evolucao futura sem reescrever contratos e regras de negocio

## Scripts

```bash
npm run dev -w @dosc-syspro/app-mobile
npm run typecheck -w @dosc-syspro/app-mobile
```

## Estado atual

- shell de workspace criado
- navegacao e view models mobile definidos em TypeScript puro
- mapeadores consumindo contratos e dominio compartilhado
- runtime mobile ainda nao foi conectado a Expo ou React Native

## Fora do escopo atual

- design system mobile
- navegacao nativa
- auth mobile
- transporte real para `apps/api`
