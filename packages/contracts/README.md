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

- `@dosc-syspro/contracts/settings`
- `@dosc-syspro/contracts/ticket`
- `@dosc-syspro/contracts/company`
- `@dosc-syspro/contracts/documento`
- `@dosc-syspro/contracts/dashboard`
- `@dosc-syspro/contracts/evolution`
- `@dosc-syspro/contracts/remote`
- `@dosc-syspro/contracts/agent`
- `@dosc-syspro/contracts/sefaz-routes`
- `@dosc-syspro/contracts/sefaz-endpoints`
- `@dosc-syspro/contracts/platform-notifications`

## Regras

- cada contexto deve ter seu proprio `index.ts`
- o barrel raiz deve apenas compor a API publica
- nomes devem refletir contrato, nao implementacao
- dependencias devem ficar restritas a tipagem e validacao

## Politica de imports

Novo consumo deve sempre preferir imports por contexto.

Exemplos recomendados:

- `@dosc-syspro/contracts/settings`
- `@dosc-syspro/contracts/ticket`
- `@dosc-syspro/contracts/evolution`
- `@dosc-syspro/contracts/remote`

Uso do barrel raiz `@dosc-syspro/contracts` deve ficar restrito a:

- compatibilidade com codigo legado
- contratos pequenos e isolados que ainda nao justificam contexto proprio
- casos em que um consumidor realmente precisa compor varios contextos ao mesmo tempo

## Compatibilidade atual

No estado atual, o barrel raiz ainda vale manter para compatibilidade destes grupos:

- `settings`
- `company`
- `documento`
- `user`
- `ticket`
- `agent`
- `evolution`
- `remote`
- `dashboard`
- `sefaz-routes`
- `sefaz-endpoints`
- `address`
- `platform-notifications`

Essa lista nao e uma recomendacao de uso.
Ela apenas define o que continua exposto para nao quebrar consumidores existentes.

## Observacao

Existe acoplamento legado em alguns contratos antigos de raiz. A direcao oficial a partir desta revisao e mover novos contratos para modulos por contexto e reduzir dependencias de infraestrutura.

## Scripts

```bash
npm run typecheck -w @dosc-syspro/contracts
```
