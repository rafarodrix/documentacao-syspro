# Contribuindo

## Índice

- [Setup local](#setup-local)
- [Convenção de branches](#convenção-de-branches)
- [Mensagens de commit](#mensagens-de-commit)
- [Fluxo de PR](#fluxo-de-pr)
- [Testes](#testes)
- [Linting e formatação](#linting-e-formatação)

---

## Setup local

```bash
# Versão do Node — use o .nvmrc do projeto
nvm use          # ou: node --version deve ser 22.x

npm install

# Copie os arquivos de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/web/.env.e2e.example apps/web/.env.e2e

# Gere o client do Prisma
npm run db:generate

# Rode o portal
npm run dev

# Rode a API (em outro terminal)
npm run dev:api
```

---

## Convenção de branches

```
<tipo>/<descricao-curta>

feat/remoto-grupos-de-acesso
fix/token-rotacao-expirado
chore/atualizar-prisma-6
docs/arquitetura-acesso-remoto
refactor/feature-tickets-query-layer
```

| Prefixo | Quando usar |
|---------|-------------|
| `feat/` | Nova funcionalidade |
| `fix/` | Correção de bug |
| `chore/` | Manutenção sem impacto funcional |
| `docs/` | Documentação |
| `refactor/` | Refatoração sem mudança de comportamento |
| `test/` | Testes |
| `ci/` | Pipelines e automação |

---

## Mensagens de commit

O projeto adota **Conventional Commits**:

```
<tipo>(<escopo opcional>): <descrição curta no imperativo>

<corpo opcional — o "porquê", não o "o quê">
```

Exemplos:

```
feat(remote): adicionar endpoint de grupos de acesso
fix(tokens): corrigir rotação de agentToken expirado
chore(deps): atualizar prisma para 6.x
docs(acesso-remoto): documentar fluxo de sessão RustDesk
```

**Tipos aceitos:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`, `revert`

Evite: mensagens vagas como `fix bug`, `ajustes`, `WIP`.

---

## Fluxo de PR

1. Crie a branch a partir de `main` (ou da branch de feature base)
2. Abra PR como **draft** enquanto o trabalho estiver em andamento
3. Antes de solicitar review, garanta que o CI está verde
4. Squash merge é preferido para manter o histórico limpo em `main`
5. Delete a branch após o merge

### Tamanho de PR

Prefira PRs focadas e pequenas. Uma PR que resolve um problema único é mais fácil de revisar e de reverter se necessário. Splits são bem-vindos.

---

## Testes

```bash
# Todos os testes unitários
npm run test

# Por domínio
npm run test:authz
npm run test:tickets

# API
npm run test:api

# Packages
npm run test:packages

# E2E (requer .env.e2e configurado)
npm run test:e2e
```

Toda PR com mudança de lógica de negócio deve ter testes cobrindo o fluxo principal e os casos de erro relevantes.

---

## Linting e formatação

```bash
npm run lint            # ESLint em apps/web
npm run lint:remote     # Regras estritas para features/remote
npm run lint:ds         # Auditoria de tokens do design system
npm run typecheck       # TypeScript — apps/web
npm run typecheck:api   # TypeScript — apps/api
npm run typecheck:contracts
```

O projeto usa **Prettier** para formatação (`npm run format` ou via plugin do editor). Configure seu editor para formatar ao salvar usando `.prettierrc`.

Violações de lint bloqueiam o merge via CI.
