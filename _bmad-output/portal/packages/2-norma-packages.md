# Norma de Dependência entre Packages

## Visão Geral

Esta norma define **quem pode importar quem** dentro do monorepo da Trilink.

O objetivo não é apenas organizar imports.
O objetivo é **preservar a arquitetura ao longo do tempo**.

Sem regra de dependência, o monorepo tende a degradar para:

* acoplamento excessivo
* imports cruzados confusos
* vazamento de responsabilidade entre camadas
* dificuldade para testar, refatorar e escalar

A regra central é:

> dependências devem seguir a direção da arquitetura, nunca a conveniência momentânea.

---

# Objetivos

## Arquiteturais

* preservar separação entre domínio, infraestrutura, UI e contratos
* impedir ciclos entre packages
* manter o domínio estável e independente
* evitar que packages virem acoplados entre si

## Operacionais

* facilitar manutenção
* facilitar onboarding
* tornar refatorações mais seguras
* reduzir retrabalho arquitetural

---

# Estrutura considerada

A norma considera esta estrutura como base oficial:

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

e também os apps:

```text
apps/
  api/
  web/
  mobile/
  agent/
```

---

# Princípios Gerais

## 1. Dependência aponta para menor acoplamento

Packages mais concretos podem depender de packages mais estáveis.
Packages mais estáveis não devem depender dos mais concretos.

## 2. Contrato não depende de implementação

`contracts` não pode conhecer banco, UI, infra ou framework.

## 3. Domínio não depende de framework

`core` e `remote-domain` não devem depender de React, NestJS, Prisma, HTTP client ou biblioteca de infra.

## 4. Infra implementa domínio

`database`, `sdk` e `remote-infra` podem depender de domínio e contratos, nunca o contrário.

## 5. UI consome contrato, não persistência

`ui`, `web` e `mobile` podem conhecer contratos e SDK, mas não detalhes de banco.

## 6. Shared deve ser neutro

`shared` deve ser transversal e agnóstico.
Ele não deve depender de packages de domínio ou infraestrutura.

---

# Classificação dos Packages

## Camada 1 — Fundacional

Packages estáveis e transversais:

* `shared`
* `config`
* `contracts`

## Camada 2 — Domínio

Packages com regra de negócio:

* `core`
* `remote-domain`

## Camada 3 — Infraestrutura e consumo

Packages concretos:

* `database`
* `sdk`
* `remote-infra`
* `ui`

## Camada 4 — Aplicações

Entradas finais do sistema:

* `apps/api`
* `apps/web`
* `apps/mobile`
* `apps/agent`

---

# Regra Macro de Direção

A direção recomendada é:

```text
apps → packages concretos → domínio → fundação
```

Mais detalhado:

```text
apps
  ↓
sdk / database / remote-infra / ui
  ↓
core / remote-domain
  ↓
contracts / shared / config
```

Com uma observação importante:

* `contracts` não é “base técnica”, mas é base de comunicação
* `core` pode usar `contracts` com moderação quando o contrato for realmente parte do domínio compartilhado
* o ideal é evitar que `core` fique excessivamente acoplado a DTOs

---

# Matriz Oficial de Dependência

## Legenda

* ✅ permitido
* ⚠️ permitido com cuidado
* ❌ proibido

---

## `packages/contracts`

Pode depender de:

* `shared` ⚠️ apenas utilitários de tipagem muito neutros
* `config` ❌
* `core` ❌
* `database` ❌
* `sdk` ❌
* `ui` ❌
* `remote-domain` ❌
* `remote-infra` ❌

### Regra

`contracts` deve ser quase isolado.

### Recomendação

Sempre que possível, `contracts` deve depender de ninguém.

---

## `packages/shared`

Pode depender de:

* nenhum outro package, preferencialmente

### Regra

`shared` deve ser totalmente neutro.

### Proibido depender de:

* `contracts`
* `core`
* `database`
* `sdk`
* `ui`
* `remote-domain`
* `remote-infra`

---

## `packages/config`

Pode depender de:

* `shared` ✅

### Proibido depender de:

* `contracts` ⚠️ evitar
* `core`
* `database`
* `sdk`
* `ui`
* `remote-domain`
* `remote-infra`

### Regra

`config` deve permanecer infraestrutural e neutro.

---

## `packages/core`

Pode depender de:

* `shared` ✅
* `contracts` ⚠️ com moderação
* `config` ⚠️ apenas abstrações neutras, não configs concretas

### Proibido depender de:

* `database`
* `sdk`
* `ui`
* `remote-domain` ⚠️ salvo se houver composição arquitetural explícita
* `remote-infra`

### Regra

`core` não conhece implementação.

---

## `packages/remote-domain`

Pode depender de:

* `shared` ✅
* `contracts` ⚠️
* `config` ⚠️ se realmente neutro

### Proibido depender de:

* `database`
* `sdk`
* `ui`
* `remote-infra`
* `core` ⚠️ depende da modelagem; o ideal é evitar acoplamento bidirecional

### Regra

`remote-domain` é domínio especializado, não infra.

---

## `packages/database`

Pode depender de:

* `shared` ✅
* `contracts` ⚠️
* `core` ✅
* `config` ✅

### Proibido depender de:

* `sdk`
* `ui`
* `remote-infra`

### Pode depender de `remote-domain`?

* ✅ se implementar persistência específica do módulo remoto

### Regra

`database` pode implementar portas do domínio, mas não definir regra de negócio central.

---

## `packages/sdk`

Pode depender de:

* `shared` ✅
* `contracts` ✅
* `config` ✅

### Proibido depender de:

* `database`
* `core` ⚠️ idealmente não
* `ui`
* `remote-infra`
* `remote-domain` ⚠️ geralmente não

### Regra

`sdk` é cliente de comunicação, não camada de negócio.

---

## `packages/ui`

Pode depender de:

* `shared` ✅
* `contracts` ✅
* `config` ✅

### Pode depender de `sdk`?

* ⚠️ preferencialmente não no núcleo do package
* se houver hooks/clientes visuais, isolar em submódulo explícito

### Proibido depender de:

* `database`
* `core` ⚠️ geralmente não
* `remote-infra`

### Regra

`ui` deve focar em apresentação reutilizável.

---

## `packages/remote-infra`

Pode depender de:

* `shared` ✅
* `contracts` ✅
* `config` ✅
* `remote-domain` ✅
* `core` ⚠️ apenas se houver integração legítima entre contextos

### Proibido depender de:

* `database` ⚠️ salvo quando a implementação realmente exigir persistência remota compartilhada
* `ui`
* `sdk` ⚠️ evitar

### Regra

`remote-infra` implementa o domínio remoto.

---

# Regras para Apps

## `apps/api`

Pode depender de:

* `contracts`
* `core`
* `database`
* `sdk` ⚠️ em geral evitar dentro do backend
* `shared`
* `config`
* `remote-domain`
* `remote-infra`

### Regra

O backend é orquestrador.
Ele pode consumir vários packages, mas deve manter a separação interna.

---

## `apps/web`

Pode depender de:

* `contracts`
* `sdk`
* `ui`
* `shared`
* `config`

### Pode depender de `core`?

* ⚠️ apenas para regras puras extremamente compartilhadas
* preferencialmente evitar

### Proibido depender de:

* `database`
* `remote-infra`

### Regra

O web não deve conhecer persistência nem infra técnica.

---

## `apps/mobile`

Pode depender de:

* `contracts`
* `sdk`
* `ui`
* `shared`
* `config`

### Mesma regra do web

Nada de acesso direto a banco ou infra de backend.

---

## `apps/agent`

Pode depender de:

* `contracts`
* `shared` se existir equivalente compatível
* `config` se houver artefatos compartilhados compatíveis
* contratos específicos de `agent`

### Não deve depender de:

* `database`
* `ui`
* `sdk` web-oriented
* `remote-infra` TypeScript, se o agent for Go

### Regra

O agent deve compartilhar contrato, não implementação de app JS.

---

# Tabela Resumida

```text
contracts     -> ninguém idealmente
shared        -> ninguém idealmente
config        -> shared
core          -> shared, contracts
remote-domain -> shared, contracts
database      -> shared, config, core, contracts, remote-domain
sdk           -> shared, config, contracts
ui            -> shared, config, contracts
remote-infra  -> shared, config, contracts, remote-domain
apps/api      -> quase todos os packages de backend
apps/web      -> contracts, sdk, ui, shared, config
apps/mobile   -> contracts, sdk, ui, shared, config
apps/agent    -> contracts e pacotes compatíveis com agent
```

---

# Regras Especiais

## 1. Proibido ciclo entre packages

Exemplo proibido:

* `core` importa `database`
* `database` importa `core`

Esse tipo de acoplamento destrói a arquitetura.

---

## 2. Proibido duplicar modelo em camadas erradas

Exemplo ruim:

* `Ticket` em `contracts`
* `TicketEntity` em `core`
* `TicketDbModel` em `database`
* `TicketCardModel` em `ui`

Isso pode existir, mas cada um precisa ter propósito real.
Não pode ser duplicação sem critério.

---

## 3. DTO não é entidade de domínio

`contracts` define payloads.
`core` define regra e identidade de negócio.

Não misturar os dois.

---

## 4. UI não chama banco

Mesmo em monorepo, isso continua proibido.

---

## 5. Infra não decide política

`database` e `remote-infra` executam.
Quem decide é o domínio.

---

# Exemplos Válidos

## Exemplo 1 — Web consumindo API

```ts
import { Ticket } from '@trilink/contracts'
import { getTickets } from '@trilink/sdk'
import { DataTable } from '@trilink/ui'
```

Correto:

* web usa contratos
* web usa SDK
* web usa UI

---

## Exemplo 2 — Database implementando repositório

```ts
import { TicketRepository } from '@trilink/core'
import { PrismaClient } from '@trilink/database/prisma'
```

Correto:

* persistência implementa porta do domínio

---

## Exemplo 3 — Remote infra implementando provider

```ts
import { TunnelServicePort } from '@trilink/remote-domain'
import { RatholeClient } from './providers/rathole-client'
```

Correto:

* infra implementa contrato do domínio remoto

---

# Exemplos Inválidos

## Exemplo 1 — Core importando Prisma

```ts
import { PrismaClient } from '@trilink/database'
```

Errado:

* domínio conhecendo persistência concreta

---

## Exemplo 2 — Contracts importando React types de UI

```ts
import { SomeUiType } from '@trilink/ui'
```

Errado:

* contrato acoplado à camada visual

---

## Exemplo 3 — UI importando banco

```ts
import { prisma } from '@trilink/database'
```

Errado:

* apresentação acoplada à persistência

---

## Exemplo 4 — SDK dependendo de database

```ts
import { prisma } from '@trilink/database'
```

Errado:

* cliente HTTP não deve conhecer banco

---

# Convenção de Implementação

## Imports devem usar aliases do monorepo

Evitar imports profundos e frágeis.

### Bom

```ts
import { Ticket } from '@trilink/contracts/ticket'
```

### Evitar

```ts
import { Ticket } from '../../../packages/contracts/src/ticket/ticket.types'
```

---

## Cada package deve expor API pública

Usar `index.ts` como fronteira.

### Bom

```ts
import { Company } from '@trilink/contracts/company'
```

### Evitar

```ts
import { Company } from '@trilink/contracts/src/company/company.types'
```

---

## Internals não devem vazar

Tudo que não for API pública deve ficar interno ao package.

---

# Política de Governança

## Ao criar novo arquivo ou módulo, responder:

1. Esse código é contrato, domínio, infra, UI ou utilitário?
2. Ele será reutilizado por mais de um app?
3. Ele depende de framework?
4. Ele depende de banco?
5. Ele representa regra de negócio ou implementação?

As respostas definem onde ele deve ficar.

---

# Checklist de decisão

## Vai para `contracts`?

* é compartilhado entre apps?
* é payload, evento ou tipo comum?
* não tem lógica?
* não depende de infra?

## Vai para `core`?

* é regra de negócio?
* é entidade?
* é caso de uso?
* não depende de implementação?

## Vai para `database`?

* é persistência?
* é Prisma?
* é repositório concreto?
* é mapper para banco?

## Vai para `sdk`?

* é client da API?
* é fetch tipado?
* é serialização de request/response?

## Vai para `ui`?

* é visual?
* é componente?
* é apresentação reutilizável?

## Vai para `shared`?

* é realmente transversal?
* é neutro?
* não pertence melhor a outro lugar?

---

# Regra Recomendada para Enforcement

No futuro, o ideal é automatizar isso com:

* ESLint import rules
* dependency-cruiser
* boundaries
* Nx/Turborepo constraints, se aplicável

Exemplos de bloqueio:

* impedir `core -> database`
* impedir `contracts -> ui`
* impedir `ui -> database`

Isso evita que a norma fique só no papel.

---

# Decisão Oficial Recomendada

## Estrutura final

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

## Regra central

```text
contracts/shared/config = base
core/remote-domain = domínio
database/sdk/remote-infra/ui = implementação e consumo
apps = composição final
```

---

# Conclusão

Esta norma existe para preservar uma ideia simples:

> o código deve entrar no lugar certo e depender apenas do que faz sentido arquiteturalmente.

Quando isso é respeitado:

* o monorepo fica legível
* a regra de negócio fica protegida
* a infra pode mudar sem quebrar tudo
* a manutenção fica muito mais barata
