# Padrão de Módulo Enterprise para Replicação nos Próximos Contextos

## Objetivo

Este documento consolida o padrão que vamos adotar para módulos de negócio do portal, começando pelo módulo `company`.

Ele complementa:

* [_bmad-output/portal/1-estrutura-monorepo.md](/abs/path/c:/DEV/documentacao-syspro/_bmad-output/portal/1-estrutura-monorepo.md)
* [_bmad-output/portal/2-padrao-nomeclatura.md](/abs/path/c:/DEV/documentacao-syspro/_bmad-output/portal/2-padrao-nomeclatura.md)

O foco aqui não é só nomenclatura isolada.
O foco é alinhar:

* fronteiras arquiteturais
* nomes de arquivos
* nomes de símbolos
* responsabilidades por camada
* padrão replicável para os próximos módulos

---

# Diagnóstico do módulo empresa

## O que já está bom

O módulo `company` já está razoavelmente alinhado ao desenho enterprise esperado:

* `packages/contracts/src/company`
  * contratos compartilhados
* `apps/api/src/modules/companies`
  * backend e orquestração NestJS
* `apps/web/src/features/company`
  * camada de feature no frontend
* `apps/web/src/components/platform/cadastros/company`
  * composição visual específica da experiência de cadastro

Também foi corrigido o principal acoplamento ruim do frontend:

* o fluxo de empresa no `apps/web` deixou de depender de enums do `@prisma/client`
* o frontend passou a depender de `@dosc-syspro/contracts/company`

Isso está de acordo com a diretriz:

> frontend usa contratos
> backend usa persistência
> contracts definem a fronteira

---

## O que ainda está fora do padrão oficial

### 1. Arquivos React em `PascalCase`

Hoje existem arquivos como:

* `CompanyTab.tsx`
* `CreateCompanyPageForm.tsx`
* `CompanyIdentificationTab.tsx`
* `CompanyFiscalTab.tsx`

Pelo padrão oficial do monorepo, em `apps/web` o arquivo deveria ser `kebab-case`.

### Forma desejada

```text
company-tab.tsx
create-company-page-form.tsx
company-identification-tab.tsx
company-fiscal-tab.tsx
```

### Símbolo exportado

O símbolo continua em `PascalCase`.

```tsx
export function CompanyTab() {}
```

---

### 2. Arquivos genéricos demais em `application`

Hoje existem:

* `actions.ts`
* `queries.ts`
* `types.ts`

Esses nomes são funcionais, mas não são bons como padrão enterprise durável.

O documento de nomenclatura já trata isso como anti-pattern quando o nome perde contexto.

### Forma desejada

```text
company-write.actions.ts
company-read.queries.ts
company-view.types.ts
company-registry.types.ts
```

Nem sempre tudo precisa ser quebrado agora, mas este deve ser o alvo.

---

### 3. Pasta do backend em plural

Hoje o backend está em:

```text
apps/api/src/modules/companies
```

Pelo padrão oficial resumido, o domínio preferido é singular:

```text
company
ticket
user
agent
```

### Estado atual

`companies` funciona e não é um erro técnico.

### Estado desejado

```text
apps/api/src/modules/company
```

Não é obrigatório migrar isso imediatamente se o custo de rename for alto, mas para módulos novos a recomendação é usar singular.

---

### 4. Tipos locais ainda duplicam shape de contrato

Arquivo atual:

* `apps/web/src/features/company/application/types.ts`

Esse arquivo hoje mistura:

* aliases corretos vindos de `contracts`
* respostas locais da aplicação
* shapes de view e lookup

Isso não é um problema de banco, mas é um sinal de que o módulo ainda pode evoluir para um contrato mais explícito.

### Regra que vamos adotar

* tipo compartilhado e estável: vai para `packages/contracts`
* tipo transitório de tela ou action: pode ficar em `apps/web`
* evitar duplicar shape que já existe em `contracts`

---

# Padrão oficial que vamos adotar a partir de agora

## Regra de fronteira

### `packages/contracts`

É a fonte oficial de:

* unions
* payloads
* inputs
* responses
* view models compartilhados entre apps

### `apps/api`

É dono de:

* persistência
* Prisma
* regras de atualização
* composição HTTP/NestJS

### `apps/web`

É dono de:

* composição de tela
* navegação
* mapeamento para exibição
* actions e queries finas

### Regra principal

O `apps/web` não deve depender de:

* `@prisma/client`
* tipos internos de banco
* enums internos do backend
* shape implícito que não esteja publicado por `contracts`

---

## Estrutura alvo por módulo no frontend

Para módulos enterprise novos, a estrutura preferida no `apps/web` será:

```text
features/<domain>/
  application/
    <domain>-read.queries.ts
    <domain>-write.actions.ts
    <domain>-view.types.ts
    index.ts

  domain/
    <domain>-labels.ts
    <domain>-rules.ts
    index.ts

  infrastructure/
    contracts/
    gateways/
    index.ts

  interface/
    hooks/
      use-<domain>-filters.ts
    index.ts
```

Quando houver composição visual muito acoplada à shell do portal, ela pode continuar em:

```text
components/platform/.../<domain>/
```

Mas os nomes dos arquivos devem seguir `kebab-case`.

---

## Estrutura alvo por módulo no backend

Para módulos novos no `apps/api`, o padrão preferido será:

```text
apps/api/src/modules/<domain>/
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.module.ts
```

Se o módulo crescer, aí sim dividir em subpastas:

```text
controllers/
services/
dto/
mappers/
presenters/
```

Mas sem criar profundidade desnecessária cedo demais.

---

# Regras de nomenclatura que vamos efetivamente seguir

## Arquivos

### Sempre usar

* `kebab-case`
* sufixo semântico quando fizer sentido

### Exemplos corretos

```text
company-tab.tsx
company-identification-tab.tsx
company-fiscal-tab.tsx
company-write.actions.ts
company-read.queries.ts
company-view.types.ts
company-segment-labels.ts
company-lookup-cnpj.gateway.ts
```

---

## Símbolos

### Componentes, tipos e classes

Usar `PascalCase`.

```ts
CompanyTab
CreateCompanyPageForm
CompanyEditViewData
```

### Funções e variáveis

Usar `camelCase`.

```ts
createCompanyAction
getCompanyEditViewData
resolvePostSaveHref
```

---

## Pastas

### Regra

* minúsculas
* sem camelCase
* domínio em singular preferencialmente

### Exemplos

```text
company
ticket
contact
remote
agent
```

---

# Padrão específico para tipos de módulo

## Quando usar `*.types.ts`

Usar para:

* tipos de contrato
* tipos de view local
* tipos agrupados por responsabilidade explícita

### Evitar

```text
types.ts
```

### Preferir

```text
company-view.types.ts
company-registry.types.ts
company-action.types.ts
```

---

## Quando usar `*.queries.ts`

Usar para leitura.

### Bom

```text
company-read.queries.ts
```

### Evitar

```text
queries.ts
```

---

## Quando usar `*.actions.ts`

Usar para escrita ou server actions.

### Bom

```text
company-write.actions.ts
```

### Evitar

```text
actions.ts
```

---

## Quando usar `*.gateway.ts`

Usar para integração externa específica.

### Bom

```text
company-lookup-cnpj.gateway.ts
company-registry.gateway.ts
```

---

# Aplicação prática no módulo empresa

## Estado recomendado de evolução

### Manter como está por agora

* `packages/contracts/src/company/company.types.ts`
* `apps/web/src/features/company/domain/company-segments.ts`
* `apps/web/src/features/company/infrastructure/gateways/company-lookup-cnpj.gateway.ts`
* `apps/web/src/features/company/infrastructure/contracts/company-*.contract.ts`

### Evoluir em próxima rodada

Renomear arquivos do frontend de empresa para `kebab-case`:

* `CompanyTab.tsx` -> `company-tab.tsx`
* `CreateCompanyPageForm.tsx` -> `create-company-page-form.tsx`
* `CompanyIdentificationTab.tsx` -> `company-identification-tab.tsx`
* `CompanyAddressTab.tsx` -> `company-address-tab.tsx`
* `CompanyContactTab.tsx` -> `company-contact-tab.tsx`
* `CompanyFiscalTab.tsx` -> `company-fiscal-tab.tsx`
* `CompanySettingsTab.tsx` -> `company-settings-tab.tsx`

### Evoluir em rodada seguinte

Renomear os arquivos genéricos da camada `application`:

* `actions.ts` -> `company-write.actions.ts`
* `queries.ts` -> `company-read.queries.ts`
* `types.ts` -> `company-view.types.ts`

---

# Checklist para novos módulos

Antes de considerar um novo módulo alinhado ao padrão, validar:

* o frontend não importa `@prisma/client`
* contratos compartilhados estão em `packages/contracts`
* arquivos React estão em `kebab-case`
* símbolos públicos estão em `PascalCase`
* arquivos genéricos como `types.ts` e `actions.ts` foram evitados
* gateways externos têm nome explícito
* domínio principal está em singular
* `index.ts` expõe somente a API pública desejada

---

# Regra final para os próximos módulos

O padrão que vamos replicar é este:

> frontend fino
> contrato explícito
> backend dono da persistência
> nomes previsíveis por camada
> arquivos em kebab-case
> evitar arquivos genéricos sem contexto

---

# Conclusão

O módulo empresa já está em um bom ponto estrutural para servir de base.

Ele ainda tem resíduos legados de nomenclatura, principalmente:

* arquivos React em `PascalCase`
* arquivos genéricos como `actions.ts`, `queries.ts` e `types.ts`
* pasta plural no backend

Esses pontos não invalidam a arquitetura, mas devem ser tratados como débitos de padronização.

Para os próximos módulos, o padrão oficial adotado será:

* contratos em `packages/contracts`
* frontend dependente de contratos, nunca de Prisma
* arquivos em `kebab-case`
* nomes explícitos por responsabilidade
* fronteiras claras entre `application`, `domain`, `infrastructure` e `interface`
