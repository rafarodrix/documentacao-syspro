# Guia de Criação de Novos Packages e Novos Módulos

## Visão Geral

Este guia define **quando criar um novo package**, **quando não criar**, e **quando criar apenas um novo módulo dentro de um package já existente**.

O objetivo é evitar dois problemas comuns em monorepo:

* **explosão de packages**, onde tudo vira package sem necessidade
* **packages inchados**, onde assuntos demais são colocados juntos

A regra central é:

> novo package só deve existir quando houver uma fronteira arquitetural real, reutilização relevante ou necessidade clara de isolamento.

---

# Objetivos

## Arquiteturais

* manter o monorepo coeso
* evitar fragmentação desnecessária
* preservar fronteiras entre domínio, contrato, infra, UI e configuração
* facilitar manutenção e evolução

## Operacionais

* reduzir dúvida na hora de posicionar código
* melhorar onboarding
* evitar retrabalho estrutural
* padronizar decisões da equipe

---

# Princípio Central

## Nem tudo precisa virar package

Criar package tem custo:

* mais fronteiras para manter
* mais imports para organizar
* mais versionamento interno
* mais complexidade mental
* mais risco de dependências ruins

Por isso, o padrão deve ser:

> primeiro tentar resolver dentro do package correto já existente; só criar novo package quando houver motivo forte.

---

# Pergunta inicial obrigatória

Antes de criar um novo package, responder:

1. Esse código representa uma responsabilidade nova ou só uma extensão de algo que já existe?
2. Ele será reutilizado por múltiplos apps ou múltiplos packages?
3. Ele precisa ter dependências diferentes das do package atual?
4. Ele tem ciclo de vida próprio?
5. Existe ganho real em isolamento arquitetural?

Se a maioria das respostas for “não”, provavelmente **não é caso de novo package**.

---

# Quando criar um novo package

## 1. Quando existe uma responsabilidade arquitetural nova

Exemplo:

* surgiu um SDK oficial de consumo da API
* surgiu uma camada de persistência compartilhada
* surgiu um domínio remoto com regras próprias
* surgiu um sistema de contratos compartilhados

Nesse caso, faz sentido criar package.

---

## 2. Quando o código será reutilizado por múltiplos apps

Exemplo:

* `web` e `mobile` usam o mesmo client HTTP
* `api` e `web` usam os mesmos contratos
* vários apps usam a mesma camada visual
* `api` e `agent` compartilham contratos de heartbeat

Se o reuso é real e recorrente, package faz sentido.

---

## 3. Quando é necessário isolar dependências

Exemplo:

* código com Prisma deve ficar isolado de domínio
* código com React deve ficar fora do core
* código de integração técnica deve ficar fora do domínio

Aqui o package ajuda a proteger a arquitetura.

---

## 4. Quando existe um subdomínio forte o suficiente

Exemplo:

* módulo remoto cresce e passa a ter:

  * regras próprias
  * integrações próprias
  * fluxo próprio
  * evolução própria

Nesse caso, separar em `remote-domain` e `remote-infra` é saudável.

---

## 5. Quando o ciclo de manutenção é diferente

Exemplo:

* UI muda com frequência
* contratos precisam ser estáveis
* domínio muda em ritmo diferente da infra

Quando o ritmo de mudança é diferente, separar pode reduzir impacto.

---

# Quando NÃO criar um novo package

## 1. Quando é apenas um novo arquivo ou novo módulo do mesmo domínio

Exemplo:

* um novo tipo de ticket
* uma nova policy de backup
* uma nova configuração de settings

Isso normalmente deve entrar como **módulo interno** no package existente.

---

## 2. Quando o código ainda não provou reuso

Não crie package “porque talvez no futuro seja reutilizado”.

Primeiro deixe o código amadurecer.
Se o reuso se confirmar, extraia depois.

---

## 3. Quando a motivação é só “organizar melhor”

Organização interna pode ser resolvida com:

* pastas
* módulos
* submódulos
* `index.ts`
* convenções internas

Nem toda necessidade de organização exige package novo.

---

## 4. Quando o package ficaria pequeno demais ou artificial

Exemplo ruim:

* `packages/date-utils`
* `packages/string-utils`
* `packages/ticket-status`

Isso tende a fragmentar demais.

---

## 5. Quando a fronteira é técnica, mas não arquitetural

Exemplo:

* separar um package só porque um arquivo ficou grande

Melhor reorganizar internamente primeiro.

---

# Regra de Decisão

## Criar novo package

Quando houver:

* responsabilidade própria
* reuso relevante
* dependências específicas
* isolamento desejável
* fronteira estável

## Criar novo módulo dentro de package existente

Quando houver:

* extensão natural do mesmo domínio
* baixa complexidade
* reuso ainda restrito
* dependências iguais ao package atual

---

# O que é um módulo

Dentro deste monorepo, **módulo** significa uma subdivisão interna de um package ou app, organizada por domínio ou funcionalidade.

Exemplos:

```text
packages/contracts/src/ticket/
packages/core/src/ticket/
packages/database/src/ticket/
apps/api/src/modules/ticket/
```

Todos esses são módulos relacionados ao mesmo contexto, mas em camadas diferentes.

---

# Regra prática: package ou módulo?

## É a mesma responsabilidade, só crescendo?

→ módulo

## É uma nova fronteira arquitetural?

→ package

---

# Exemplos práticos

## Exemplo 1 — Novo payload de Evolution

Você quer adicionar webhook novo da Evolution.

### Correto

Adicionar em:

```text
packages/contracts/src/evolution/
```

### Errado

Criar:

```text
packages/evolution-contracts/
```

Motivo: continua sendo contrato, dentro do mesmo domínio.

---

## Exemplo 2 — Nova regra de negócio de ticket

Você quer criar cálculo de SLA.

### Correto

Adicionar em:

```text
packages/core/src/ticket/
```

### Errado

Criar:

```text
packages/ticket-core/
```

Motivo: continua sendo domínio do sistema, não um package novo.

---

## Exemplo 3 — Nova integração técnica do módulo remoto

Você vai integrar Rathole e RustDesk com adapters concretos.

### Correto

Adicionar em:

```text
packages/remote-infra/
```

com submódulos:

```text
rathole/
rustdesk/
```

### Errado

Criar package novo para cada provider logo de início.

---

## Exemplo 4 — SDK para consumo por web e mobile

Você precisa de um client tipado compartilhado.

### Correto

Criar:

```text
packages/sdk/
```

Motivo: há uma fronteira clara, reuso entre apps e responsabilidade própria.

---

# Critérios oficiais para criar novo package

Um novo package só deve ser criado quando atender pelo menos **3 dos critérios abaixo**:

* será usado por mais de um app
* tem responsabilidade claramente distinta
* possui dependências próprias
* precisa ser isolado por arquitetura
* tem expectativa real de crescimento
* não cabe bem em package existente
* melhora a clareza geral do monorepo

Se atender só 1 ou 2, geralmente deve virar módulo, não package.

---

# Estrutura recomendada para novos packages

Todo novo package deve nascer com uma estrutura mínima previsível.

## Estrutura base

```text
packages/nome-do-package/
  src/
    index.ts
  package.json
  tsconfig.json
  README.md
```

---

## Estrutura expandida

Quando fizer sentido:

```text
packages/nome-do-package/
  src/
    modules/
    types/
    services/
    utils/
    index.ts
  package.json
  tsconfig.json
  README.md
```

---

# Requisitos mínimos de um novo package

Todo package novo deve ter:

## 1. Nome claro

O nome deve explicar a responsabilidade.

### Bom

* `contracts`
* `sdk`
* `database`
* `remote-infra`

### Ruim

* `common`
* `helpers`
* `base`
* `misc`

---

## 2. API pública explícita

Usar `src/index.ts` como ponto de entrada.

---

## 3. README interno

Cada package deve explicar:

* objetivo
* o que pode entrar
* o que não pode entrar
* exemplos de uso
* dependências permitidas

---

## 4. Fronteira definida

Deve estar claro:

* quem pode importar esse package
* de quem ele pode depender

---

## 5. Coesão

Tudo dentro do package deve pertencer ao mesmo propósito.

---

# Estrutura interna recomendada por tipo de package

## Contracts

```text
src/
  shared/
  ticket/
  settings/
  evolution/
  agent/
  index.ts
```

## Core

```text
src/
  entities/
  value-objects/
  use-cases/
  services/
  policies/
  ports/
  index.ts
```

## Database

```text
src/
  prisma/
  repositories/
  mappers/
  clients/
  index.ts
```

## SDK

```text
src/
  client/
  modules/
  auth/
  serializers/
  index.ts
```

## UI

```text
src/
  components/
  hooks/
  providers/
  tokens/
  index.ts
```

## Remote Infra

```text
src/
  rathole/
  rustdesk/
  providers/
  adapters/
  index.ts
```

---

# Quando extrair um módulo para novo package

Às vezes algo começa como módulo e depois merece virar package.

Isso deve acontecer quando o módulo:

* cresce muito
* passa a ser reutilizado por vários apps
* tem dependências próprias
* começa a poluir o package original
* ganha autonomia arquitetural

---

## Sinais de que está na hora de extrair

### 1. O módulo tem imports demais para fora

Exemplo:

* módulo de ticket dentro de `core` começa a depender de muita infra e contratos específicos

### 2. O módulo já tem submódulos próprios

Exemplo:

* `remote` passa a ter:

  * túnel
  * acesso remoto
  * healthcheck
  * políticas
  * providers
  * eventos

### 3. O módulo tem ritmo de evolução próprio

Exemplo:

* integração remota cresce muito mais que o restante do sistema

### 4. O package atual ficou heterogêneo

Exemplo:

* um package mistura responsabilidades demais

---

# Quando NÃO extrair ainda

Não extraia package se:

* a dor é só estética
* o módulo ainda é pequeno
* o reuso não aconteceu
* a fronteira ainda está confusa
* você ainda não sabe o nome ideal do package

---

# Fluxo oficial de decisão

## Passo 1 — identificar a natureza

Perguntar:

* é contrato?
* é domínio?
* é persistência?
* é UI?
* é integração?
* é utilitário transversal?

## Passo 2 — tentar encaixar em package existente

Sempre começar por aqui.

## Passo 3 — avaliar fronteira

Perguntar:

* esse código tem responsabilidade própria?

## Passo 4 — avaliar reuso

Perguntar:

* ele será consumido por mais de um app ou contexto?

## Passo 5 — decidir

* se sim → package novo
* se não → módulo interno

---

# Convenções para módulos internos

Quando não houver package novo, organizar por módulo.

## Exemplo em `core`

```text
core/src/
  ticket/
  company/
  settings/
  remote/
```

## Exemplo em `database`

```text
database/src/
  ticket/
  company/
  settings/
```

## Exemplo em `sdk`

```text
sdk/src/
  ticket/
  company/
  agent/
```

---

# Padrão de nomes

## Packages

Usar nomes curtos, estáveis e sem ambiguidade.

### Recomendado

* `sdk`
* `contracts`
* `database`
* `remote-domain`
* `remote-infra`

### Evitar

* `utils-plus`
* `common-lib`
* `helpers-core`
* `api-stuff`

---

## Módulos

Usar nomes de domínio.

### Recomendado

* `ticket`
* `company`
* `agent`
* `backup`
* `remote`

### Evitar

* `misc`
* `general`
* `others`
* `temp`

---

# Anti-patterns

## 1. Package por provider cedo demais

Exemplo ruim:

* `packages/rathole`
* `packages/rustdesk`
* `packages/evolution`
* `packages/chatwoot`

Sem necessidade real, isso fragmenta demais.

Melhor:

* contratos em `contracts/evolution`
* domínio em `remote-domain`
* implementação em `remote-infra`

---

## 2. Package por entidade simples

Exemplo ruim:

* `packages/company`
* `packages/ticket`
* `packages/user`

No seu caso atual, isso não é necessário.
Esses contextos funcionam melhor como módulos dentro dos packages arquiteturais.

---

## 3. Criar package para “organizar imports”

Imports se organizam com:

* aliases
* `index.ts`
* módulos internos

Não com package novo sem motivo.

---

## 4. Shared virar justificativa para não decidir

Quando alguém diz “coloca em shared”, normalmente ainda não decidiu a fronteira correta.

---

# Checklist antes de criar package novo

Responda “sim” ou “não”:

* isso será usado por múltiplos apps?
* existe uma responsabilidade própria?
* há dependências específicas?
* a separação melhora a arquitetura?
* o package atual ficaria melhor sem isso?
* essa fronteira deve durar no tempo?

Se a maioria for “sim”, faz sentido criar.

---

# Processo recomendado para criação de novo package

## 1. Definir nome e responsabilidade

Exemplo:

* nome: `sdk`
* responsabilidade: cliente oficial de consumo da API

## 2. Definir dependências permitidas

Exemplo:

* pode depender de `contracts`, `shared`, `config`

## 3. Definir dependências proibidas

Exemplo:

* não pode depender de `database`, `ui`

## 4. Criar estrutura mínima

```text
src/index.ts
README.md
package.json
tsconfig.json
```

## 5. Criar documentação curta

Explicar:

* para que serve
* o que entra
* o que não entra

## 6. Expor API pública

Nada de importar arquivos internos direto.

---

# Recomendação oficial para o seu monorepo atual

Hoje, a estrutura correta é continuar com:

```text
packages/
  sdk/
  config/
  contracts/
  core/
  database/
  remote-domain/
  remote-infra/
  shared/
  ui/
```

E organizar crescimento por **módulos internos**, não por novos packages, salvo exceções reais.

---

# Regra prática para a equipe

## Criar package novo

Somente quando houver:

* nova fronteira arquitetural
* reuso relevante
* isolamento necessário

## Criar módulo novo

Na maioria dos casos de crescimento normal do sistema.

---

# Exemplos práticos aplicados ao seu cenário

## Desejo: adicionar contratos do Agent

### Decisão

Não criar `packages/agent-contracts`

### Correto

Adicionar em:

```text
packages/contracts/src/agent/
```

---

## Desejo: adicionar regra de desired state

### Decisão

Não criar `packages/agent-core`

### Correto

Adicionar em:

```text
packages/core/src/agent/
```

ou manter específico no agent se não houver compartilhamento real.

---

## Desejo: adicionar integração com RustDesk

### Decisão

Não criar `packages/rustdesk`

### Correto

Adicionar em:

```text
packages/remote-infra/src/rustdesk/
```

---

## Desejo: adicionar tela de monitoramento remoto

### Decisão

Não criar package novo

### Correto

Adicionar no `apps/web` e reaproveitar `contracts`, `sdk` e `ui`

---

# Conclusão

A criação de package novo deve ser uma **decisão arquitetural**, não organizacional.

A regra oficial fica:

> se a responsabilidade já cabe em um package existente, criar módulo;
> se existe uma nova fronteira real, criar package.

Isso mantém o monorepo:

* limpo
* estável
* previsível
* escalável

---
