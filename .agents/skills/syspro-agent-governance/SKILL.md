---
name: syspro-agent-governance
description: Escolhe a autoridade correta para cada tema, prioriza código real e coordena as demais skills locais.
---

# syspro-agent-governance

Use esta skill quando o trabalho envolver planejamento, refatoracao, criacao de feature ou conciliacao entre codigo e documentacao neste monorepo.

## Objetivo

- Escolher a authority certa para cada tema sem sobrepor regras.
- Priorizar o estado real do repositorio sobre documentacao desatualizada.
- Forcar extracao de duplicacao para camadas compartilhadas quando fizer sentido.

## Autoridades do repositorio

- `apps/api/README.md`: fronteiras do adapter HTTP/NestJS e RBAC central.
- `apps/web/README.md`: regras de composicao do frontend e da documentacao MDX.
- `packages/database/README.md`: schema Prisma e ciclo de geracao do client.
- `packages/ui/README.md`: fronteiras entre primitives, patterns e componentes de feature.
- `apps/web/content/docs/admin/documentacao-portal/**`: referencia arquitetural publicada no portal.

## Skills locais para combinar

- `syspro-architecture`: cortes de modulo, extracao de helpers e limites entre apps e packages.
- `syspro-monorepo-governance`: workspaces, scripts raiz e compartilhamento entre apps.
- `syspro-auth-authorization`: RBAC persistido, company scope e service auth.
- `syspro-prisma-migrations`: schema, migrations e client Prisma.
- `syspro-testing-strategy`: estrategia de validacao e regressao.
- `syspro-definition-of-done`: fechamento tecnico antes de marcar como concluido.
- `syspro-worker-reliability`: jobs, filas, webhooks e sync assincrono.
- `syspro-ui-system`: UI do portal, patterns e docs com Fumadocs.

## Authorities externas complementares

Se estiverem disponiveis no ambiente do agente, combine com estas:

- `vercel-react-best-practices`: performance e fronteiras React/Next.
- `vercel-composition-patterns`: composicao de componentes e reducao de props booleanas.
- `web-design-guidelines`: acessibilidade, navegacao e UX.
- `turborepo`: pipelines, filtros e cache do monorepo.
- `prisma-cli` e `prisma-client-api`: operacao segura com Prisma.
- `security-best-practices`: threat modeling e superficies sensiveis.

## Regras

- Verifique primeiro o codigo real, depois a documentacao.
- Nao assuma que uma skill documentada existe; confirme a pasta `.agents/skills`.
- Logica compartilhada entre `web` e `api` deve ir para `packages/*`, nao ser copiada.
- Mudanca arquitetural relevante exige sincronizacao da documentacao do portal.
- Duplicacao pequena e local pode ficar; duplicacao recorrente entre modulos deve ser extraida.

## Saida esperada

- O trabalho termina com a authority correta aplicada, menos duplicacao acidental e documentacao coerente com o estado atual do repo.
