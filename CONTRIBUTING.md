# Trilink Design System — Guia de Contribuicao e Migracao

Este guia mora idealmente em `CONTRIBUTING.md` na raiz do monorepo `documentacao-syspro`. Ele e o **manual de adocao** do design system.

---

## TL;DR

1. **Cores, fontes, radii, sombras, spacing** → SEMPRE de `var(--*)`. Nunca hex literal, nunca `text-gray-500`.
2. **Componentes de UI** (Button, Card, Input, Badge, Dialog, Select, Tabs, Tooltip) → SEMPRE de `@dosc-syspro/ui`. Nunca redeclare local.
3. **Tipografia** → use as classes utilitarias (`.eyebrow`, `.lead`, `.caption`) ou as escalas `--text-*`. Nunca `font-family` literal.
4. **Antes de mergear**: rode `pnpm lint:ds` localmente. CI tambem roda.

---

## Tokens — fonte unica de verdade

Arquivo canonico: **`packages/ui/src/tokens.css`**.

E re-exportado por `packages/ui/src/index.ts` e importado por `apps/web/src/app/globals.css`:

```css
@import "@dosc-syspro/ui/tokens.css";
```

### Como usar tokens em CSS

```css
/* OK */
.card { background: var(--card); color: var(--card-foreground); border-radius: var(--radius-lg); }

/* PROIBIDO */
.card { background: #ffffff; color: #0a0a0a; border-radius: 10px; }
```

### Como usar tokens com Tailwind

Tokens semanticos ja estao registrados no `tailwind.config.ts` (via `theme.extend.colors`). Use as classes:

| Use isto                    | Em vez de              | Significado                   |
| --------------------------- | ---------------------- | ----------------------------- |
| `text-foreground`           | `text-zinc-900`        | Cor de texto principal        |
| `text-muted-foreground`     | `text-gray-500`        | Texto secundario/meta         |
| `bg-background`             | `bg-white`             | Fundo da pagina               |
| `bg-card`                   | `bg-white`             | Fundo de card                 |
| `bg-muted`                  | `bg-gray-50`           | Fundo de zona neutra          |
| `border-border`             | `border-gray-200`      | Borda padrao                  |
| `text-primary`              | `text-black`           | Cor primaria (acoes)          |
| `bg-primary text-primary-foreground` | `bg-black text-white` | Botao primario        |
| `text-destructive`          | `text-red-600`         | Erros, exclusao               |
| `ring-ring`                 | `ring-zinc-400`        | Focus ring                    |

### Quando posso usar a paleta crua do Tailwind?

**Quase nunca.** As excecoes legitimas sao:

1. **Charts** (`Recharts`, `tremor`) — use `var(--chart-1..5)` se possivel; senao a paleta Tailwind 500/600 e tolerada com comentario `// ds-allow: chart`.
2. **Per-surface accents** (icon tiles em landing/dashboard cards). Use `bg-blue-500/10 text-blue-500` — esses utilitarios `/10 /20` em cima de paleta sao OK porque servem ao sistema de "tile com matiz". O linter os ignora.
3. **States destrutivos especificos** quando `--destructive` nao basta (ex.: `text-red-700` em zona dark). Sempre com `// ds-allow: <razao>`.

---

## Componentes — sempre via `@dosc-syspro/ui`

### Lista atual (apos esta adocao)

| Primitivo  | Status      | Origem                 |
| ---------- | ----------- | ---------------------- |
| Button     | Estavel     | `@dosc-syspro/ui`      |
| Badge      | Estavel     | `@dosc-syspro/ui`      |
| Card*      | Estavel     | `@dosc-syspro/ui`      |
| Input      | Estavel     | `@dosc-syspro/ui`      |
| Label      | Estavel     | `@dosc-syspro/ui`      |
| Textarea   | Estavel     | `@dosc-syspro/ui`      |
| Dialog     | **Novo**    | `@dosc-syspro/ui`      |
| Select     | **Novo**    | `@dosc-syspro/ui`      |
| Tabs       | **Novo**    | `@dosc-syspro/ui`      |
| Tooltip    | **Novo**    | `@dosc-syspro/ui`      |

A roadmap inclui: Sheet, Popover, DropdownMenu, Accordion, Avatar, Alert, Separator, Skeleton, Sidebar, DataTable.

### Exemplo de migracao

**Antes** (`apps/web/src/components/site/hero-section.tsx`):

```tsx
import { Button } from "@/components/ui/button";

<Button className="bg-blue-600 hover:bg-blue-700 text-white">Comecar</Button>
```

**Depois**:

```tsx
import { Button } from "@dosc-syspro/ui";

<Button>Comecar</Button>   {/* variant default ja e bg-primary text-primary-foreground */}
```

### Quando criar um componente novo?

Antes de criar um wrapper local em `src/components/ui/`, pergunte:

- E uma **composicao** de primitivos? OK criar local em `src/components/<feature>/`.
- E um **primitivo novo** que outros apps vao usar? Crie em `packages/ui/src/` e exporte do `index.ts`. Adicione PR ao roadmap acima.

---

## Tipografia

Fonte unica: **Inter** (variable, do Google Fonts). Nao adicione outras familias sem decisao explicita do design.

### Escala

```css
.h1 { font: var(--text-h1); letter-spacing: var(--tracking-tight); }
.h2 { font: var(--text-h2); letter-spacing: var(--tracking-tight); }
.lead { font: var(--text-lead); color: var(--muted-foreground); }
.eyebrow { font: var(--text-eyebrow); color: var(--muted-foreground);
           text-transform: uppercase; letter-spacing: var(--tracking-wide); }
```

Tags HTML (`h1`, `h2`, `h3`, `h4`, `p`) ja vem com a escala aplicada. Sobrescreva apenas com utilitarios Tailwind quando necessario, nao com hex/font-family literal.

---

## Spacing

Use as classes Tailwind padrao (`p-4`, `gap-6`, `mt-12`). Equivalencias dos tokens em `tokens.css`:

| Token         | Tailwind | Px  |
| ------------- | -------- | --- |
| `--space-1`   | `p-1`    | 4   |
| `--space-2`   | `p-2`    | 8   |
| `--space-4`   | `p-4`    | 16  |
| `--space-6`   | `p-6`    | 24  |
| `--space-8`   | `p-8`    | 32  |
| `--space-12`  | `p-12`   | 48  |
| `--space-24`  | `p-24`   | 96  |

Nao use `style={{ padding: '13px' }}` ou margens magicas em px.

---

## Lint e CI

### Local

```bash
pnpm lint:ds        # ESLint + Stylelint configurados
pnpm lint:ds:fix    # auto-fix onde possivel
```

### CI (`.github/workflows/lint.yml`)

```yaml
- run: pnpm install
- run: pnpm lint:ds
- run: pnpm stylelint "**/*.{css,scss}"
```

### Como suprimir uma regra (raro)

Adicione um comentario na linha:

```tsx
<div className="bg-emerald-500/10 text-emerald-600">  {/* ds-allow: surface accent */}
```

Comentarios `ds-allow:` sao auditados em PR review.

---

## Migracao por sprint

### Sprint 1 — Site marketing
- `src/app/(site)/**` + `src/components/site/**`
- Substituir `@/components/ui/*` por `@dosc-syspro/ui` onde ja exportado.
- Rodar audit; reduzir `01-hex-colors.txt` para zero nessa pasta.

### Sprint 2 — Auth
- `src/app/(autenticacao)/**` + `src/components/auth/**`.

### Sprint 3 — Portal shell
- `src/components/platform/app/layout/*` (sidebar, header, breadcrumbs).
- Esta sprint pode portar Sidebar para `packages/ui` se valer reuso.

### Sprint 4..N — Modulos do portal
- `atendimento`, `cadastros`, `comercial`, `financeiro`, `configuracoes`. Um por sprint.

### Sprint final — Chatwoot embed
- `src/app/(platform)/chatwoot/**`. Iframe, menor risco de UI.

Cada sprint termina com:
1. Audit count zerado (ou justificado) para o escopo.
2. Screenshot before/after no PR.
3. Storybook atualizado se um primitivo novo subiu.

---

## Checklist de PR

```
[ ] Nenhum hex novo fora de packages/ui/src/tokens.css
[ ] Nenhum text-gray-* / bg-zinc-* / etc sem // ds-allow
[ ] Componentes de UI vem de @dosc-syspro/ui (ou justificado)
[ ] Tipografia via classe utilitaria, nao font-family literal
[ ] pnpm lint:ds passa
[ ] Screenshots before/after se a mudanca afeta UI
```

---

## Como rodar a auditoria inicial

```bash
bash adoption/audit.sh
# saida em design-audit/
```

Os arquivos numerados (01..08) listam violacoes por categoria. Comece pela #02 (palette crua) e #05 (componentes locais) — sao as de maior impacto.