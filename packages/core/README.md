# packages/core

Pacote de dominio, entidades e servicos puros sem dependencia de Next.js.

## Objetivo

Centralizar regras puras que possam ser reutilizadas por web, API e mobile sem acoplamento de framework.

## Escopo atual

- entidades de ticket e release
- politicas de acesso por role
- workflow e matriz de estados de tickets
- regras puras de bloqueio de contrato
- calculo de SLA de tickets

## Exportacoes atuais

- entidades
- configuracoes de bloqueio, roles e workflow
- servicos puros como calculo de SLA

Nao deve receber:

- React
- Next.js
- Prisma
- detalhes de transporte HTTP
