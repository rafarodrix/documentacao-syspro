# packages/ui

Pacote de primitives e componentes reutilizaveis sem dependencia de regra de negocio.

## Objetivo

Compartilhar componentes base entre apps sem arrastar regras de dominio.

## Escopo atual

- utilitario `cn`
- button
- input
- badge
- card
- label
- textarea
- table
- select
- tabs
- tooltip
- dialog / sheet / drawer
- form / label

## Camadas de componentes

```
@dosc-syspro/ui          ← primitives (Button, Card, Badge, Input…)
    ↓
src/components/patterns  ← padrões de composição (EmptyState, SectionCard, MetricCard…)
    ↓
src/components/platform  ← componentes de feature (regra de domínio permitida)
```

Componentes de feature importam de `patterns` e de `@dosc-syspro/ui`. Patterns importam apenas de `@dosc-syspro/ui`. Nenhuma camada importa de `src/components/ui/*` diretamente — use sempre o pacote.
