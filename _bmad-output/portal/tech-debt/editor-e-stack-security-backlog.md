# Backlog Tecnico: Editor e Stack Web

## P1 - Substituir Quill / react-quill-new

- Contexto: o editor rico dos tickets ainda depende de `react-quill-new`, que por sua vez depende de `quill`.
- Risco atual: historico de vulnerabilidades XSS no ecossistema Quill.
- Mitigacao ja aplicada:
  - sanitizacao do HTML renderizado em `TicketChat.tsx`
  - remocao de `react-quill` legado
- Proximo passo:
  - mapear editor substituto compativel com React 19
  - priorizar editor com modelo estruturado em vez de HTML livre
- Candidatos para avaliacao:
  - TipTap
  - Lexical
  - Slate

## P2 - Upgrade de Next / Fumadocs / PostCSS

- Contexto: o `npm audit` ainda aponta `postcss` na cadeia de `next` e `fumadocs`.
- Risco atual: vulnerabilidade moderada herdada da stack de build/render.
- Restricao:
  - `npm audit fix --force` sugere upgrade com quebra em `fumadocs-ui`
- Proximo passo:
  - abrir branch de upgrade isolada
  - validar compatibilidade de:
    - `next`
    - `fumadocs-core`
    - `fumadocs-ui`
    - `fumadocs-mdx`

## P3 - Atualizar cadeia de tooling do Nest CLI

- Contexto: `picomatch` vulneravel vem de `@nestjs/cli` via `@angular-devkit`.
- Risco atual: baixo para runtime do portal, mais relevante para tooling.
- Proximo passo:
  - revisar versao mais nova do `@nestjs/cli`
  - validar se a cadeia remove `picomatch` vulneravel sem impacto no build da API

## Observacoes

- Nao usar `npm audit fix --force` no branch principal sem rodada de validacao.
- A prioridade funcional imediata continua sendo Quill, porque ele afeta runtime e renderizacao de conteudo.
