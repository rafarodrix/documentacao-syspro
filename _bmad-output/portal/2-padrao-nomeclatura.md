# Padrão de Nomenclatura de Arquivos, Tipos, Módulos e Imports do Monorepo

## Status do Documento

Este documento passa a ser tratado como a referência normativa principal para nomenclatura técnica do monorepo.

Ele deve ser consultado:

* ao criar novos módulos
* ao renomear arquivos existentes
* ao revisar PRs
* ao extrair código para `packages`
* ao alinhar fronteiras entre frontend, backend e contratos

## Grau de maturidade

Este padrão já está em nível compatível com práticas enterprise de mercado porque cobre:

* separação por camada
* nomenclatura por responsabilidade
* fronteira pública por `index.ts`
* previsibilidade de símbolos
* previsibilidade de imports

Ele não é apenas um guia estético.
Ele define uma linguagem estrutural para o monorepo.

## Refinamentos oficiais incorporados

Além das regras detalhadas ao longo do documento, passam a valer também estas diretrizes:

1. arquivos React em `apps/web` devem usar `kebab-case`
2. o símbolo exportado do componente continua em `PascalCase`
3. evitar nomes genéricos como `types.ts`, `actions.ts`, `queries.ts` e `helpers.ts` quando o domínio puder ser explicitado
4. `apps/web` não deve depender de `@prisma/client`
5. tipos compartilhados entre apps devem nascer em `packages/contracts`
6. novos módulos devem preferir domínio em singular

## Leitura prática

Interprete este documento assim:

* **obrigatório**
  * `kebab-case` para arquivos
  * `PascalCase` para tipos, componentes e classes
  * `camelCase` para funções e variáveis
  * alias público para imports
* **recomendado**
  * singular para domínio
  * evitar profundidade excessiva
  * evitar duplicidade de tipos entre `web` e `contracts`
* **exceção controlada**
  * legado
  * limitações de framework
  * custo alto de rename em módulo estável

---

## Visão Geral

Este documento define as convenções oficiais de nomenclatura do monorepo da Trilink.

O objetivo é criar um padrão único para:

* nomes de arquivos
* nomes de pastas
* nomes de tipos
* nomes de interfaces
* nomes de enums
* nomes de classes
* nomes de módulos
* nomes de imports
* barrel exports

A regra central é:

> nomes devem ser previsíveis, coerentes com a camada e fáceis de localizar.

Uma boa arquitetura perde muito valor quando a nomenclatura é inconsistente.
Este padrão existe para reduzir ambiguidade e tornar o código mais legível no longo prazo.

---

# Objetivos

## Arquiteturais

* padronizar linguagem técnica do monorepo
* facilitar localização de responsabilidades
* reduzir duplicidade conceitual
* reforçar as fronteiras entre contrato, domínio, infra e UI

## Operacionais

* melhorar code review
* facilitar onboarding
* reduzir dúvidas na criação de arquivos
* acelerar manutenção e refatoração

---

# Princípios Gerais

## 1. Nome deve refletir responsabilidade

O nome precisa dizer o que o arquivo ou símbolo representa.

## 2. A camada influencia o nome

Um tipo em `contracts` não deve seguir exatamente a mesma convenção de um repositório em `database`.

## 3. Preferir clareza a abreviação

Exemplo melhor:

* `ticket-provider-global-settings.types.ts`

Exemplo pior:

* `ticket-prov-glob-set.ts`

## 4. O mesmo conceito deve ter nome consistente em todo o monorepo

Se o domínio usa `ticket`, não alternar entre:

* `ticket`
* `chamado`
* `support-ticket`
* `issue`

salvo quando houver motivo claro de contexto externo.

## 5. Sufixo deve indicar o papel técnico

Exemplo:

* `.types.ts`
* `.dto.ts`
* `.service.ts`
* `.repository.ts`

## 6. Fronteira arquitetural deve aparecer no nome

Se o arquivo pertence a leitura, escrita, contrato, mapper ou gateway, isso deve ser inferível sem abrir o arquivo.

---

# Convenção Geral de Pastas

## Regra

Pastas devem usar:

* minúsculas
* nomes curtos
* sem espaços
* sem camelCase
* hífen apenas quando necessário

## Recomendado

```text
ticket
company
settings
remote-infra
desired-state
```

## Evitar

```text
Ticket
CompanyModule
miscStuff
GeneralUtils
```

---

# Convenção Geral de Arquivos

## Regra

Arquivos devem usar:

* minúsculas
* kebab-case
* sufixo semântico por responsabilidade

## Exemplo

```text
ticket.types.ts
ticket-form.types.ts
ticket-provider-api.types.ts
agent-heartbeat.dto.ts
create-ticket.use-case.ts
ticket.repository.ts
```

## Anti-pattern obrigatório de evitar

Evitar arquivos genéricos demais como:

```text
types.ts
actions.ts
queries.ts
helpers.ts
utils.ts
```

quando o domínio puder ser explicitado.

### Preferir

```text
company-view.types.ts
company-write.actions.ts
company-read.queries.ts
ticket-filters.helpers.ts
```

---

# Convenção por Camada

## 1. `packages/contracts`

### Objetivo

Representar contratos compartilhados.

### Padrão de nomes

* `*.types.ts`
* `*.dto.ts`
* `*.api.types.ts`
* `*.webhook.types.ts`
* `*.event.types.ts`

### Exemplos

```text
company.types.ts
address.types.ts
ticket.types.ts
ticket-form.types.ts
ticket-api.types.ts
ticket-provider-api.types.ts
evolution-webhook.types.ts
desired-state.types.ts
heartbeat.types.ts
```

### Regra

Em `contracts`, o nome do arquivo deve explicar:

* o domínio
* o tipo de contrato

### Bom

```text
ticket-provider-global-settings.types.ts
```

### Ruim

```text
types.ts
model.ts
data.ts
```

---

## 2. `packages/core`

### Objetivo

Representar domínio e regra de negócio.

### Padrão de nomes

* `*.entity.ts`
* `*.value-object.ts`
* `*.policy.ts`
* `*.service.ts`
* `*.use-case.ts`
* `*.port.ts`
* `*.factory.ts`
* `*.spec.ts`

### Exemplos

```text
ticket.entity.ts
ticket-priority.value-object.ts
ticket-sla.policy.ts
create-ticket.use-case.ts
ticket-repository.port.ts
agent-identity.service.ts
```

### Regra

No `core`, o sufixo deve deixar claro o papel de negócio.

---

## 3. `packages/database`

### Objetivo

Representar persistência e infraestrutura de banco.

### Padrão de nomes

* `*.repository.ts`
* `*.mapper.ts`
* `*.query.ts`
* `*.model.ts` apenas se houver real necessidade
* `*.seed.ts`
* `*.factory.ts`

### Exemplos

```text
ticket.repository.ts
ticket.mapper.ts
ticket-summary.query.ts
company.repository.ts
agent-heartbeat.query.ts
initial-company.seed.ts
```

### Regra

Se o arquivo persiste, consulta ou traduz dados para o banco, o sufixo deve mostrar isso.

---

## 4. `packages/application`

### Objetivo

Cliente oficial da API.

### Padrão de nomes

* `*.client.ts`
* `*.mapper.ts`
* `*.request.ts`
* `*.response.ts`
* `*.auth.ts`

### Exemplos

```text
ticket.client.ts
company.client.ts
agent.client.ts
heartbeat.client.ts
desired-state.client.ts
ticket.mapper.ts
http-client.ts
auth-client.ts
```

### Regra

No `application`, o nome precisa deixar claro que se trata de camada de aplicação compartilhada, não regra de negócio pura.

---

## 5. `packages/ui`

### Objetivo

Camada visual compartilhada.

### Padrão de nomes

* componente: `kebab-case.tsx`
* hook: `use-*.ts`
* provider: `*.provider.tsx`
* utilitário visual: `*.ts`

### Exemplos

```text
button.tsx
data-table.tsx
page-header.tsx
empty-state.tsx
use-toast.ts
theme.provider.tsx
dialog.provider.tsx
```

### Regra

Em `ui`, o nome do componente deve refletir a responsabilidade visual e não o contexto de backend.

---

## 6. `apps/api`

### Objetivo

Backend NestJS.

### Padrão de nomes

* `*.controller.ts`
* `*.service.ts`
* `*.module.ts`
* `*.dto.ts`
* `*.presenter.ts`
* `*.mapper.ts`
* `*.guard.ts`
* `*.pipe.ts`
* `*.interceptor.ts`
* `*.filter.ts`

### Exemplos

```text
ticket.controller.ts
ticket.service.ts
ticket.module.ts
create-ticket.dto.ts
ticket.presenter.ts
ticket-response.mapper.ts
auth.guard.ts
validation.pipe.ts
http-exception.filter.ts
```

### Regra

No `apps/api`, o sufixo deve refletir o papel dentro do NestJS.

### Observação

Uso de Prisma no `apps/api` é esperado.
O problema não é o ORM existir no backend.
O problema é ele atravessar fronteira para a UI.

---

## 7. `apps/web`

### Objetivo

Aplicação web.

### Padrão de nomes

* componente: `kebab-case.tsx`
* hook: `use-*.ts`
* helper local: `*.ts`
* feature service local: `*.service.ts`
* mapper de view: `*.mapper.ts`
* actions de escrita: `*-write.actions.ts`
* queries de leitura: `*-read.queries.ts`
* tipos locais de view: `*-view.types.ts`

### Exemplos

```text
ticket-list.tsx
ticket-form.tsx
use-ticket-filters.ts
ticket-view.mapper.ts
ticket-page.service.ts
company-write.actions.ts
company-read.queries.ts
company-view.types.ts
```

### Regra

No `web`, separar claramente:

* componente visual
* hook
* mapper de apresentação
* serviço local de feature
* leitura
* escrita
* tipos de view

### Regra adicional

`apps/web` não deve importar:

```ts
@prisma/client
```

salvo em exceção controlada e documentada.

---

## 8. `apps/agent`

### Objetivo

Runtime do Master Agent em Go.

### Padrão de nomes

* arquivos em `snake_case.go` ou `lowercase.go`

### Recomendado

```text
identity.go
register.go
heartbeat.go
desired_state.go
service_manager.go
```

### Regra

No agent, o nome deve refletir a responsabilidade operacional do arquivo.

---

# Convenção de Tipos e Símbolos

## Interfaces TypeScript

### Regra

Interfaces devem usar `PascalCase`.

### Exemplos

```ts
interface Ticket
interface Company
interface AgentHeartbeat
interface DesiredState
```

### Prefixo `I`

Evitar `I`.

---

## Types TypeScript

### Regra

`type` também deve usar `PascalCase`.

### Exemplos

```ts
type TicketStatus
type BackupPolicy
type AgentRuntimeState
```

---

## Enums

### Regra

Enums devem usar `PascalCase`.

Valores internos:

* preferir `UPPER_SNAKE_CASE` quando fizer sentido semântico
* ou string literal clara em minúsculo, se esse for o padrão do projeto

### Recomendação atual

Preferir string unions ou objetos `as const` quando enum não for estritamente necessário.

---

## Classes

### Regra

Classes usam `PascalCase`.

---

## Funções

### Regra

Funções usam `camelCase`.

---

## Variáveis

### Regra

Variáveis usam `camelCase`.

---

## Constantes

### Regra

Constantes podem seguir:

* `camelCase` para constantes locais
* `UPPER_SNAKE_CASE` para constantes globais e semânticas

---

# Convenção de DTOs

## Regra

DTOs devem ter nome por ação ou propósito.

### Bom

```ts
CreateTicketDto
UpdateTicketStatusDto
AgentHeartbeatDto
RegisterAgentDto
```

### Evitar

```ts
TicketDto
DataDto
PayloadDto
```

---

# Convenção de Use Cases

## Regra

Use cases devem seguir verbo + contexto.

### Exemplos

```ts
CreateTicketUseCase
UpdateTicketStatusUseCase
RegisterAgentUseCase
ApplyDesiredStateUseCase
```

---

# Convenção de Ports

## Regra

Ports devem deixar explícita a abstração.

### Exemplos

```ts
TicketRepositoryPort
BackupUploaderPort
TunnelManagerPort
RemoteAccessPort
```

---

# Convenção de Repositories

## Regra

Repositories concretos devem ser nomeados por domínio.

### Exemplos

```ts
TicketRepository
CompanyRepository
AgentRepository
```

### Quando houver implementação específica

Pode explicitar a tecnologia.

```ts
PrismaTicketRepository
PrismaCompanyRepository
```

---

# Convenção de Mappers

## Regra

Mapper deve refletir a transformação que faz.

### Exemplos

```ts
TicketMapper
TicketResponseMapper
CompanyPersistenceMapper
AgentHeartbeatMapper
```

---

# Convenção de Services

## Regra

`service` deve ser usado com cuidado.

Use `service` quando a abstração realmente for um serviço.

### Observação

No `apps/api`, `service` também é um papel técnico do NestJS e por isso é aceitável.

---

# Convenção de Policies

## Regra

Policies devem representar regra explícita.

---

# Convenção de Value Objects

## Regra

Value objects devem representar conceito de domínio.

---

# Convenção de Events e Webhooks

## Regra

Eventos e webhooks devem deixar claro:

* origem
* contexto
* natureza do payload

---

# Convenção de Módulos

## Regra

Módulos devem ser nomeados pelo domínio.

### Bom

```text
ticket
company
settings
agent
remote
backup
```

### Evitar

```text
management
helpers
general
data
```

### Preferência adicional

Para novos módulos, preferir singular.

---

# Convenção de Barrel Exports

## Regra

Cada pasta relevante deve ter `index.ts`.

## Objetivo

* expor API pública
* esconder estrutura interna
* evitar imports profundos

## Regra importante

Não usar barrel para exportar tudo cegamente em estruturas muito grandes sem critério.
O `index.ts` deve ser uma fronteira consciente.

---

# Convenção de Imports

## Regra principal

Usar alias do monorepo.

### Bom

```ts
import { Ticket } from '@trilink/contracts/ticket';
import { getTickets } from '@trilink/application/ticket';
import { Button } from '@trilink/ui';
```

### Evitar

```ts
import { Ticket } from '../../../../packages/contracts/src/ticket/ticket.types';
```

## Regra de profundidade

Evitar import profundo em arquivos internos do package, salvo quando o package definir isso como público.

## Ordem recomendada

1. bibliotecas externas
2. aliases do monorepo
3. imports relativos locais

---

# Convenção de nomes em React

## Componentes

Usar `PascalCase` no símbolo e `kebab-case.tsx` no arquivo.

### Exemplo

Arquivo:

```text
ticket-list.tsx
```

Símbolo:

```tsx
export function TicketList() {}
```

## Hooks

Arquivo:

```text
use-ticket-filters.ts
```

Símbolo:

```ts
export function useTicketFilters() {}
```

## Providers

Arquivo:

```text
theme.provider.tsx
```

Símbolo:

```tsx
export function ThemeProvider() {}
```

---

# Convenção de nomes em Go para o Agent

## Arquivos

Usar nomes simples e previsíveis.

## Tipos

Usar `PascalCase`.

## Funções

Usar `PascalCase` para exportadas e convenção interna da linguagem para funções locais.

---

# Convenção para nomes de payloads

## Regra

Quando um payload tem papel claro na comunicação, o nome deve mostrar isso.

### Exemplos

```ts
RegisterAgentRequest
RegisterAgentResponse
HeartbeatRequest
HeartbeatResponse
BackupResultPayload
DesiredStatePayload
```

---

# Convenção para nomes de arquivos de configuração

## Regra

Configuração deve ter nome explícito.

### Exemplos

```text
agent.config.ts
backup.config.ts
remote-module.config.ts
feature-flags.config.ts
```

### Evitar

```text
config.ts
settings.ts
options.ts
```

quando estiverem genéricos demais.

---

# Convenção de plural e singular

## Regra

Usar singular para domínio e tipo principal.

### Bom

```text
ticket
company
user
agent
```

### Evitar

```text
tickets
companies
users
```

salvo em contextos muito específicos de coleção ou quando o legado já estiver consolidado e o custo de rename for alto.

---

# Anti-patterns de nomenclatura

## 1. Nomes genéricos demais

```text
types.ts
helpers.ts
utils.ts
data.ts
model.ts
```

sem contexto de domínio.

## 2. Mesmo conceito com vários nomes

Exemplo ruim:

* `client`
* `customer`
* `company`

para representar a mesma entidade.

## 3. Sufixos aleatórios

Exemplo ruim:

* `ticket-helper.service.ts`
* `company-util.manager.ts`

## 4. Abreviações desnecessárias

Exemplo ruim:

* `cfg`
* `dto-data`
* `svc`
* `prov-set`

## 5. Mistura de idiomas

Escolher um idioma técnico principal e manter consistência.

## 6. ORM atravessando fronteira

Exemplo ruim:

* `apps/web` importando `@prisma/client`

---

# Idioma recomendado

## Recomendação prática

Como a base técnica costuma usar convenções globais, a recomendação mais sólida é:

* nomes técnicos e estruturais em inglês
* textos de documentação e negócio podem ficar em português

### Exemplos recomendados

```text
ticket.types.ts
company.repository.ts
desired-state.types.ts
heartbeat.client.ts
```

---

# Regra oficial resumida

## Arquivos

* `kebab-case`
* sufixo semântico por camada
* evitar nomes genéricos sem contexto de domínio

## Símbolos

* `PascalCase` para tipos, classes, interfaces, enums e componentes
* `camelCase` para funções e variáveis

## Módulos

* nome do domínio
* minúsculo
* curto e claro
* singular preferencialmente em novos módulos

## Imports

* sempre por alias público do package
* evitar caminhos profundos
* frontend não deve importar ORM quando houver contrato compartilhado

## Barrel exports

* obrigatórios nos módulos relevantes
* expor somente a API pública desejada

## Fronteiras

* `apps/web` depende de `contracts`, não de persistência
* `apps/api` pode depender de Prisma e infraestrutura
* `packages/contracts` define a linguagem compartilhada

---

# Exemplos finais consolidados

## Contracts

```text
ticket.types.ts
ticket-form.types.ts
ticket-provider-api.types.ts
desired-state.types.ts
heartbeat.types.ts
```

## Core

```text
create-ticket.use-case.ts
ticket.entity.ts
ticket-sla.policy.ts
ticket-repository.port.ts
hardware-id.value-object.ts
```

## Database

```text
ticket.repository.ts
ticket.mapper.ts
ticket-summary.query.ts
```

## Application

```text
ticket.client.ts
agent.client.ts
heartbeat.client.ts
```

## API

```text
ticket.controller.ts
ticket.module.ts
create-ticket.dto.ts
ticket.presenter.ts
```

## Web

```text
ticket-list.tsx
page-header.tsx
use-ticket-filters.ts
theme.provider.tsx
company-read.queries.ts
company-write.actions.ts
company-view.types.ts
```

---

# Conclusão

Essa convenção existe para garantir uma coisa simples:

> ao bater o olho em um nome, qualquer pessoa da equipe deve conseguir inferir rapidamente o que aquele arquivo ou símbolo faz.

Quando isso é respeitado, o monorepo ganha:

* legibilidade
* previsibilidade
* consistência
* escalabilidade

E, a partir desta revisão, ganha também uma diretriz enterprise mais explícita:

> nomes devem refletir domínio, fronteira arquitetural e responsabilidade sem depender de contexto implícito.
