# Plano de Refatoração e Melhoria de Qualidade (P0 - P3)

## Prioridades e Categorização

### P0 — Crítico (Segurança e Integridade)
- **ID:** `SEC-P0-001`
  - **Prioridade:** P0
  - **Evidência:** Dependência de `@dosc-syspro/app-api` declarada em `apps/web/package.json` e importação direta em `apps/web/src/lib/api/trpc-client.ts`.
  - **Arquivos:** `apps/web/package.json`, `apps/web/src/lib/api/trpc-client.ts`.
  - **Risco:** Acoplamento indevido entre frontend e backend, acoplamento no build do monorepo.
  - **Causa Raiz:** O tipo do `AppRouter` estava sendo importado diretamente da aplicação API em vez de ser exportado via pacote `@dosc-syspro/contracts`.
  - **Correção:** Mover a definição de tipos exportados do router para `@dosc-syspro/contracts` e remover a dependência de `@dosc-syspro/app-api` no `apps/web/package.json`.
  - **Teste:** `npm run typecheck` e `npm run test:web`.
  - **Complexidade:** Média
  - **Critério de Aceite:** `apps/web` não possui nenhuma referência a `apps/api` no seu `package.json` ou código fonte.

### P1 — Alto (Regressões e Falhas de Build/Testes)
- **ID:** `QUAL-P1-001`
  - **Prioridade:** P1
  - **Evidência:** `npm run test` falhando em `tests/remote/directory-page.helpers.test.ts` com erro `ERR_MODULE_NOT_FOUND` para `@dosc-syspro/shared/remote-operational-status`.
  - **Arquivos:** `apps/web/vitest.config.ts`, `packages/shared/package.json`.
  - **Risco:** Falha nos testes automatizados e no pipeline de CI/CD.
  - **Causa Raiz:** Mapeamento de alias no `apps/web/vitest.config.ts` não inclui a subpasta `@dosc-syspro/shared/remote-operational-status`.
  - **Correção:** Adicionar a entrada correspondente no mapa de aliases do `vitest.config.ts`.
  - **Teste:** `npm run test:web`.
  - **Complexidade:** Baixa
  - **Critério de Aceite:** Todos os 11 arquivos de teste em `apps/web` passam sem erros.

- **ID:** `QUAL-P1-002`
  - **Prioridade:** P1
  - **Evidência:** `npm run check:utf8` falhando devido a caractere com mojibake (`Ã`) no arquivo `apps/web/content/docs/admin/documentacao-portal/banco-dados/index.mdx`.
  - **Arquivos:** `apps/web/content/docs/admin/documentacao-portal/banco-dados/index.mdx`.
  - **Risco:** Corrupção de documentação publicada e falha no gate de qualidade UTF-8.
  - **Causa Raiz:** Arquivo salvo com codificação não UTF-8 / Windows-1252.
  - **Correção:** Converter a codificação para UTF-8 limpo sem BOM.
  - **Teste:** `npm run check:utf8`.
  - **Complexidade:** Baixa
  - **Critério de Aceite:** `npm run check:utf8` executa com sucesso.

- **ID:** `QUAL-P1-003`
  - **Prioridade:** P1
  - **Evidência:** `npm run docs:check` reporta 80+ arquivos MDX sem metadados de tags no frontmatter e referências quebradas (`tef-fiserve`, `revenda-frigorifico`).
  - **Arquivos:** `apps/web/content/docs/**`.
  - **Risco:** Links quebrados na documentação e falha na verificação de consistência.
  - **Causa Raiz:** Documentação legada sem padronização de tags e referências no `meta.json`.
  - **Correção:** Corrigir os links e incluir tags válidas no frontmatter dos documentos sinalizados.
  - **Teste:** `npm run docs:check`.
  - **Complexidade:** Média
  - **Critério de Aceite:** `npm run docs:check` executa sem apontar erros.

### P2 — Médio (Duplicação e Governança do Monorepo)
- **ID:** `GOV-P2-001`
  - **Prioridade:** P2
  - **Evidência:** Binários compilados soltos em `apps/agent/agent-installer-build.exe` e `apps/agent/agent-installer.exe`.
  - **Arquivos:** `apps/agent/agent-installer-build.exe`, `apps/agent/agent-installer.exe`.
  - **Risco:** Violação da regra de governança de limpeza de raiz (`AGENTS.md`).
  - **Causa Raiz:** Geração de binários Go sem direcionamento explícito para pasta `dist/` ou `build/`.
  - **Correção:** Ajustar script de build para enviar os binários para `apps/agent/dist/` e incluir padrões no `.gitignore`.
  - **Teste:** Verificação visual da raiz do módulo.
  - **Complexidade:** Baixa
  - **Critério de Aceite:** Nenhum binário `.exe` solto no diretório raiz de `apps/agent`.

- **ID:** `QUAL-P2-002`
  - **Prioridade:** P2
  - **Status:** Em Progresso (Extraídos `ColumnToggleDropdown` em `@dosc-syspro/ui` e `usePlatformSettings` em `integrations/hooks`).
  - **Evidência:** Baseline inicial de 3.68% (529 clones). Com a extração dos 4 hooks de integração (`useChatwootBehaviorSettings`, `useChatwootIntegrationSettings`, `useGoogleCalendarSettings`, `useStorageSettings`) e do `ColumnToggleDropdown`, a duplicação caiu para **3.60% (517 clones, -130 linhas duplicadas)**.
  - **Arquivos:** `packages/ui/src/column-toggle-dropdown.tsx`, `apps/web/src/app/(platform)/portal/configuracoes/integrations/hooks/use-platform-settings.ts`, `apps/web/src/features/company/interface/company-tab.tsx`, `apps/web/src/features/contact/interface/contacts-tab.tsx`.
  - **Risco:** Manutenibilidade reduzida e divergência de regras entre integrações.
  - **Causa Raiz:** Duplicação de estados de formulário/I/O e seletores de colunas em código inline.
  - **Correção:** Extrair utilitários de estado e apresentação reutilizáveis.
  - **Teste:** `npm run test:web` e `npx jscpd apps packages`.
  - **Complexidade:** Média
  - **Critério de Aceite:** Redução progressiva da duplicação para menos de 3.0%.

### P3 — Baixo (Ajustes de Estilo e Alertas de Lint)
- **ID:** `STYLE-P3-001`
  - **Prioridade:** P3
  - **Status:** Concluído (100% das cores cruas Tailwind no módulo `tax` substituídas por tokens semânticos `bg-primary/10`, `text-primary`, `bg-destructive/10`, `text-destructive`, `bg-muted`, `border-border`).
  - **Evidência:** `grep_search` confirma zero ocorrências de classes de paleta de cor crua em `apps/web/src/features/tax`.
  - **Arquivos:** `tax-sync-status-bar.tsx`, `tax-rules-viewer.tsx`, `tax-ncm-lookup.tsx`, `sync-tax-button.tsx`.
  - **Risco:** Inconsistência de temas e violação das diretrizes visuais do Design System.
  - **Causa Raiz:** Uso de classes diretas do Tailwind sem tokens semânticos (`bg-muted`, `text-foreground`).
  - **Correção:** Substituir paletas brutas por tokens semânticos do Design System.
  - **Teste:** `npm run test:web` e `grep_search`.
  - **Complexidade:** Baixa
  - **Critério de Aceite:** Zero ocorrências de cores cruas no módulo tax.
