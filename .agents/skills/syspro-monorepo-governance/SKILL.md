---
name: syspro-monorepo-governance
description: Diretrizes de governança do monorepo, gerenciamento de workspaces, dependências e scripts compartilhados.
---

# syspro-monorepo-governance

Use esta skill quando criar workspaces, mover codigo entre apps e packages, ajustar scripts raiz ou definir o lugar correto de uma nova responsabilidade no monorepo.

## Regras

- Workspaces usam o scope `@dosc-syspro/*`.
- Scripts raiz devem orquestrar workspaces; scripts locais ficam no pacote dono da capacidade.
- Logica compartilhada entre apps entra em `packages/*`, nao em import direto entre apps.
- Evite dependencias circulares e imports que atravessem fronteiras de runtime.
- Novos packages precisam ter responsabilidade clara e menor acoplamento que a alternativa atual.

## Estrategia de compartilhamento

- Tipos e contratos: `packages/contracts`
- Helpers neutros: `packages/shared`
- Politicas e servicos puros: `packages/core`
- Persistencia Prisma: `packages/database`
- Dominio/infra reutilizavel por feature: `packages/features/*/*`

## Scripts relevantes

- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm run docs:check`
- `npm run db:generate`

## Checklist

- O novo codigo pode ser consumido por mais de uma app sem puxar dependencias indevidas.
- O import path final comunica claramente quem e o dono da responsabilidade.
- A documentacao de monorepo do portal reflete o novo desenho quando houver mudanca estrutural.
