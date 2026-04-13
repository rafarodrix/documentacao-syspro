# Modulo Contracts do Monorepo

## Visao Geral

Este documento define como o package `packages/contracts` deve evoluir dentro do monorepo.

O objetivo e transformar `contracts` em um package previsivel, estavel e organizado por contexto, sem virar deposito de tipos soltos.

Regra central:

> contrato e fronteira de comunicacao. Nao e dominio, nao e infra, nao e UI.

---

# Responsabilidade do package

`packages/contracts` deve conter apenas artefatos compartilhados de fronteira:

- schemas Zod
- DTOs
- tipos de request e response
- payloads de eventos
- configuracoes compartilhadas quando elas representam contrato

`packages/contracts` nao deve conter:

- regra de negocio
- casos de uso
- services
- repositories
- adapters HTTP
- models Prisma
- componentes React
- helpers genericos sem relacao direta com contrato

---

# Estrutura oficial

O package deve crescer por contexto funcional, e nao por acumulacao na raiz.

Estrutura recomendada:

```text
packages/contracts/
  src/
    agent/
      index.ts
      heartbeat.types.ts
      desired-state.types.ts
      backup-policy.types.ts
      remote-policy.types.ts
      tunnel-policy.types.ts
    ticket/
      index.ts
      ticket-form.ts
      ticket-api.ts
      ticket-module-api.ts
      ticket-provider-api.ts
      ticket-provider-global-settings.ts
      ticket-global-settings.ts
    settings/
    shared/
    index.ts
```

Regras:

- cada contexto expone sua propria API publica por `index.ts`
- a raiz compoe os contextos e mantem compatibilidade temporaria
- contratos novos nao devem nascer soltos em `src/*.ts` se ja existe contexto adequado

---

# Regra de modularizacao

## Quando criar pasta de contexto

Criar um contexto interno novo em `contracts` quando:

- o contrato pertence a um modulo funcional claro
- ha mais de um arquivo relacionado ao mesmo assunto
- esse conjunto sera consumido por mais de um app ou package

## Quando nao criar novo package

Nao criar `packages/agent-contracts`, `packages/ticket-contracts` ou similares se o assunto continua sendo apenas contrato.

Enquanto a fronteira arquitetural continuar sendo "contratos compartilhados", o local correto e `packages/contracts/src/<contexto>/`.

---

# API publica

O consumo oficial deve priorizar:

- `@dosc-syspro/contracts/settings`
- `@dosc-syspro/contracts/ticket`
- `@dosc-syspro/contracts/company`
- `@dosc-syspro/contracts/documento`
- `@dosc-syspro/contracts/dashboard`
- `@dosc-syspro/contracts/evolution`
- `@dosc-syspro/contracts/remote`
- `@dosc-syspro/contracts/agent`

O barrel raiz `@dosc-syspro/contracts` continua existindo por compatibilidade, mas nao deve ser o padrao para novos consumidores.

Subpaths muito especificos como `@dosc-syspro/contracts/ticket-api` nao devem mais ser o padrao para novos modulos.

Objetivo:

- reduzir espalhamento de imports
- deixar claro o contexto dono do contrato
- facilitar reorganizacao interna sem quebrar consumidores

## Regra operacional

Para codigo novo:

- importar do contexto dono do contrato
- evitar importar do barrel raiz quando houver subpath claro

Para codigo legado:

- manter funcionando via barrel raiz enquanto a migracao nao terminar
- migrar gradualmente para subpaths contextuais quando o arquivo for tocado

## Compatibilidade que ainda fica no root

O root barrel ainda pode reexportar contratos por compatibilidade quando pelo menos uma destas condicoes existir:

- o contrato ainda e consumido por codigo legado
- o contrato e muito pequeno e nao merece remover a exposicao agora
- a remocao causaria churn desnecessario sem ganho arquitetural imediato

Essa tolerancia e temporaria.
O padrao oficial continua sendo consumo por contexto.

---

# Regras de dependencia

`contracts` deve depender do minimo possivel.

Permitido:

- `zod`
- utilitarios de tipagem muito neutros

Evitar:

- dependencias de infraestrutura
- dependencias de framework
- dependencias de banco

Observacao atual:

Hoje existem contratos antigos que ainda usam tipos de `@prisma/client`. Isso deve ser tratado como transicao tecnica, nao como padrao do package.

Direcao recomendada:

- substituir tipos acoplados a Prisma por enums ou tipos de contrato proprios
- deixar `contracts` independente de persistencia

---

# Politica para novos contratos

Antes de adicionar um novo arquivo em `contracts`, responder:

1. Isso e realmente um contrato compartilhado?
2. Esse artefato sera consumido fora do modulo local?
3. Ele pertence a um contexto ja existente?
4. O nome descreve a fronteira e nao a implementacao?
5. Existe dependencia tecnica indevida entrando junto?

Se a resposta da pergunta 1 for nao, o arquivo esta no package errado.

---

# Aplicacao inicial desta melhoria

Esta revisao comeca por dois movimentos:

1. consolidar `ticket` como modulo interno com barrel proprio
2. preparar `agent` como contexto explicito para os proximos contratos

Proximos passos sugeridos:

1. mover contratos soltos restantes para contextos proprios
2. revisar `company.ts` para remover acoplamento com Prisma
3. reduzir subpaths legados em favor de imports por contexto
4. documentar o contrato de cada contexto em README curto ou comentario de modulo

---

# Regra final

> novo contrato entra no contexto correto dentro de `packages/contracts`;
> novo package so deve nascer se surgir uma fronteira arquitetural diferente de "contratos compartilhados".
