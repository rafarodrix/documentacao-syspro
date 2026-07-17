# Trilink Agent Frontend (Wails + React)

Este diretorio contem a interface grafica oficial do Trilink Agent, desenvolvida com Wails, React e TypeScript.

A interface deve permanecer como camada de experiencia do usuario. Regras operacionais, credenciais sensiveis e controle de componentes continuam fora do frontend e pertencem ao agent service.

## Arquitetura

O desenho alvo da refatoracao esta em [ARCHITECTURE_REFACTOR.md](../ARCHITECTURE_REFACTOR.md).

Principios obrigatorios para qualquer ajuste no frontend:

1. A UI nao executa rotinas principais do agente.
2. A UI nao armazena credenciais sensiveis.
3. A UI fala com o backend apenas via bindings Wails e contratos tipados.
4. A UI nao dispara comandos arbitrarios, scripts ou shell.
5. A UI precisa degradar bem quando o service estiver offline.
6. Preferencias locais da UI devem ficar restritas a comportamento visual e de janela.

## Estrutura atual

O frontend foi reorganizado para deixar `App.tsx` apenas como composicao do shell e separar estado, telas e integracoes por responsabilidade:

```text
src/
├── App.tsx
├── bindings.ts
├── components/
│   ├── CopyButton.tsx
│   ├── RemoteAccessCard.tsx
│   └── icons.tsx
├── features/
│   ├── setup/
│   │   ├── SetupScreen.tsx
│   │   └── setup-helpers.ts
│   └── support/
│       ├── SupportScreen.tsx
│       └── chatwoot.ts
├── hooks/
│   └── useAgentShell.ts
├── services/
│   ├── shell-service.ts
│   ├── setup-service.ts
│   └── support-service.ts
└── types/
    ├── agent-ui.ts
    └── route.ts
```

### Fronteiras

1. `App.tsx`: shell principal, navbar e selecao da tela ativa.
2. `hooks/useAgentShell.ts`: bootstrap inicial, assinaturas Wails, polling e orquestracao de estado.
3. `features/setup/*`: onboarding, timeline e copy do provisionamento.
4. `features/support/*`: painel de suporte, drawer do Chatwoot e integracao visual do atendimento.
5. `services/*`: adaptadores da UI sobre os bindings Wails e normalizacao dos contratos.
6. `components/*`: elementos reutilizaveis puramente visuais.
7. `bindings.ts`: unica porta de entrada do frontend para chamadas Wails.

Novas capacidades devem seguir esse padrao: contrato vindo de `bindings`, estado/orquestracao em hook ou service de frontend, e renderizacao encapsulada por feature.

## Contratos Wails atuais

O frontend nao deve mais expandir a UI em cima dos contratos legados `GetAgentSetupView` e `GetAgentSupportView`.

Os contratos preferenciais agora sao:

1. `GetAgentSetupView()`
2. `GetAgentSupportView()`

Esses metodos ja expõem o vocabulário novo da UI:

1. `device`
2. `installation`
3. `capabilities`

Os contratos antigos permanecem apenas como compatibilidade residual no backend Wails enquanto a limpeza completa nao e concluida.
