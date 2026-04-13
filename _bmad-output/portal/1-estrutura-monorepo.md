# Padrão Interno de Estrutura de Pastas por Package e por App

## Visão Geral

Este documento define a **estrutura padrão de diretórios** do monorepo da Trilink, com foco em:

* previsibilidade
* escalabilidade
* separação de responsabilidades
* facilidade de manutenção
* onboarding rápido de novos desenvolvedores

A proposta não é apenas “organizar pastas”, mas traduzir a arquitetura do projeto em uma estrutura clara e repetível.

A regra central é:

> a estrutura de pastas deve refletir a responsabilidade arquitetural, e não apenas preferências pessoais de organização.

---

# Objetivos

## Arquiteturais

* padronizar a organização dos apps e packages
* facilitar localização de código
* reduzir ambiguidade estrutural
* reforçar as fronteiras entre domínio, contrato, infraestrutura, UI e configuração

## Operacionais

* acelerar desenvolvimento
* facilitar code review
* melhorar legibilidade do monorepo
* evitar estruturas improvisadas ao longo do tempo

---

# Estrutura geral do monorepo

A estrutura-base recomendada é:

```text
/apps
  /api
  /web
  /mobile
  /agent

/packages
  /sdk
  /config
  /contracts
  /core
  /database
  /remote-domain
  /remote-infra
  /shared
  /ui

/scripts
```

---

# Princípios de organização

## 1. Pastas devem refletir arquitetura

A estrutura precisa mostrar claramente:

* o que é app
* o que é package compartilhado
* o que é domínio
* o que é infra
* o que é contrato
* o que é UI

## 2. Organização por domínio dentro das camadas

Sempre que possível, organizar internamente por contexto de negócio:

* `ticket`
* `company`
* `settings`
* `remote`
* `agent`

## 3. Evitar estruturas genéricas demais

Evitar pastas como:

* `misc`
* `general`
* `others`
* `temp`
* `utils` para tudo

## 4. API pública explícita

Cada package deve expor uma interface pública clara por `index.ts`.

## 5. Estrutura previsível

Pastas semelhantes devem ter padrões semelhantes.

---

# Estrutura padrão dos Apps

## 1. `apps/api`

Responsabilidade:

* backend principal
* orquestração de casos de uso
* exposição HTTP
* autenticação
* integração entre domínio, persistência e serviços

## Estrutura recomendada

```text
apps/api/
  src/
    main.ts
    app.module.ts

    modules/
      ticket/
        controllers/
        services/
        dto/
        presenters/
        mappers/
        ticket.module.ts

      company/
        controllers/
        services/
        dto/
        presenters/
        mappers/
        company.module.ts

      settings/
        controllers/
        services/
        dto/
        presenters/
        mappers/
        settings.module.ts

      agent/
        controllers/
        services/
        dto/
        presenters/
        mappers/
        agent.module.ts

      remote/
        controllers/
        services/
        dto/
        presenters/
        mappers/
        remote.module.ts

    common/
      guards/
      interceptors/
      filters/
      decorators/
      pipes/

    config/
    integrations/
    bootstrap/
  test/
  package.json
  tsconfig.json
```

## Regras do `apps/api`

### Deve conter

* controllers
* modules NestJS
* DTOs específicos do backend
* guards, pipes, interceptors
* services de aplicação
* adapters para packages compartilhados

### Não deve conter

* regra de negócio central duplicada do `core`
* contratos compartilhados como fonte primária de DTO interno
* lógica de persistência espalhada fora da camada adequada
* código utilitário genérico que deveria estar em package

## Observação

O `apps/api` orquestra.
Ele não deve virar o lugar onde toda regra do sistema mora.

---

## 2. `apps/web`

Responsabilidade:

* interface web principal
* dashboard
* páginas de gestão
* composição visual com `ui`, `sdk` e `contracts`

## Estrutura recomendada para Next.js App Router

```text
apps/web/
  src/
    app/
      (dashboard)/
      (auth)/
      docs/
      api/
      layout.tsx
      page.tsx

    components/
      shared/
      dashboard/
      ticket/
      settings/
      remote/
      agent/

    features/
      ticket/
        components/
        hooks/
        services/
        mappers/

      company/
      settings/
      remote/
      agent/

    lib/
      auth/
      utils/
      formatters/
      constants/

    providers/
    styles/
    config/
  public/
  package.json
  tsconfig.json
```

## Regras do `apps/web`

### Deve conter

* páginas
* componentes específicos do app
* composição de UI
* hooks locais do web
* lógica de tela
* mapeamento de dados para apresentação

### Não deve conter

* regra de negócio central duplicada do `core`
* acesso direto a banco
* contratos que deveriam estar em `packages/contracts`
* componentes genéricos que deveriam estar em `packages/ui`

## Observação

O `web` deve conter o que é **específico da aplicação web**.
O que for reutilizável entre frontends deve sair para `ui`.

---

## 3. `apps/mobile`

Responsabilidade:

* app mobile
* experiência mobile do domínio já existente
* consumo do `sdk` e dos `contracts`

## Estrutura recomendada

```text
apps/mobile/
  src/
    app/
    screens/
      ticket/
      company/
      settings/
      remote/

    components/
      shared/
      forms/
      layout/

    features/
      ticket/
      company/
      settings/
      remote/

    hooks/
    providers/
    lib/
    config/
    styles/
  assets/
  package.json
  tsconfig.json
```

## Regras do `apps/mobile`

### Deve conter

* telas
* componentes específicos do mobile
* navegação
* providers do app
* integração com SDK

### Não deve conter

* regra de negócio central duplicada
* acesso direto a persistência do backend
* contratos locais duplicados

---

## 4. `apps/agent`

Responsabilidade:

* serviço local do Master Agent
* orquestração dos módulos locais
* heartbeat
* desired state
* backup
* túnel
* remoto
* runtime do Windows Service

Como o agent é diferente do restante do monorepo, a estrutura dele precisa refletir um design mais orientado a runtime e componentes internos.

## Estrutura recomendada

```text
apps/agent/
  cmd/
    agent/
      main.go

  internal/
    core/
      identity.go
      register.go
      heartbeat.go
      desired_state.go
      reconcile.go
      service_manager.go

    backup/
      manager.go
      policy.go
      task.go
      result.go
      validate.go
      hash.go
      gbak.go
      compress.go
      upload.go
      report.go
      queue.go

    tunnel/
      manager.go
      config.go
      health.go

    remote/
      manager.go
      rustdesk.go
      health.go

    platform/
      fs.go
      process.go
      service.go
      paths.go

  assets/
  configs/
  scripts/
  README.md
```

## Regras do `apps/agent`

### Deve conter

* runtime do agente
* módulos internos do serviço
* orquestração local
* abstrações de sistema operacional
* integração local com payloads

### Não deve conter

* contratos TypeScript acoplados diretamente
* lógica web
* persistência do backend
* UI

## Observação

No agent, a organização é por **componente operacional**, não por framework frontend/backend.

---

# Estrutura padrão dos Packages

## 1. `packages/contracts`

Responsabilidade:

* contratos compartilhados entre apps e packages

## Estrutura recomendada

```text
packages/contracts/
  src/
    shared/
      primitives.ts
      pagination.ts
      api-response.ts
      metadata.ts
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

  package.json
  tsconfig.json
  README.md
```

## Regras do `contracts`

### Deve conter

* tipos compartilhados
* payloads
* webhooks
* eventos
* contratos de integração

### Não deve conter

* regra de negócio
* classes de serviço
* DTOs internos exclusivos do Nest
* models de banco
* lógica de apresentação

---

## 2. `packages/core`

Responsabilidade:

* domínio central e regras de negócio puras

## Estrutura recomendada

```text
packages/core/
  src/
    ticket/
      entities/
      value-objects/
      policies/
      services/
      use-cases/
      ports/
      index.ts

    company/
      entities/
      value-objects/
      policies/
      services/
      use-cases/
      ports/
      index.ts

    settings/
      entities/
      policies/
      services/
      use-cases/
      ports/
      index.ts

    agent/
      entities/
      policies/
      services/
      use-cases/
      ports/
      index.ts

    shared/
      domain-error.ts
      result.ts
      index.ts

    index.ts

  package.json
  tsconfig.json
  README.md
```

## Regras do `core`

### Deve conter

* entidades
* value objects
* policies
* casos de uso
* portas/interfaces de domínio
* validações de negócio

### Não deve conter

* Prisma
* React
* Nest decorators
* acesso HTTP
* integração concreta

---

## 3. `packages/database`

Responsabilidade:

* persistência compartilhada
* prisma
* repositories concretos
* mapeamento entre domínio e banco

## Estrutura recomendada

```text
packages/database/
  src/
    prisma/
      client.ts
      schema/
      migrations/
      index.ts

    ticket/
      repositories/
      mappers/
      queries/
      index.ts

    company/
      repositories/
      mappers/
      queries/
      index.ts

    settings/
      repositories/
      mappers/
      queries/
      index.ts

    agent/
      repositories/
      mappers/
      queries/
      index.ts

    remote/
      repositories/
      mappers/
      queries/
      index.ts

    index.ts

  prisma/
  package.json
  tsconfig.json
  README.md
```

## Regras do `database`

### Deve conter

* client de banco
* schema Prisma
* repositórios concretos
* queries
* mappers de persistência

### Não deve conter

* regra de negócio central
* UI
* lógica HTTP
* componentes de apresentação

---

## 4. `packages/sdk`

Responsabilidade:

* client oficial de consumo da API
* comunicação tipada entre apps e backend

## Estrutura recomendada

```text
packages/sdk/
  src/
    client/
      http-client.ts
      auth.ts
      index.ts

    ticket/
      ticket.client.ts
      ticket.mappers.ts
      index.ts

    company/
      company.client.ts
      company.mappers.ts
      index.ts

    settings/
      settings.client.ts
      settings.mappers.ts
      index.ts

    agent/
      agent.client.ts
      heartbeat.client.ts
      desired-state.client.ts
      index.ts

    remote/
      remote.client.ts
      index.ts

    shared/
      request.ts
      response.ts
      errors.ts
      index.ts

    index.ts

  package.json
  tsconfig.json
  README.md
```

## Regras do `sdk`

### Deve conter

* clients HTTP
* wrappers de endpoints
* serialização e desserialização
* auth client-side
* helpers de request

### Não deve conter

* controllers
* persistência
* regra de negócio central
* componentes visuais

---

## 5. `packages/ui`

Responsabilidade:

* camada visual compartilhada

## Estrutura recomendada

```text
packages/ui/
  src/
    components/
      button/
      card/
      data-table/
      form/
      modal/
      layout/
      feedback/

    patterns/
      page-header/
      empty-state/
      filters-bar/

    hooks/
      use-toast.ts
      use-dialog.ts

    providers/
    tokens/
    styles/
    lib/
    index.ts

  package.json
  tsconfig.json
  README.md
```

## Regras do `ui`

### Deve conter

* componentes reutilizáveis
* padrões visuais
* hooks visuais
* design tokens
* wrappers de bibliotecas visuais

### Não deve conter

* regra de negócio
* acesso a banco
* chamadas HTTP acopladas
* lógica específica do backend

---

## 6. `packages/shared`

Responsabilidade:

* utilitários neutros e transversais

## Estrutura recomendada

```text
packages/shared/
  src/
    utils/
      string/
      date/
      number/
      object/

    errors/
    constants/
    types/
    guards/
    index.ts

  package.json
  tsconfig.json
  README.md
```

## Regras do `shared`

### Deve conter

* helpers puros
* constants genéricas
* errors base
* type guards neutros
* utilitários reutilizáveis

### Não deve conter

* regra de negócio
* contrato de domínio
* UI
* persistência
* código sem dono claro

---

## 7. `packages/config`

Responsabilidade:

* configurações compartilhadas do monorepo

## Estrutura recomendada

```text
packages/config/
  src/
    env/
    eslint/
    typescript/
    tailwind/
    features/
    index.ts

  package.json
  tsconfig.json
  README.md
```

## Regras do `config`

### Deve conter

* env schema
* presets
* config loaders
* feature flags compartilhadas

### Não deve conter

* regra de domínio
* persistência
* visual
* contratos de negócio

---

## 8. `packages/remote-domain`

Responsabilidade:

* domínio específico do contexto remoto

## Estrutura recomendada

```text
packages/remote-domain/
  src/
    tunnel/
      entities/
      policies/
      services/
      use-cases/
      ports/
      index.ts

    access/
      entities/
      policies/
      services/
      use-cases/
      ports/
      index.ts

    monitoring/
      entities/
      policies/
      services/
      use-cases/
      ports/
      index.ts

    index.ts

  package.json
  tsconfig.json
  README.md
```

## Regras do `remote-domain`

### Deve conter

* domínio de túnel
* domínio de acesso remoto
* políticas do módulo remoto
* portas para providers remotos

### Não deve conter

* implementação concreta de Rathole
* implementação concreta de RustDesk
* UI
* banco direto

---

## 9. `packages/remote-infra`

Responsabilidade:

* implementação técnica do módulo remoto

## Estrutura recomendada

```text
packages/remote-infra/
  src/
    rathole/
      client/
      mappers/
      adapters/
      health/
      index.ts

    rustdesk/
      client/
      mappers/
      adapters/
      health/
      index.ts

    monitoring/
      probes/
      adapters/
      index.ts

    shared/
      process.ts
      config.ts
      errors.ts
      index.ts

    index.ts

  package.json
  tsconfig.json
  README.md
```

## Regras do `remote-infra`

### Deve conter

* adapters
* clients concretos
* providers técnicos
* health checks
* implementação de portas do domínio remoto

### Não deve conter

* regra de negócio central
* UI
* contratos aleatórios fora do contexto

---

# Estrutura recomendada de README por package

Cada package deve ter um `README.md` curto e padronizado.

## Modelo sugerido

```md
# @trilink/contracts

## Objetivo
Centralizar contratos compartilhados entre apps e packages.

## Pode conter
- tipos compartilhados
- payloads
- eventos
- webhooks

## Não pode conter
- regra de negócio
- prisma
- react
- serviços

## Dependências permitidas
- nenhuma, idealmente
- shared, apenas se neutro

## Consumidores
- apps/api
- apps/web
- apps/mobile
- apps/agent
- packages/sdk
```

---

# Estrutura recomendada de módulos internos

Dentro de qualquer package ou app, a organização deve seguir preferencialmente o domínio.

## Bom

```text
ticket/
company/
settings/
agent/
remote/
```

## Evitar como estrutura principal

```text
helpers/
misc/
common-stuff/
temp/
```

---

# Convenções de nomes de pastas e arquivos

## Pastas

* usar nomes curtos e claros
* preferir minúsculas
* usar hífen só quando fizer sentido estrutural
* preferir nome de domínio ao nome técnico genérico

## Arquivos

### Em contracts

* `*.types.ts`
* `*.dto.ts`
* `*.api.types.ts`
* `*.webhook.types.ts`

### Em core

* `*.entity.ts`
* `*.policy.ts`
* `*.service.ts`
* `*.use-case.ts`
* `*.port.ts`

### Em database

* `*.repository.ts`
* `*.mapper.ts`
* `*.query.ts`

### Em sdk

* `*.client.ts`
* `*.mapper.ts`

### Em ui

* nome do componente ou hook
* evitar nomes genéricos

---

# Regras de profundidade

## Evitar profundidade excessiva

Não criar árvores profundas sem necessidade.

### Bom

```text
ticket/
  entities/
  policies/
  use-cases/
```

### Ruim

```text
ticket/
  domain/
    entities/
      base/
        internal/
```

## Regra prática

Se a navegação começar a ficar difícil, a estrutura está profunda demais.

---

# Regras para `index.ts`

Cada módulo relevante deve expor sua API pública via `index.ts`.

## Exemplo

```ts
export * from './ticket.types';
export * from './ticket-form.types';
export * from './ticket-api.types';
```

## Benefícios

* reduz imports profundos
* controla fronteira pública
* melhora legibilidade

---

# Anti-patterns estruturais

## 1. Estrutura por tipo técnico em todo lugar

Exemplo ruim:

```text
types/
services/
utils/
dto/
helpers/
```

Sem domínio claro, isso espalha contexto.

## 2. Estrutura por domínio misturada com bagunça

Exemplo ruim:

```text
ticket/
company/
utils/
helpers/
misc/
```

Isso normalmente indica falta de fronteira.

## 3. Package com pastas demais sem necessidade

Excesso de organização também gera custo.

## 4. `shared` como depósito

Tudo que não encontrou lugar não deve ir para `shared`.

---

# Modelo final recomendado

## Apps

```text
apps/
  api/
  web/
  mobile/
  agent/
```

## Packages

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

---

# Regra oficial resumida

## Apps

Organizar por experiência e orquestração da aplicação.

## Packages

Organizar por responsabilidade arquitetural.

## Módulos internos

Organizar por domínio de negócio.

## Arquivos

Seguir convenção previsível por camada.

---

# Exemplo prático aplicado ao seu cenário atual

## Contratos

Continuam em:

```text
packages/contracts/src/
```

## Desired State e Heartbeat

Entram em:

```text
packages/contracts/src/agent/
```

## Core do agente, se compartilhado conceitualmente

Pode nascer em:

```text
packages/core/src/agent/
```

Mas a orquestração operacional real do serviço continua em:

```text
apps/agent/internal/core/
```

## Integração técnica com RustDesk e Rathole

Vai para:

```text
packages/remote-infra/src/
```

ou permanece no agent quando for estritamente runtime local.

---

# Conclusão

Este padrão existe para garantir que a estrutura do monorepo continue coerente conforme o projeto cresce.

A ideia central é simples:

> apps organizam a aplicação
> packages organizam a arquitetura
> módulos organizam o domínio

Quando isso é respeitado, o projeto fica:

* mais previsível
* mais limpo
* mais fácil de escalar
* mais fácil de manter
