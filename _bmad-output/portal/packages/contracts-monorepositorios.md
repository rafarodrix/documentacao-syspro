# Package Contracts do Monorepo

## Visao Geral

Este documento define como o package `packages/contracts` deve evoluir dentro do monorepo.

O objetivo e manter `contracts` como um package previsivel, estavel e organizado por contexto, sem virar deposito de tipos soltos.

Regra central:

> `contracts` e fronteira de comunicacao. Nao e dominio, nao e infra, nao e UI.

---

# Responsabilidade do package

`packages/contracts` deve conter apenas artefatos compartilhados de fronteira:

- tipos compartilhados
- DTOs compartilhados
- payloads de request e response
- eventos
- webhooks
- contratos de integracao
- metadados e estruturas compartilhadas quando elas representam contrato

`packages/contracts` nao deve conter:

- regra de negocio
- casos de uso
- services
- repositories
- adapters HTTP
- models Prisma
- componentes React
- DTOs internos exclusivos do NestJS
- helpers genericos sem relacao direta com contrato

---

# Estrutura oficial

O package deve crescer por contexto funcional, e nao por acumulacao na raiz.

Estrutura recomendada:

```text
packages/contracts/
  src/
    shared/
      primitives.types.ts
      pagination.types.ts
      api-response.types.ts
      metadata.types.ts
      index.ts

    company/
      company.types.ts
      address.types.ts
      index.ts

    user/
      user.types.ts
      index.ts

    ticket/
      ticket.types.ts
      ticket-form.types.ts
      ticket-api.types.ts
      ticket-module-api.types.ts
      ticket-provider-api.types.ts
      ticket-global-settings.types.ts
      ticket-provider-global-settings.types.ts
      index.ts

    settings/
      settings.types.ts
      settings-permissions.types.ts
      settings-admin-view.types.ts
      index.ts

    dashboard/
      dashboard.types.ts
      platform-notifications.types.ts
      index.ts

    documento/
      documento.types.ts
      documento-config.types.ts
      index.ts

    evolution/
      evolution-settings.types.ts
      evolution-webhook.types.ts
      index.ts

    sefaz/
      sefaz-endpoints.types.ts
      sefaz-routes.types.ts
      index.ts

    remote/
      remote-module-settings.types.ts
      index.ts

    agent/
      agent.types.ts
      heartbeat.types.ts
      desired-state.types.ts
      backup-policy.types.ts
      tunnel-policy.types.ts
      remote-policy.types.ts
      index.ts

    index.ts
```

Regras:

- cada contexto expoe sua propria API publica por `index.ts`
- a raiz compoe os contextos e pode manter compatibilidade temporaria
- contratos novos nao devem nascer soltos em `src/*.ts` se ja existe contexto adequado
- nomes de arquivo em `contracts` devem seguir `kebab-case` com sufixo semantico

---

# Convencao de nomenclatura

Em `packages/contracts`, os arquivos devem deixar claros:

- o dominio
- o papel do contrato

Padroes recomendados:

- `*.types.ts`
- `*.dto.ts`
- `*.api.types.ts`
- `*.webhook.types.ts`
- `*.event.types.ts`

Exemplos corretos:

- `ticket.types.ts`
- `ticket-form.types.ts`
- `ticket-provider-api.types.ts`
- `evolution-webhook.types.ts`
- `desired-state.types.ts`

Exemplos que fogem do padrao:

- `ticket-form.ts`
- `ticket-api.ts`
- `types.ts`
- `model.ts`
- `data.ts`

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

O consumo oficial deve priorizar subpaths por contexto:

- `@dosc-syspro/contracts/shared`
- `@dosc-syspro/contracts/company`
- `@dosc-syspro/contracts/user`
- `@dosc-syspro/contracts/ticket`
- `@dosc-syspro/contracts/settings`
- `@dosc-syspro/contracts/dashboard`
- `@dosc-syspro/contracts/documento`
- `@dosc-syspro/contracts/evolution`
- `@dosc-syspro/contracts/sefaz`
- `@dosc-syspro/contracts/remote`
- `@dosc-syspro/contracts/agent`

O barrel raiz `@dosc-syspro/contracts` pode continuar existindo por compatibilidade, mas nao deve ser o padrao para novos consumidores.

Subpaths muito especificos como `@dosc-syspro/contracts/ticket-api` nao devem ser o padrao para novos modulos. O contexto dono do contrato deve ser a fronteira publica.

Objetivos:

- reduzir espalhamento de imports
- deixar claro o contexto dono do contrato
- facilitar reorganizacao interna sem quebrar consumidores

## Regra operacional

Para codigo novo:

- importar do contexto dono do contrato
- evitar importar do barrel raiz quando houver subpath claro
- evitar imports profundos para arquivos internos do package

Para codigo legado:

- manter funcionando via barrel raiz enquanto a migracao nao terminar
- migrar gradualmente para subpaths contextuais quando o arquivo for tocado

## Compatibilidade que ainda fica no root

O root barrel ainda pode reexportar contratos por compatibilidade quando pelo menos uma destas condicoes existir:

- o contrato ainda e consumido por codigo legado
- o contrato e pequeno o suficiente para manter a exposicao sem ambiguidade
- a remocao causaria churn desnecessario sem ganho arquitetural imediato

Essa tolerancia e temporaria.
O padrao oficial continua sendo consumo por contexto.

---

# Regras de dependencia

`contracts` deve depender do minimo possivel.

Permitido:

- nenhuma dependencia interna do monorepo, idealmente
- `shared`, apenas para utilitarios de tipagem muito neutros e com muito cuidado
- bibliotecas de validacao ou tipagem, somente quando realmente fizerem parte do contrato publicado

Proibido:

- dependencias de infraestrutura
- dependencias de framework de aplicacao
- dependencias de banco
- dependencias de UI
- dependencias de `core`
- dependencias de `remote-domain`
- dependencias de `remote-infra`

Observacao atual:

Se ainda existirem contratos antigos usando tipos de `@prisma/client`, isso deve ser tratado como transicao tecnica, nao como padrao do package.

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
5. O arquivo segue o padrao de nomenclatura da camada?
6. Existe dependencia tecnica indevida entrando junto?

Se a resposta da pergunta 1 for nao, o arquivo esta no package errado.

---

# Aplicacao inicial desta melhoria

Esta revisao deve comecar por estes movimentos:

1. consolidar cada contrato dentro do contexto funcional correto
2. corrigir nomes de arquivos que ainda nao usam sufixo semantico
3. reforcar `agent` como contexto explicito para contratos do Agent
4. reduzir imports legados em favor de subpaths por contexto

Proximos passos sugeridos:

1. mover contratos soltos restantes para contextos proprios
2. revisar contratos acoplados a Prisma e remover esse acoplamento
3. garantir `index.ts` em todos os contextos relevantes
4. documentar rapidamente o objetivo de cada contexto em README curto ou comentario de modulo

---

# Regra final

> novo contrato entra no contexto correto dentro de `packages/contracts`;
> novo package so deve nascer se surgir uma fronteira arquitetural diferente de "contratos compartilhados".
