# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Unreleased]

### Adicionado
- Documentação técnica do portal em MDX (`apps/web/content/docs/admin/documentacao-portal/`)
- Módulo de acesso remoto com integração RustDesk
- Feature de tickets com arquitetura de domínio isolada
- Pacotes `remote-domain` e `remote-infra` para domínio de acesso remoto
- Plugin ESLint interno `eslint-plugin-trilink-tokens` para enforcement de design tokens
- Script de auditoria de design system (`adoption/audit.sh`)

### Alterado
- Migração de Turborepo para npm workspaces nativo
- Estrutura de packages reorganizada: `application` extraído para workspace próprio

### Infraestrutura
- CI com GitHub Actions (quality + build gates em PRs e main)
- `docs-check` valida consistência de meta.json e MDX no CI
- `.prettierrc`, `.nvmrc`, `CODEOWNERS`, PR template adicionados

---

<!-- Exemplo de entrada futura:

## [1.2.0] - 2026-06-01

### Adicionado
- ...

### Corrigido
- ...

### Removido
- ...

-->
