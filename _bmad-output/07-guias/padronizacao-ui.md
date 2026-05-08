# Guia: Padronização de UI — Trilink Design System

> Atualizado em: 2026-05-08

Referência prática para desenvolvedores que trabalham no `apps/web`. Cobre regras de uso, padrões proibidos, ferramenta de auditoria e o estado atual da migração.

---

## Princípios

1. **Um package, uma fonte** — todos os primitivos de UI vêm de `@dosc-syspro/ui`. Nunca redeclare localmente.
2. **Tokens, não valores** — cores, radii, shadows e spacing sempre via `var(--*)` ou classes Tailwind semânticas. Nunca hex literal.
3. **Inter e nada mais** — não adicione outra família tipográfica sem decisão explícita de design.
4. **Dark mode grátis** — os tokens CSS já têm `:root` e `.dark`. Componentes do `@dosc-syspro/ui` respondem automaticamente.

---

## Regras de importação

```tsx
// ✅ Tudo de @dosc-syspro/ui em um único import por arquivo
import { Button, Card, Table, Badge } from "@dosc-syspro/ui";

// ❌ Nunca de @/components/ui/*
import { Button } from "@/components/ui/button";

// ❌ Nunca múltiplos imports do mesmo package no mesmo arquivo
import { Button } from "@dosc-syspro/ui";
import { Card } from "@dosc-syspro/ui"; // ← lint error
```

---

## Cores — o que usar

### Classes Tailwind semânticas (preferidas)

| Use                             | Em vez de              | Significado                    |
|---------------------------------|------------------------|--------------------------------|
| `text-foreground`               | `text-zinc-900`        | Texto principal                |
| `text-muted-foreground`         | `text-gray-500`        | Texto secundário/meta          |
| `bg-background`                 | `bg-white`             | Fundo da página                |
| `bg-card`                       | `bg-white`             | Fundo de card                  |
| `bg-muted`                      | `bg-gray-50`           | Fundo de zona neutra           |
| `border-border`                 | `border-gray-200`      | Borda padrão                   |
| `text-primary`                  | `text-black`           | Cor primária (ações)           |
| `bg-primary text-primary-foreground` | `bg-black text-white` | Botão primário           |
| `text-destructive`              | `text-red-600`         | Erros, exclusão                |
| `ring-ring`                     | `ring-zinc-400`        | Focus ring                     |

### Exceções permitidas (com anotação)

```tsx
// Tiles de ícone com matiz (surface accent) — /10 /20 são tolerados
<div className="bg-blue-500/10 text-blue-500"> {/* ds-allow: surface accent */}

// Charts (quando var(--chart-1..5) não for suficiente)
fill="oklch(0.6 0.2 250)" // ds-allow: chart

// Estado destrutivo específico em dark
className="dark:text-red-400" // ds-allow: status
```

**Nunca** use `text-gray-500`, `bg-zinc-100`, `border-slate-200`, etc. sem `// ds-allow:`.

---

## Tipografia

### Escala de tipo (tokens)

```css
--text-display-1: 700 4.5rem/1.1 var(--font-sans);
--text-h1:        700 3rem/1.15 var(--font-sans);
--text-h2:        700 2.25rem/1.2 var(--font-sans);
--text-h3:        700 1.5rem/1.3 var(--font-sans);
--text-h4:        700 1.125rem/1.4 var(--font-sans);
--text-lead:      300 1.25rem/1.65 var(--font-sans);
--text-body:      400 1rem/1.6 var(--font-sans);
--text-caption:   500 0.75rem/1.4 var(--font-sans);
--text-eyebrow:   600 0.75rem/1.2 var(--font-sans);
```

Tags HTML `h1..h4` e `p` já recebem a escala via `globals.css`. Use classes Tailwind de tamanho (`text-sm`, `text-lg`) para ajustes, nunca `font-family` literal.

---

## Anotações ds-allow

Quando um valor específico de paleta for inevitável, adicione um comentário **na linha anterior** ao elemento (nunca dentro de JSX como `{/* */}` — causa erro de parse):

```tsx
// ✅ Comentário JS na linha anterior ao return/elemento
// ds-allow: surface accent
return <div className="bg-violet-500/10 text-violet-600">...</div>;

// ✅ Comentário JS antes de um element em JSX
{isSystemUser && (
  // ds-allow: surface accent
  <span className="text-violet-500">SYSTEM</span>
)}

// ❌ INVÁLIDO — JSX expression em posição de statement
{/* ds-allow: surface accent */}  // ← parse error em certos contextos
```

---

## Ferramenta de auditoria

```bash
# Na raiz do monorepo
npm run lint:ds

# Escopo a um diretório
bash adoption/audit.sh apps/web/src/features/tickets
```

Saída: `design-audit/` com arquivos numerados:

| Arquivo                      | Violação detectada                                 |
|------------------------------|----------------------------------------------------|
| `01-hex-colors.txt`          | Hex literal (`#fff`, `#1a1a1a`) fora de tokens.css |
| `02-tailwind-raw-palette.txt`| Classes como `text-gray-500`, `bg-zinc-100`        |
| `03-inline-styles.txt`       | `style={{ }}` nos componentes                      |
| `04-font-family.txt`         | `font-family` literal                              |
| `05-local-ui-components.txt` | Imports de `@/components/ui/`                      |

Foco: zere `01` e `05` primeiro — maior impacto visual e de manutenção.

---

## Estado atual da migração

### Concluído

| Sprint | Escopo                                          | PR   |
|--------|-------------------------------------------------|------|
| 1      | Site marketing (`(site)/`, `components/site/`)  | ✅   |
| 2      | Auth (`(autenticacao)/`, `components/auth/`)    | ✅   |
| 3      | Portal shell (sidebar, header, breadcrumbs)     | ✅   |
| 4      | Table + Separator + Skeleton (bulk 24 arquivos) | ✅   |
| 5      | Switch, Popover, ScrollArea, Checkbox, Accordion, Progress, AlertDialog (99 arquivos) | ✅ PR #81 |

### Componentes portados para `@dosc-syspro/ui`

24 componentes ativos. Ver referência completa em `03-packages/ui.md`.

### Pendente

| Item                    | Complexidade | Arquivos |
|-------------------------|-------------|---------|
| Form (react-hook-form)  | Alta        | 13      |
| Toggle                  | Baixa       | 1       |
| Calendar (react-day-picker) | Média  | 1       |

---

## Avaliação da abordagem: shadcn/ui port próprio

### Por que esta abordagem?

O `@dosc-syspro/ui` é um **shadcn/ui port mantido internamente** no monorepo. Os componentes são copiados (não instalados como dep) e customizados. Esta é a abordagem usada por Vercel, Linear, Resend e outros.

### Comparação de alternativas

| Abordagem                        | Prós                                                    | Contras                                                  |
|----------------------------------|---------------------------------------------------------|----------------------------------------------------------|
| **shadcn/ui port próprio** ← atual | Controle total; zero bloqueio de vendor; customização livre; tree-shakeable | Manutenção manual ao atualizar Radix |
| **shadcn/ui CLI direto**          | Adiciona novos componentes com um comando               | CLI copia para `src/` (não para package); requer ajuste de config no monorepo |
| **Radix Themes**                  | Design system completo; atualizações automáticas        | Visual opinativo; customização via CSS override é frágil |
| **Chakra UI / Mantine**           | Muitos componentes; docs excelentes                     | Bundle pesado; conflito de sistema de tokens; difícil adaptar ao Tailwind |
| **MUI (Material)**                | Maturidade; acessibilidade                              | Visual muito opinativo (Material Design); enorme bundle  |

### Recomendação

**Manter a abordagem atual**, com duas melhorias:

1. **Integrar a shadcn CLI** para adicionar novos componentes sem copiar manualmente:
   ```bash
   # Na raiz do monorepo, após configurar components.json em packages/ui/
   npx shadcn@latest add calendar --path packages/ui/src
   ```

2. **`components.json`** em `packages/ui/` para rastrear quais componentes foram portados e com quais customizações:
   ```json
   {
     "style": "default",
     "rsc": true,
     "tailwind": { "config": "../../apps/web/tailwind.config.ts" },
     "aliases": { "components": "@dosc-syspro/ui", "utils": "@dosc-syspro/ui/utils" }
   }
   ```

---

## Checklist de PR

```
[ ] Nenhum hex novo fora de packages/ui/src/tokens.css
[ ] Nenhum text-gray-* / bg-zinc-* sem // ds-allow: <razão>
[ ] Todos imports de UI vêm de @dosc-syspro/ui (único import por arquivo)
[ ] Tipografia via classe utilitária, não font-family literal
[ ] npm run lint:ds passa localmente
[ ] ds-allow usa // (JS comment), nunca {/* */} em posição de statement
```
