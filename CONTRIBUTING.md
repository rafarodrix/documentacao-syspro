# Contribuindo

Guia completo em: **[docs/admin/documentacao-portal/contribuindo](apps/web/content/docs/admin/documentacao-portal/contribuindo/)**

## Resumo rápido

```bash
nvm use && npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:generate && npm run dev
```

**Branches:** `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `ci/`

**Commits:** `tipo(escopo): descrição imperativa` — [Conventional Commits](https://www.conventionalcommits.org/)

**PRs:** abrir como draft → CI verde → squash merge → deletar branch
