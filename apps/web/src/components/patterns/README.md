# patterns — camada de padrões de UI

Componentes de composição reutilizáveis para o portal autenticado. Ficam em `src/components/patterns/` e são exportados via barrel em `index.ts`.

Eles existem **acima** dos primitives de `@dosc-syspro/ui` (Button, Card, Badge…) mas **abaixo** de componentes de feature — não carregam regra de domínio, só estrutura visual padronizada.

## Quando usar patterns vs primitives

| Situação | Use |
|---|---|
| Estado vazio de lista, tabela ou seção | `EmptyState` |
| Cabeçalho de página com título, badge e ações | `PageHeader` |
| KPI ou métrica em destaque | `MetricCard` |
| Barra de busca com filtros opcionais | `SearchToolbar` |
| Grupo de abas de filtro com contadores | `FilterTabs` |
| Card com título, descrição e ação no header | `SectionCard` |
| Qualquer outra coisa | `@dosc-syspro/ui` direto |

---

## EmptyState

Estado vazio padronizado — listas, tabelas, seções sem dados.

```tsx
import { EmptyState } from "@/components/patterns";
import { Inbox } from "lucide-react";

// Mínimo
<EmptyState title="Nenhum registro encontrado." />

// Completo
<EmptyState
  icon={Inbox}
  title="Nenhum pedido em aberto"
  description="Novos pedidos aparecerão aqui quando forem criados."
  action={{ label: "Criar pedido", href: "/portal/pedidos/novo" }}
  compact
  dashed
  className="col-span-full"
/>
```

### Props

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `icon` | `ElementType` | `FileText` | Ícone do Lucide exibido no topo |
| `title` | `string` | — | **Obrigatório.** Texto principal |
| `description` | `string` | — | Texto secundário abaixo do título |
| `action` | `{ label, onClick?, href? }` | — | Botão de ação; use `href` para navegação, `onClick` para callbacks |
| `children` | `ReactNode` | — | Conteúdo extra abaixo do botão |
| `compact` | `boolean` | `false` | Reduz padding e tamanho do ícone (uso em tabelas/cards) |
| `dashed` | `boolean` | `false` | Adiciona borda pontilhada ao redor |
| `className` | `string` | — | Classes extras via `cn()` |

### Notas

- Dentro de `<TableCell colSpan={N}>` funciona corretamente (div flex-column).
- `className="py-10"` sobrescreve o padding padrão via `tailwind-merge`.
- `action.href` usa `<a>` nativo — para rotas internas prefira `href` mesmo assim (SSR friendly).

---

## PageHeader

Cabeçalho de página com título, descrição opcional, badge de status e slot de ações.

```tsx
import { PageHeader } from "@/components/patterns";
import { ShieldCheck } from "lucide-react";
import { Button } from "@dosc-syspro/ui";

<PageHeader
  title="Perfis de acesso"
  description="Gerencie permissões e papéis dos usuários do sistema."
  badge={{ icon: ShieldCheck, label: "Admin", variant: "info" }}
  actions={<Button size="sm">Novo perfil</Button>}
/>
```

### Props

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `title` | `string` | — | **Obrigatório.** `<h1>` da página |
| `description` | `string` | — | Subtítulo abaixo do título |
| `badge` | `PageHeaderBadge` | — | Badge de status no canto direito |
| `actions` | `ReactNode` | — | Slot de botões/ações no canto direito |
| `className` | `string` | — | Classes extras |

**`PageHeaderBadge`**

| Campo | Tipo | Valores |
|---|---|---|
| `label` | `string` | Texto do badge |
| `icon` | `ElementType` | Ícone opcional |
| `variant` | `string` | `"default"` `"info"` `"success"` `"warning"` `"purple"` |

---

## MetricCard

Card de KPI com valor em destaque, label, descrição e ícone com cor semântica.

```tsx
import { MetricCard } from "@/components/patterns";
import { Users } from "lucide-react";

<MetricCard
  title="Clientes ativos"
  value={1_240}
  description="vs. 1.180 no mês anterior"
  icon={Users}
  tone="success"
/>
```

### Props

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `title` | `string` | — | **Obrigatório.** Label acima do valor |
| `value` | `number \| string` | — | **Obrigatório.** Valor destacado |
| `description` | `string` | — | **Obrigatório.** Contexto abaixo do valor |
| `icon` | `ElementType` | — | **Obrigatório.** Ícone do Lucide |
| `tone` | `string` | `"neutral"` | `"info"` `"success"` `"neutral"` `"warning"` `"danger"` |
| `className` | `string` | — | Classes extras |

---

## SearchToolbar

Barra de busca com input, slot de filtros e slot de ações. Responsivo — empilha em mobile, linha em desktop.

```tsx
import { SearchToolbar } from "@/components/patterns";

<SearchToolbar
  searchValue={search}
  searchPlaceholder="Buscar por nome ou CNPJ..."
  onSearchChange={setSearch}
  resultLabel={`${filtered.length} resultado(s)`}
  filters={
    <select value={status} onChange={(e) => setStatus(e.target.value)}>
      <option value="all">Todos</option>
      <option value="active">Ativos</option>
    </select>
  }
  actions={<Button size="sm">Exportar</Button>}
/>
```

### Props

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `searchValue` | `string` | — | **Obrigatório.** Valor atual do campo |
| `onSearchChange` | `(v: string) => void` | — | **Obrigatório.** Handler de mudança |
| `searchPlaceholder` | `string` | `"Buscar..."` | Placeholder do input |
| `onClearSearch` | `() => void` | — | Handler do botão X; padrão: `onSearchChange("")` |
| `filters` | `ReactNode` | — | Selects, checkboxes ou outros filtros |
| `actions` | `ReactNode` | — | Botões no canto direito |
| `resultLabel` | `ReactNode` | — | Contador de resultados exibido à esquerda das ações |
| `className` | `string` | — | Classes extras |

---

## FilterTabs

Grupo de abas estilo pill para filtrar listas. Suporta contadores opcionais e scroll horizontal em mobile.

```tsx
import { FilterTabs } from "@/components/patterns";

type Filter = "all" | "bug" | "melhoria";

<FilterTabs
  value={activeFilter}
  onChange={setActiveFilter}
  options={[
    { value: "all",      label: "Todos",      count: total },
    { value: "bug",      label: "Bugs",       count: bugs.length },
    { value: "melhoria", label: "Melhorias",  count: melhorias.length },
  ]}
/>
```

### Props

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `options` | `FilterTabsOption[]` | — | **Obrigatório.** Lista de opções |
| `value` | `TValue` | — | **Obrigatório.** Opção ativa |
| `onChange` | `(v: TValue) => void` | — | **Obrigatório.** Handler de mudança |
| `className` | `string` | — | Classes extras |

**`FilterTabsOption`**

| Campo | Tipo | Descrição |
|---|---|---|
| `value` | `TValue` | Identificador único |
| `label` | `string` | Texto exibido |
| `count` | `number` | Contador opcional (exibido em cinza ao lado do label) |

---

## SectionCard

Card com header estruturado (título + descrição + ação) e slot de footer opcional. Substitui a combinação manual de `Card + CardHeader + CardTitle + CardContent`.

```tsx
import { SectionCard } from "@/components/patterns";
import { Button } from "@dosc-syspro/ui";
import Link from "next/link";

<SectionCard
  title="Pedidos recentes"
  description="Últimas movimentações do dia"
  action={
    <Button variant="ghost" size="sm" asChild>
      <Link href="/portal/pedidos">Ver todos</Link>
    </Button>
  }
  footer={<p className="text-xs text-muted-foreground">Atualizado há 2min</p>}
>
  {/* conteúdo do card */}
</SectionCard>
```

### Props

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `title` | `string` | — | **Obrigatório.** Título do header |
| `description` | `string` | — | Subtítulo abaixo do título |
| `action` | `ReactNode` | — | Botão ou link no canto direito do header |
| `children` | `ReactNode` | — | **Obrigatório.** Conteúdo do card |
| `footer` | `ReactNode` | — | Conteúdo do footer (com separador superior) |
| `className` | `string` | — | Classes extras no `<Card>` |
| `contentClassName` | `string` | — | Classes extras no `<CardContent>` |

### Quando não usar SectionCard

Use `Card` primitivo diretamente quando:

- O header precisa de um ícone **dentro** do `CardTitle` (`flex items-center gap-2`)
- O título usa `text-lg` ou maior
- O layout do header é mais complexo (múltiplas linhas, badges inline, avatar)
- O card não tem header (só `CardContent`)

---

## ESLint

O diretório `src/components/patterns/` tem enforcement **error** para:

- `trilink-tokens/no-hex-colors`
- `trilink-tokens/no-raw-tailwind-palette`

Use `/* eslint-disable trilink-tokens/no-raw-tailwind-palette -- motivo */` + `/* eslint-enable */` para paletas intencionais (ex: mapa de tons semânticos). O comentário `// ds-allow` só cobre a linha imediatamente seguinte — não funciona para blocos.
