# Arquitetura de Packages do Monorepo

## Visão Geral

O monorepo da Trilink deve ser organizado para permitir:

- crescimento previsível
- baixo acoplamento
- reuso entre aplicações
- clareza de responsabilidade
- manutenção simples
- evolução modular

A estrutura de `packages/` não deve ser apenas uma separação física de código.  
Ela deve representar **fronteiras arquiteturais reais**.

A regra central é:

> cada package deve ter uma responsabilidade clara, um limite explícito e um conjunto de dependências controlado.

---

# Objetivos

## Funcionais

- compartilhar contratos, domínio, UI e infraestrutura entre aplicações
- evitar duplicação entre `apps/api`, `apps/web`, `apps/mobile` e `apps/agent`
- permitir crescimento por módulos
- facilitar testes e refatoração

## Arquiteturais

- isolar regras de negócio de frameworks
- separar domínio de infraestrutura
- reduzir dependência cruzada desnecessária
- tornar o monorepo legível para qualquer novo desenvolvedor

---

# Estrutura recomendada

A estrutura recomendada para `packages/` fica assim:

```text
packages/
  application/
  config/
  contracts/
  core/
  database/
  remote-domain/
  remote-infra/
  shared/
  ui/
```

---

# Princípios de organização

## 1. Nome de package deve refletir responsabilidade
Evite nomes genéricos ou ambíguos.

Exemplo:

- `application` é melhor que `api` quando o pacote é uma camada de aplicação compartilhada
- `contracts` é melhor que `types-shared`
- `database` é melhor que `prisma-stuff`

## 2. Packages devem ser pequenos e coesos
Um package não deve virar “mini monolito”.

## 3. Packages não devem competir entre si
Se dois packages fazem “quase a mesma coisa”, a fronteira está errada.

## 4. Regras de negócio não devem viver em infra
Infra implementa. Domínio decide.

## 5. Contratos não devem conhecer banco, framework ou UI
Contrato é acordo, não implementação.

---

# Estrutura oficial e responsabilidade de cada package

## 1. `packages/contracts`

### Responsabilidade

Centralizar os **contratos compartilhados** entre aplicações.

### Deve conter

- tipos compartilhados
- DTOs compartilhados
- payloads de API
- eventos
- webhooks
- contratos Agent ↔ Portal
- contratos de integrações externas quando compartilhados

### Não deve conter

- lógica de negócio
- classes de serviço
- código React
- decorators do NestJS
- modelos Prisma
- acesso a banco
- helpers utilitários genéricos

### Exemplos

- `Ticket`
- `Company`
- `User`
- `EvolutionWebhookPayload`
- `AgentHeartbeatPayload`
- `DesiredState`

### Estrutura recomendada

```text
packages/contracts/
  src/
    shared/
    company/
    user/
    dashboard/
    documento/
    evolution/
    remote/
    sefaz/
    settings/
    ticket/
    agent/
    index.ts
```

### Regra de ouro

> tudo que é contrato entre sistemas entra aqui; tudo que é implementação fica fora.

---

## 2. `packages/core`

### Responsabilidade
Conter as **regras de negócio puras** do sistema.

### Deve conter

- entidades de domínio
- value objects
- serviços de domínio puros
- casos de uso
- validações de negócio
- políticas e regras centrais
- interfaces de portas de domínio

### Não deve conter

- Prisma
- fetch
- axios
- React
- componentes visuais
- controllers
- decorators
- acesso direto a banco
- implementação técnica de integração

### Exemplos

- política de abertura de ticket
- regra de status permitidos
- cálculo de prioridade
- regra de associação de cliente/dispositivo
- regras do módulo remoto
- regras do desired state do agente

### Observação

O `core` deve ser o package mais estável do sistema.

### Regra de ouro

> o `core` decide o que deve acontecer; outros packages executam.

---

## 3. `packages/database`

### Responsabilidade

Centralizar a **infraestrutura de persistência** compartilhada.

### Deve conter

- Prisma schema
- client Prisma
- helpers de conexão
- repositories concretos
- mapeadores de persistência
- factories de acesso a dados
- adapters ligados ao banco

### Não deve conter

- regra de negócio pura
- componentes de UI
- contratos compartilhados como fonte primária
- lógica de integração externa que não seja persistência

### Exemplos

- `prisma.ts`
- repositório de tickets em Prisma
- repositório de companies
- queries comuns
- seed helpers
- mapeamento entre entidade de domínio e persistência

### Regra de ouro

> `database` salva, busca e persiste; ele não decide regra de negócio.

---

## 4. `packages/ui`

### Responsabilidade

Compartilhar a **camada visual** entre aplicações frontend.

### Deve conter

- componentes React compartilhados
- design tokens
- wrappers visuais
- helpers de apresentação
- providers visuais
- ícones compartilhados
- tabelas, cards, modais, formulários base

### Não deve conter

- regras de negócio pesadas
- código específico de backend
- fetch acoplado à API
- lógica de persistência
- tipagem de domínio que deveria estar em `contracts`

### Exemplos

- `Button`
- `Card`
- `DataTable`
- `PageHeader`
- `FormField`
- `EmptyState`

### Regra de ouro

> `ui` entrega apresentação reutilizável; não deve virar camada de negócio.

---

## 5. `packages/config`

### Responsabilidade

Centralizar **configurações compartilhadas** do monorepo.

### Deve conter

- presets de ESLint
- presets de TypeScript
- configs de Tailwind compartilhadas
- schemas de ambiente
- constantes de configuração cross-app
- bootstrap de configuração reutilizável

### Não deve conter

- regra de domínio
- contratos de negócio
- queries de banco
- código de interface visual
- integrações com providers

### Exemplos

- `tsconfig.base`
- `eslint presets`
- `zod env schema`
- `feature flags shared`
- `app config loaders`

### Regra de ouro

> `config` descreve como o sistema é configurado; não implementa domínio.

---

## 6. `packages/application`

### Responsabilidade
Ser o **cliente oficial de consumo da API**.

### Por que usar `application` em vez de `api`
O nome `api` é ambíguo, porque já existe `apps/api`.  
`application` deixa claro que o package é uma camada de aplicação compartilhada, e não o backend HTTP em si.

### Deve conter

- client HTTP
- funções tipadas para consumo da API
- adapters de request/response
- autenticação do client
- helpers de serialização para consumo externo

### Não deve conter

- controllers
- regra de negócio central
- UI
- persistência
- tipagem local de backend que deveria estar em `contracts`

### Exemplos

- `getTickets()`
- `createCompany()`
- `sendHeartbeat()`
- `getDesiredState()`

### Regra de ouro

> `application` organiza casos de uso e roteadores de aplicação; não substitui o domínio.

---

## 7. `packages/shared`

### Responsabilidade

Guardar apenas **recursos transversais e genéricos**, agnósticos de domínio.

### Deve conter

- utilitários puros
- helpers genéricos
- constants genéricas
- errors base
- funções comuns
- abstrações pequenas e reutilizáveis
### Não deve conter

- regra de negócio
- tipos que deveriam estar em `contracts`
- componentes visuais
- código específico de banco
- código específico do módulo remoto
- qualquer coisa “sem dono” apenas para encaixar

### Risco principal

`shared` é o package com maior risco de virar depósito.

### Como evitar isso

Todo item em `shared` deve responder:

- é agnóstico de domínio?
- é reutilizável por vários packages?
- não pertence melhor a outro lugar?

### Regra de ouro

> se algo está em `shared`, ele precisa ser realmente transversal, pequeno e neutro.

---

## 8. `packages/remote-domain`

### Responsabilidade

Conter o **domínio do módulo remoto**.

### Deve conter

- entidades do contexto remoto
- regras do acesso remoto
- regras de configuração remota
- políticas do RustDesk, Rathole e controle remoto
- casos de uso do módulo remoto

### Não deve conter

- chamadas HTTP concretas
- implementações técnicas de integração
- persistência concreta
- código de UI

### Regra de ouro

> `remote-domain` modela o contexto remoto sem saber como ele é implementado.

---

## 9. `packages/remote-infra`

### Responsabilidade

Conter a **implementação técnica** do módulo remoto.

### Deve conter

- adapters
- clients externos
- integração com RustDesk
- integração com Rathole
- implementação de providers remotos
- bridges com APIs externas
- implementações concretas das portas definidas no domínio

### Não deve conter

- regra de negócio central do sistema
- componentes de UI
- contratos genéricos que deveriam estar em `contracts`

### Regra de ouro

> `remote-infra` executa a parte técnica do que o `remote-domain` modela.

---

# Relação entre os packages

## Fluxo conceitual recomendado

```text
contracts  → acordo de comunicação
core       → regra de negócio pura
database   → persistência
bff        → superfície de aplicação/backend
ui         → apresentação
config     → configuração compartilhada
shared     → utilitários transversais
remote-domain → domínio específico remoto
remote-infra  → implementação técnica remota
```

---

# Dependências recomendadas

## Dependências que fazem sentido

### `application`
pode depender de:
- `contracts`
- `shared`

### `database`
pode depender de:
- `core`
- `shared`
- `contracts` quando necessário para mapeamento, com cuidado

### `ui`
pode depender de:
- `shared`
- `contracts` para props baseadas em tipos compartilhados

### `remote-infra`
pode depender de:
- `remote-domain`
- `contracts`
- `shared`

### `apps`
podem depender de:
- `contracts`
- `core`
- `database`
- `application`
- `ui`
- `config`
- `shared`
- `remote-domain`
- `remote-infra`

---

## Dependências que devem ser evitadas

### `contracts` não deve depender de:
- `database`
- `ui`
- `application`
- frameworks

### `core` não deve depender de:
- `database`
- `application`
- `ui`
- NestJS
- React

### `shared` não deve depender de:
- `database`
- `ui`
- packages específicos de domínio

### `remote-domain` não deve depender de:
- `remote-infra`

---

# Convenção de nomes

## Packages

Use nomes curtos, claros e estáveis.

### Recomendado
- `contracts`
- `core`
- `database`
- `ui`
- `config`
- `application`
- `shared`
- `remote-domain`
- `remote-infra`

### Evitar
- `api` para package consumidor
- `common-stuff`
- `helprs`
- `utils-misc`
- `base`
- `lib` genérico demais

---

# Convenção de conteúdo interno

## Em `contracts`
- `*.types.ts`
- `*.dto.ts`
- `*.api.types.ts`
- `*.webhook.types.ts`
- `index.ts`

## Em `core`
- `entities/`
- `value-objects/`
- `use-cases/`
- `services/`
- `ports/`
- `policies/`

## Em `database`
- `prisma/`
- `repositories/`
- `mappers/`
- `clients/`

## Em `ui`
- `components/`
- `hooks/` apenas se forem visuais
- `providers/`
- `tokens/`

## Em `application`
- `client/`
- `modules/`
- `serializers/`
- `auth/`

---

# Estrutura recomendada final

```text
packages/
  application/
  config/
  contracts/
  core/
  database/
  remote-domain/
  remote-infra/
  shared/
  ui/
```

---

# Regras de fronteira

## 1. Um package não pode virar atalho para tudo
Se começou a receber coisas “porque não sabíamos onde colocar”, a fronteira falhou.

## 2. O mesmo conceito não deve existir em dois packages
Exemplo:
- `Ticket` em `contracts`
- `Ticket` duplicado em `shared`

Isso deve ser evitado.

## 3. UI não deve conhecer detalhes do banco
A UI pode conhecer contratos, não persistência.

## 4. O domínio não deve conhecer framework
O domínio deve sobreviver mesmo que o NestJS ou React mudem.

## 5. Infra depende do domínio; o domínio não depende da infra
Essa é uma das regras mais importantes.

---

# Anti-patterns que devem ser evitados

## Package `shared` virar depósito

Sintoma:
- qualquer helper vai para lá

## `contracts` virar pasta de “tipos aleatórios”

Sintoma:
- tipos locais de tela
- tipos específicos de ORM
- interfaces internas do backend

## `core` virar package abstrato demais

Sintoma:
- ninguém sabe o que entra nele
- vira mistura de utilitários e regras

## `database` virar regra de negócio disfarçada

Sintoma:
- decisões importantes acontecendo em repositório

## `ui` virar frontend acoplado à API

Sintoma:
- componentes buscando dados diretamente sem separação

---

# Decisões recomendadas para seu monorepo

## 1. Renomear `packages/api` para `packages/application`
Essa é a mudança mais recomendada.

## 2. Manter `contracts` como fonte única de acordos compartilhados
Sem duplicação em outros packages.

## 3. Definir política rígida para `shared`
Somente itens realmente transversais.

## 4. Manter `remote-domain` e `remote-infra`
Essa separação está madura e correta.

## 5. Documentar responsabilidade de cada package
Essa documentação deve virar referência interna do projeto.

---

# Exemplo de política curta por package

## `contracts`

Pode:
- contratos, payloads, tipos compartilhados

Não pode:
- ORM, React, services

## `core`

Pode:
- regra de negócio, entidades, casos de uso

Não pode:
- infra, UI, banco

## `database`

Pode:
- Prisma, repositories, mappers

Não pode:
- regra de negócio central

## `application`

Pode:
- client HTTP, consumo tipado da API

Não pode:
- backend, controllers, UI

## `shared`
Pode:
- utilitários genéricos

Não pode:
- domínio, banco, UI, contratos duplicados

## `ui`

Pode:
- componentes e apresentação

Não pode:
- regra de negócio, banco

## `remote-domain`

Pode:
- domínio remoto

Não pode:
- integração concreta

## `remote-infra`

Pode:
- adapters e implementação técnica

Não pode:
- regra de negócio central

---

# Conclusão

A sua separação atual está **muito boa como base arquitetural**.  
Com o ajuste de nomenclatura e com fronteiras bem documentadas, ela fica em um nível bem sólido.

## Estrutura final recomendada

```text
packages/
  application/
  config/
  contracts/
  core/
  database/
  remote-domain/
  remote-infra/
  shared/
  ui/
```

## Decisão principal

A única mudança estrutural que eu recomendo fazer agora é:

**`packages/api` → `packages/application`**

Porque isso elimina ambiguidade e melhora a leitura do monorepo.
