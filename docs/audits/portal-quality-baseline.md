# Baseline de Qualidade do Portal Trilink

Data: 2026-07-22. Escopo: `apps/*` e `packages/*`, excluindo artefatos gerados.

## Inventario

- Apps: `web` (Next.js/Fumadocs), `api` (NestJS), `agent` (Go/Wails) e `mobile` (shell).
- Pacotes: `config`, `contracts`, `core`, `database`, `shared`, `ui` e features `contacts`, `crm`, `remote`, `tarefas` e `tickets` em `domain`/`infra` quando aplicavel.
- API: 23 modulos Nest, incluindo auth, authorization, companies, contacts, crm, integrations, remote-admin, tarefas e tickets.
- Web: 20 features, incluindo auth, company, settings, remote, tarefas, tax, tickets e user-access.
- Entradas HTTP verificadas: REST, `/rpc/:namespace/:procedure`, tRPC, webhooks Evolution e Chatwoot e proxy interno web -> API.
- Auth: Better Auth; a autorizacao efetiva e resolvida no backend por `AuthorizationService`, com escopo global ou por empresa.
- Persistencia: um schema Prisma e migrations em `packages/database`.

## Comandos reproduzidos

| Comando | Resultado |
| --- | --- |
| `npm run docs:check` | passou: 166 MDX e 60 `meta.json` |
| `npm run check:utf8` | passou |
| `npm run lint` | passou com warnings de paleta Tailwind e dois hooks |
| `npm run typecheck` | falhou: `contracts/trpc` puxa `apps/api` para fora do `rootDir` |
| `npm run test` | falhou: 1 expectativa em `process-outgoing-message.usecase.test.ts` |
| `npm run build` | falhou no Nest: hook externo Console Ninja resolve dependencias opcionais ausentes |
| `jscpd apps packages` | 517 clones; 6.455 linhas; 3,61% |
| `npm run quality:architecture` | 12 ciclos Nest confirmados em 1.664 modulos / 2.741 dependencias |
| `knip` | candidatos a exports/dependencias sem uso; exige triagem manual |
| `npm audit --audit-level=high` | 13 vulnerabilidades: 1 critica e 4 altas |

## Achados confirmados

1. `packages/contracts/src/trpc/index.ts` reexporta `AppRouter` de `apps/api`; `apps/web/tsconfig.json` tambem resolve esse subpath para a API. E violacao de fronteira e quebra o typecheck.
2. `apps/api/src/modules/auth/auth.service.ts` tem fallback de segredo de autenticacao. Em runtime nao deve existir fallback para `BETTER_AUTH_SECRET`.
3. O teste de outbound Chatwoot espera que `messageLink.findUnique` nao seja chamado, mas a implementacao passou a consultar o vinculo mesmo com `in_reply_to_external_id`; classificar como teste de caracterizacao desatualizado antes de alterar comportamento.
4. O build da API e contaminado por uma extensao local do VS Code; nao ha variavel de ambiente do repositorio que a declare. Tratar como problema de ambiente ate reproduzir em CI limpo.
5. Dependency Cruiser encontrou ciclos entre `settings`, `tickets`, `tarefas`, `automation`, `messaging`, `evolution` e `chatwoot`. O menor e `automation -> settings -> automation`; os ciclos de mensageria atravessam varios modulos e devem ser quebrados por portas/bridges focados.

## Limites desta rodada

Semgrep, Gitleaks e Trivy nao estavam instalados. O CI ja executa Gitleaks e Trivy; esta rodada nao inferiu resultado deles.
