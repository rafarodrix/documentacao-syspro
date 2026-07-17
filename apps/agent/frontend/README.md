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
└── types/
    └── route.ts
```

### Fronteiras

1. `App.tsx`: shell principal, navbar e selecao da tela ativa.
2. `hooks/useAgentShell.ts`: bootstrap inicial, assinaturas Wails, polling e orquestracao de estado.
3. `features/setup/*`: onboarding, timeline e copy do provisionamento.
4. `features/support/*`: painel de suporte, drawer do Chatwoot e integracao visual do atendimento.
5. `components/*`: elementos reutilizaveis puramente visuais.
6. `bindings.ts`: unica porta de entrada do frontend para chamadas Wails.

Novas capacidades devem seguir esse padrao: contrato vindo de `bindings`, estado/orquestracao em hook ou service de frontend, e renderizacao encapsulada por feature.
