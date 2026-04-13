Perfeito. Abaixo está a **documentação atual da Etapa 1 do Master Agent Trilink**, já consolidada com o que foi definido e com o que vocês **validaram na prática**.

---

# Master Agent Trilink — Etapa 1

## Fundação revisada do agente

## Visão geral

A Etapa 1 estabelece a base estrutural e operacional do **Master Agent Trilink**.

O foco desta fase não é ainda aplicar configurações de módulos como RustDesk, Rathole ou backup, mas sim criar o **núcleo confiável do agente**, com capacidade de:

* iniciar corretamente
* gerar e persistir identidade local
* registrar o dispositivo no portal
* manter heartbeat periódico
* consultar o desired state do portal
* persistir estado local com segurança
* operar com loops coordenados e canceláveis
* preparar a base para o futuro mecanismo de reconcile

Esta etapa já nasce com preocupações de produção, como:

* desacoplamento via contratos
* prevenção de importação cíclica
* persistência local atômica
* telemetria assíncrona
* base para evolução da identidade da máquina
* ciclo de vida controlado com `context`

---

# Objetivo da Etapa 1

A Etapa 1 tem como objetivo transformar o agente em um serviço com fundação sólida, previsível e extensível.

## Objetivos funcionais

* subir o agente a partir de um único ponto de entrada
* inicializar dependências de forma centralizada
* gerar ou reutilizar identidade da máquina
* registrar o dispositivo no portal
* manter loops de heartbeat e desired state
* persistir o estado mínimo necessário para reinicialização limpa

## Objetivos arquiteturais

* separar domínio, core e infraestrutura
* evitar acoplamento entre serviços
* evitar ciclos de importação
* permitir troca futura de implementações sem retrabalho
* preparar a base para testes e para o mecanismo de reconcile

## Objetivos operacionais

* garantir que reinícios do agente reutilizem o estado local
* garantir escrita segura de arquivos JSON
* garantir que telemetria não bloqueie o funcionamento principal
* garantir desligamento limpo por cancelamento de contexto

---

# Escopo da Etapa 1

Esta fase contempla exclusivamente a fundação do agente.

## Incluído

* estrutura inicial do projeto em Go
* bootstrap central
* container de dependências
* modelos de domínio compartilhados
* serviço principal do agente
* serviço de identidade
* serviço de registro
* serviço de heartbeat
* serviço de desired state
* persistência local com escrita atômica
* executor central básico
* event bus assíncrono
* cliente HTTP inicial em modo stub

## Não incluído ainda

* reconcile engine
* diff entre current state e desired state
* aplicação de mudanças por módulos
* instalação/configuração de RustDesk
* instalação/configuração de Rathole
* execução de backup
* atualização remota de componentes
* criptografia local com DPAPI
* Job Objects do Windows
* integridade por hash dos binários embarcados
* fila persistente de eventos
* recovery com backup de estado

---

# Estrutura lógica consolidada

A estrutura atual do agent foi definida para separar claramente:

* entrada da aplicação
* orquestração
* domínio compartilhado
* serviços de núcleo
* infraestrutura técnica
* utilitários transversais

## Estrutura do projeto

```text
agent/
  cmd/
    agent/

  internal/
    app/
    domain/
    core/
      agent/
      desiredstate/
      heartbeat/
      identity/
      registration/
    infra/
      config/
      http/
      logging/
      platform/
      runtime/
      storage/
      telemetry/
    shared/
      retry/

  go.mod
  go.sum
```

---

# Princípios arquiteturais adotados

## 1. Modelos compartilhados em `internal/domain`

Os modelos puros de dados foram movidos para uma camada de domínio compartilhado para evitar acoplamento excessivo entre pacotes e reduzir risco de import cycles.

Essa camada concentra estruturas como:

* identidade do dispositivo
* desired state
* evento de telemetria

Isso permite que core, infra e futuros módulos usem os mesmos tipos sem criar dependências cruzadas perigosas.

---

## 2. Core depende de contratos, não de implementações

O núcleo do agente não conhece detalhes concretos de infraestrutura.

Ele depende de contratos como:

* provedor de identidade
* serviço de registro
* serviço de heartbeat
* serviço de desired state
* store de estado
* executor
* logger
* event bus

Essa decisão permite:

* maior testabilidade
* menor acoplamento
* troca futura de implementações sem impacto estrutural
* evolução do runtime sem refatoração em cascata

---

## 3. Persistência local com escrita atômica

A escrita de estado local foi desenhada para reduzir risco de corrupção de arquivo.

O padrão adotado é:

* gerar o conteúdo em memória
* escrever em arquivo temporário
* substituir o arquivo final por rename
* aplicar retry no rename para lidar com comportamento do Windows

Essa abordagem protege os arquivos mais importantes do agente, como:

* `identity.json`
* `registration.json`
* `heartbeat.json`
* `desired_state.json`

---

## 4. Telemetria separada de logging

A arquitetura diferencia claramente:

### Logging

Uso local, humano e diagnóstico.

Exemplos:

* início do agente
* heartbeat enviado
* desired state consultado
* erro de comunicação

### EventBus

Uso operacional, orientado a máquina e portal.

Exemplos:

* registration succeeded
* registration failed
* desired state updated
* heartbeat failed

Essa separação prepara a plataforma para dashboards, alertas e histórico operacional.

---

## 5. Telemetria assíncrona

O `EventBus` foi desenhado para não bloquear os loops principais do agente.

A publicação de eventos:

* usa buffer interno
* opera em segundo plano
* evita travamento do heartbeat ou desired state por latência de rede

No estado atual, a implementação ainda é simples e local, mas a arquitetura já está pronta para crescer.

---

## 6. Fonte de identidade pluggável

O serviço de identidade não gera a identidade diretamente.

Ele depende de uma fonte de identidade separada.

Na implementação atual, a identidade usa:

* hostname
* sistema operacional
* hash derivado desses dados

Isso está marcado como **fallback inicial**.

A arquitetura já foi preparada para futura evolução para uma identidade mais estável no Windows, como:

* `MachineGuid` do registro

---

## 7. Ciclo de vida coordenado por contexto

O agente principal opera com:

* `context.Context`
* cancelamento central
* `errgroup` para coordenação dos loops

Isso garante que o agente tenha comportamento previsível em:

* inicialização
* operação contínua
* shutdown
* falhas críticas

---

# Componentes da Etapa 1

## App

A camada `app` é responsável por montar o container de dependências e iniciar o serviço principal.

Ela faz:

* carregamento de configuração
* construção do logger
* construção do state store
* construção do client HTTP
* construção do executor
* construção do event bus
* construção dos serviços do core
* entrega do serviço principal do agente

É a porta de entrada da aplicação.

---

## Domain

A camada `domain` concentra os tipos compartilhados da aplicação.

Ela representa apenas dados, sem comportamento operacional.

Atualmente cobre:

* identidade do dispositivo
* desired state
* evento de telemetria

---

## Core / Agent

É o serviço principal do agente.

Responsabilidades:

* iniciar o agente
* obter identidade
* garantir registro
* iniciar heartbeat
* iniciar desired state
* manter health loop
* coordenar o ciclo de vida dos loops

Ele ainda não faz reconcile, mas já funciona como núcleo de orquestração básica.

---

## Core / Identity

Responsável por:

* tentar carregar identidade já persistida
* gerar nova identidade se necessário
* persistir a identidade
* devolver a identidade do dispositivo para o restante do sistema

Na etapa atual, a identidade já é persistida e reutilizada entre reinicializações.

---

## Core / Registration

Responsável por:

* verificar se o dispositivo já está registrado
* registrar no portal quando necessário
* persistir o estado de registro
* emitir evento de sucesso ou falha

Na etapa atual, a comunicação com o portal ainda está em stub, mas o fluxo lógico já está completo.

---

## Core / Heartbeat

Responsável por:

* executar heartbeat periódico
* persistir o timestamp do último sucesso
* emitir evento em caso de falha

Na etapa atual, o heartbeat já roda em loop e atualiza o estado local.

---

## Core / Desired State

Responsável por:

* consultar periodicamente o desired state do portal
* manter o último desired state em memória
* carregar o desired state persistido ao iniciar
* persistir o desired state quando mudar
* emitir evento apenas quando houver alteração real

Um refinamento importante já foi aplicado aqui:

* no boot, o serviço carrega o cache salvo em disco
* isso evita falso evento de atualização logo após reiniciar o agente

---

## Infra / Config

Responsável por fornecer a configuração de execução do agente.

Na etapa atual, cobre:

* nível de log
* configuração do portal
* diretório de estado local

---

## Infra / HTTP

Responsável pela comunicação com o portal.

Na etapa atual está em modo stub e oferece operações iniciais para:

* registrar dispositivo
* enviar heartbeat
* obter desired state

---

## Infra / Logging

Responsável pelo log local da aplicação.

Na etapa atual a implementação é simples, mas suficiente para desenvolvimento e validação estrutural.

---

## Infra / Platform

Responsável por detalhes específicos do ambiente operacional.

Na etapa atual cobre a fonte de identidade Windows inicial.

---

## Infra / Runtime

Responsável por executar processos externos de forma centralizada.

Na etapa atual já existe um executor básico que captura:

* saída padrão
* saída de erro
* código de retorno
* erro de execução

Ele será a base futura para execução de RustDesk, Rathole, Rclone e tarefas auxiliares.

---

## Infra / Storage

Responsável pela persistência local do estado do agente.

Características atuais:

* serialização em JSON
* escrita atômica
* retry no rename
* leitura e gravação centralizadas

É uma das camadas mais críticas da Etapa 1.

---

## Infra / Telemetry

Responsável pela emissão assíncrona de eventos operacionais.

No estágio atual:

* há implementação `Noop`
* há implementação assíncrona com buffer
* eventos são consumidos localmente

A estrutura já está pronta para futura integração real com o portal.

---

## Shared / Retry

Responsável por utilitário simples de retry.

Hoje é usado no rename da escrita atômica, especialmente para reduzir falhas transitórias no Windows.

---

# Fluxo operacional atual

## Fluxo de inicialização

O fluxo atual do agente é:

1. iniciar aplicação
2. carregar configuração
3. inicializar logger
4. inicializar state store
5. inicializar client HTTP
6. inicializar executor
7. inicializar event bus
8. inicializar source de identidade
9. construir serviços do core
10. iniciar serviço principal do agente

---

## Fluxo de identidade

1. tentar carregar `identity.json`
2. se existir e for válido, reutilizar
3. se não existir, gerar nova identidade
4. persistir identidade
5. devolver identidade ao núcleo do agente

---

## Fluxo de registro

1. tentar carregar `registration.json`
2. se o dispositivo já estiver marcado como registrado, seguir
3. se não estiver, executar registro no portal
4. persistir estado de registro
5. emitir evento de sucesso ou falha

---

## Fluxo de heartbeat

1. iniciar ticker periódico
2. enviar heartbeat ao portal
3. em caso de sucesso, persistir `heartbeat.json`
4. em caso de falha, registrar aviso e emitir evento
5. repetir enquanto o contexto estiver ativo

---

## Fluxo de desired state

1. carregar `desired_state.json` no boot, se existir
2. iniciar ticker periódico
3. consultar desired state do portal
4. comparar com o último estado carregado
5. se mudou, persistir novo estado e emitir evento
6. se não mudou, apenas registrar verificação
7. repetir enquanto o contexto estiver ativo

---

## Fluxo de shutdown

1. receber cancelamento de contexto
2. interromper loops principais
3. finalizar goroutines coordenadas
4. encerrar o agente de forma limpa

A base do shutdown já está funcional. A observabilidade de encerramento pode ser expandida nas próximas etapas.

---

# Estado local persistido

A Etapa 1 já produz e mantém os seguintes arquivos de estado:

## `identity.json`

Representa a identidade persistida do dispositivo.

Contém:

* `device_id`
* `hostname`
* `os`
* `identity_source`

---

## `registration.json`

Representa se o dispositivo já foi registrado com sucesso.

Contém:

* status de registro
* device id associado

---

## `heartbeat.json`

Representa o último heartbeat bem-sucedido.

Contém:

* timestamp do último sucesso

---

## `desired_state.json`

Representa o último desired state persistido localmente.

Contém:

* versão
* timestamp de atualização

---

# Resultado validado na prática

A Etapa 1 não ficou apenas no desenho; ela foi validada com execução real.

## Validações concluídas

* compilação do módulo sem erro
* inicialização do agente via `main`
* criação correta dos arquivos de estado
* execução periódica do heartbeat
* execução periódica da consulta de desired state
* reaproveitamento de identidade já persistida
* reaproveitamento de estado de registro
* desired state carregado do cache no boot
* ausência de falso positivo de atualização do desired state ao reiniciar
* telemetria assíncrona sem travar os loops principais

---

## Evidências funcionais observadas

Durante os testes, o agente demonstrou:

* criação inicial da identidade
* registro inicial do dispositivo
* carregamento posterior da identidade persistida
* reconhecimento de dispositivo já registrado
* atualização contínua do heartbeat
* consulta contínua do desired state
* carregamento do desired state do cache no boot

---

# Decisões de projeto consolidadas nesta etapa

## Adotadas

* `internal/domain` para tipos compartilhados
* contratos nos pacotes consumidores
* identidade com source separada
* persistência local atômica
* retry no rename
* telemetria assíncrona
* uso de `context`
* coordenação por `errgroup`
* desired state com cache carregado no boot

## Postergadas para próximas etapas

* DPAPI
* MachineGuid real
* hash de integridade dos binários
* recuperação por `.bak`
* fila persistente de eventos
* execution supervision com Job Objects
* retries com backoff exponencial
* reconcile engine
* current state model
* apply de módulos

---

# Limitações atuais conhecidas

A Etapa 1 está sólida, mas ainda intencionalmente simples em alguns pontos.

## Limitações atuais

* logger ainda básico
* cliente HTTP ainda em stub
* event bus ainda sem envio real ao portal
* executor ainda sem supervisão avançada de processos
* identity ainda usando fallback por hostname
* storage ainda sem recovery por backup secundário
* sem current state consolidado
* sem reconcile
* sem aplicação de desired state em módulos reais

Essas limitações são esperadas para a fase atual.

---
