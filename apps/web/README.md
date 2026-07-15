# @dosc-syspro/web

Aplicação principal do workspace.

## Responsabilidades

- portal autenticado
- documentação MDX com Fumadocs
- área pública
- UI administrativa e operacional do produto
- route handlers do Next.js que funcionam como borda do frontend

## Stack

- Next.js 15
- React 19
- TypeScript
- Better Auth
- Fumadocs
- contratos compartilhados via `@dosc-syspro/contracts`

## Estrutura principal

```text
apps/web/
  content/docs/
  src/app/
  src/features/
  src/components/
    patterns/       ← camada de padrões de UI (EmptyState, PageHeader, MetricCard, SearchToolbar, FilterTabs, SectionCard)
    platform/       ← componentes de feature do portal autenticado
    site/           ← componentes da área pública
    docs/           ← componentes da área de documentação MDX
  src/lib/
```

Ver [`src/components/patterns/README.md`](src/components/patterns/README.md) para API completa dos pattern components.

## Regras do app

- regras funcionais novas entram em `src/features/<feature>`
- `src/app` compõe rotas, layouts e route handlers
- `src/lib` guarda infraestrutura transversal, não regra de domínio da feature
- componentes não devem reimplementar consultas, authz ou mapeamentos já existentes em `application`

## Refatorações recentes

- desacoplamento do `web` de utilitários internos de backend
- utilitários transversais passaram a vir de `packages/shared`:
  - `logger`
  - `request-auth`
  - `action-rate-limit`
  - `action-error-handler`
- adapters remotos passaram a ser consumidos via `packages/features/remote/infra`, e não mais direto de `packages/application`
- tela de `Perfis de Acesso` passou a permitir:
  - edição de perfis existentes
  - edição de perfis de sistema
  - preservação da chave fixa dos perfis legados de sistema
- frontend de autorização já consome contexto central vindo do backend para RBAC persistido

## Estado atual de acoplamento

O `web` ainda conversa com o backend por HTTP interno em pontos como:

- sessão protegida
- settings
- autorização
- integrações operacionais

Isso é esperado para a borda web. O que foi removido é o acoplamento indevido com código utilitário interno de backend.

Hoje a separação desejada é:

- `packages/contracts`: payloads, schemas e tipos compartilhados
- `packages/shared`: utilitários transversais neutros
- `packages/features/remote/infra`: adapters remotos compartilhados
- `packages/application`: routers e superfície de aplicação/backend
- `apps/web`: composição de UI, rotas Next e consumo dos pacotes acima

## Autorização

O fluxo atual combina:

- sessão local obtida pelo frontend
- contexto central de autorização vindo do backend
- fallback legado por role em alguns trechos ainda não totalmente migrados

Direção arquitetural:

- o frontend deve depender cada vez menos de `role` puro
- decisões de permissão devem convergir para o contexto central de autorização
- `role` deve permanecer como identidade/base histórica, não como regra primária espalhada

## Scripts

```bash
npm run dev -w @dosc-syspro/web
npm run build -w @dosc-syspro/web
npm run typecheck -w @dosc-syspro/web
npm run test -w @dosc-syspro/web
npm run docs:check -w @dosc-syspro/web
```

## Ambiente

Exemplo versionado:

- `apps/web/.env.example`
- `apps/web/.env.e2e.example`

Para desenvolvimento local, use:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/web/.env.e2e.example apps/web/.env.e2e
```

## Observações operacionais

- o `postinstall` gera tipos do Fumadocs e Prisma Client
- o schema Prisma usado pelo app fica em `../../packages/database/prisma/schema.prisma`
- quando novos modelos Prisma forem adicionados ao schema compartilhado, é obrigatório regenerar o client
- parte das integrações externas pode operar com fallback local quando o provider estiver indisponível

## Deploy dedicado

O frontend agora está preparado para self-hosting com output standalone do Next.js.

Arquivos de deploy:

- `apps/web/deploy/Dockerfile`
- `apps/web/deploy/docker-compose.yml`

Build da imagem com contexto na raiz do monorepo:

```bash
docker build -f apps/web/deploy/Dockerfile -t dosc-syspro-web .
docker run --rm -p 3000:3000 --env-file apps/web/.env dosc-syspro-web
```

Healthcheck HTTP:

```text
GET /api/health
```

## Variáveis mínimas de produção

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_WEB_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_AUTH_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `APP_BACKEND_API_URL`
- `BETTER_AUTH_SECRET`
- `INTERNAL_API_KEY`

## Proxy reverso

Ao publicar atrás de nginx, Traefik ou Dokploy, repasse obrigatoriamente:

- `Host`
- `X-Forwarded-Host`
- `X-Forwarded-Proto`

O frontend usa esses headers para resolver a origem efetiva em SSR, login e redirects.


## Próximos passos de arquitetura

- reduzir fallback local por role no frontend
- concentrar ainda mais as decisões de autorização no backend
- continuar a extração de adapters compartilháveis para pacotes neutros
