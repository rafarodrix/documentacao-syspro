# @dosc-syspro/app-mobile

Shell estrutural do app mobile do monorepo.

Objetivo:
- materializar a pasta `apps/mobile`
- fixar o boundary do mobile em cima de `packages/contracts`, `packages/core` e `packages/shared`
- evitar dependencia de `Next.js`, Prisma e componentes web

Estado atual:
- shell de workspace criado
- navegacao e view models mobile definidos em TypeScript puro
- mapeadores consumindo contratos e dominio compartilhado
- runtime mobile ainda nao foi conectado a Expo ou React Native

Escopo propositalmente fora deste passo:
- design system mobile
- navegacao nativa
- auth mobile
- transporte real para `apps/api`