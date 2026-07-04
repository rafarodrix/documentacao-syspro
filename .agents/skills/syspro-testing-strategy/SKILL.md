---
name: syspro-testing-strategy
description: Estratégia de testes automatizados (unitários, integração e E2E) e cobertura de regressão.
---

# syspro-testing-strategy

Use esta skill ao corrigir bug, extrair duplicacao ou introduzir comportamento novo em `api`, `web`, `agent` ou `packages/*`.

## Piramide pratica do repo

- Logica pura: testes unitarios em `packages/core` e `packages/features/*/*`
- Services e regras de acesso: testes focados em `apps/api/tests`
- UI e mapeamentos de tela: testes em `apps/web`
- Documentacao: `docs:check`
- Agente Windows: testes Go focados por modulo quando a mudanca tocar `apps/agent`

## O que cobrir primeiro

- Gates de permissao e escopo
- Normalizacao de nomes, mapeamentos e agregacoes
- Regras de fila, status e transicao
- Replays, retries e deduplicacao em integracoes assincronas
- Regressao do bug reportado pelo usuario

## Scripts alvo

- `npm run test:api`
- `npm run test:web`
- `npm run test:tickets`
- `npm run test:authz`
- `npm run docs:check`

## Regra

- Quando a mudanca corrige bug real, adicione cobertura de regressao sempre que o custo for razoavel.
