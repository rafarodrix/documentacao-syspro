# packages/contracts

Pacote de contratos compartilhados entre apps e packages do monorepo.

## Responsabilidade

Este package centraliza:

- schemas Zod de entrada e saida
- tipos de fronteira
- DTOs compartilhados
- payloads de API, eventos e configuracoes compartilhadas

Este package nao deve centralizar:

- regra de negocio
- acesso a banco
- componentes de UI
- adapters de framework
- utilitarios genericos sem relacao com contrato

## Estrutura

O padrao de organizacao deve ser por contexto:

```text
src/
  agent/
  ticket/
  settings/
  shared/
  index.ts
```

Subpaths de contexto:

- `@dosc-syspro/contracts`
- `@dosc-syspro/contracts/ticket`
- `@dosc-syspro/contracts/agent`
- subpaths legados continuam expostos durante a migracao

## Regras

- cada contexto deve ter seu proprio `index.ts`
- o barrel raiz deve apenas compor a API publica
- nomes devem refletir contrato, nao implementacao
- dependencias devem ficar restritas a tipagem e validacao

## Observacao

Existe acoplamento legado em alguns contratos antigos de raiz. A direcao oficial a partir desta revisao e mover novos contratos para modulos por contexto e reduzir dependencias de infraestrutura.

## Scripts

```bash
npm run typecheck -w @dosc-syspro/contracts
```
