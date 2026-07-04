---
name: syspro-architecture
description: Define as fronteiras das camadas do monorepo, regras de extração de duplicações e limites de responsabilidade.
---

# syspro-architecture

Use esta skill para criar ou refatorar modulos, quebrar services grandes, mover codigo duplicado e definir onde cada responsabilidade deve viver.

## Mapa de camadas

- `apps/api`: transporte HTTP/RPC, controllers, routers, webhooks e composicao de services.
- `apps/web`: rotas Next.js, UI, docs MDX e adapters de borda do frontend.
- `packages/contracts`: schemas Zod, payloads e tipos compartilhados.
- `packages/shared`: helpers neutros, sem regra de negocio acoplada ao app.
- `packages/core`: configuracoes e servicos puros de dominio reutilizaveis.
- `packages/database`: `schema.prisma`, migrations e `PrismaClient`.
- `packages/features/*/*`: dominio e infra reutilizavel por feature.
- `apps/agent`: runtime Windows em Go, com separacao entre service, UI e modulos internos.

## Regras de desenho

- Controller e route handler devem ser finos; coordenacao vai para service, use case ou helper dedicado.
- Shared code sobe para a menor camada neutra possivel.
- `apps/web` nao deve importar internals de `apps/api`.
- Mapeamentos e normalizacao de dados devem ser centralizados, nao reimplementados por tela.
- Refatores em services grandes devem preferir slices, support services e queries focadas.

## Sinais de extracao obrigatoria

- Mesmo filtro, normalizador ou calculo repetido em mais de um modulo.
- Service com responsabilidades de leitura, escrita, permissao e formatacao misturadas.
- Regra de negocio usada por mais de uma app.
- Documento de arquitetura dizendo uma coisa e o codigo fazendo outra.

## Validacao

- Verifique imports apos a extracao.
- Atualize a documentacao do portal quando a fronteira de responsabilidade mudar.
