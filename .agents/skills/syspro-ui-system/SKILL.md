---
name: syspro-ui-system
description: Diretrizes de componentes UI no front-end, patterns reutilizáveis, design system e documentação mdx.
---

# syspro-ui-system

Use esta skill em componentes React, telas do portal e documentacao MDX.

## Camadas de UI

- `@dosc-syspro/ui`: primitives reutilizaveis sem regra de negocio.
- `src/components/patterns`: composicoes compartilhadas de UI.
- `src/components/platform` e `src/features/*/interface`: componentes de feature.
- `apps/web/content/docs/**`: documentacao com Fumadocs.

## Regras

- Nao pule o pacote `@dosc-syspro/ui` importando primitives locais por fora da camada oficial.
- Componente de feature nao deve reimplementar consulta, authz ou mapper que ja existe em `application`.
- Ao encontrar duplicacao visual e comportamental, extraia primeiro para `patterns`; se for so estilo base, suba para `@dosc-syspro/ui`.
- Preserve a linguagem visual atual do portal em vez de introduzir outro design system paralelo.
- Em docs, prefira `Cards`, `Callout`, `Steps` e paginas orientadas a fluxo quando isso melhorar a leitura.

## Revisoes comuns

- estados vazios
- tabelas e filtros
- dialogs e formularios
- dashboards com cards metricos
- documentacao tecnica interna

## Validacao

- Verifique responsividade basica.
- Verifique a consistencia entre nome exibido, contrato recebido e acao do usuario.
