# Guia: Como criar um novo package no monorepo

> Atualizado em: 2026-05-05

---

## Quando criar um novo package

Crie um package quando:
- O código é compartilhado por **2 ou mais** apps ou packages
- A separação tem valor arquitetural claro (ex: isolamento de domínio)
- O código não pertence a nenhum app específico

Não crie um package para:
- Código usado em apenas um app (mantenha no app)
- Abstrações prematuras

---

## Passo 1 — Criar a estrutura

```bash
mkdir packages/<nome>
cd packages/<nome>
```

Criar `package.json`:
```json
{
  "name": "@dosc-syspro/<nome>",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  }
}
```

---

## Passo 2 — Configurar TypeScript

Criar `tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

---

## Passo 3 — Criar o index de exports

```typescript
// src/index.ts
export { minhaFuncao } from './minha-funcao'
export type { MeuTipo } from './meu-tipo'
```

---

## Passo 4 — Adicionar como dependência nos consumers

```json
// apps/api/package.json ou outro package
{
  "dependencies": {
    "@dosc-syspro/<nome>": "workspace:*"
  }
}
```

Executar `npm install` na raiz para linkar o workspace.

---

## Passo 5 — Adicionar README

Criar `packages/<nome>/README.md` com:
- O que o package faz
- O que exporta
- Quem consome

---

## Checklist

- [ ] `package.json` com nome `@dosc-syspro/<nome>`
- [ ] `tsconfig.json` estendendo `../../tsconfig.base.json`
- [ ] `src/index.ts` com exports explícitos
- [ ] Adicionado como `workspace:*` nos consumers
- [ ] `npm install` executado na raiz
- [ ] README com propósito e exports
- [ ] Documentação em `_bmad-output/03-packages/<nome>.md`
