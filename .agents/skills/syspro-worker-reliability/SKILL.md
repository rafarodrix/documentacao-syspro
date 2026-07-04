---
name: syspro-worker-reliability
description: Garante confiabilidade, idempotência, observabilidade e tratamento de erro em fluxos assíncronos e workers.
---

# syspro-worker-reliability

Use esta skill ao mexer em jobs periodicos, webhooks, filas de comandos, sync com agentes ou qualquer fluxo assincrono com retry.

## Areas tipicas

- `apps/api/src/modules/tarefas`
- `apps/api/src/modules/integrations/*`
- `apps/agent/internal/modules/remote`
- `packages/features/remote/domain`

## Regras

- Toda operacao assincrona precisa de idempotencia ou deduplicacao explicita.
- Retry deve ser limitado e observavel; falha silenciosa nao e aceitavel.
- ACK, status e timestamps devem permitir diagnostico posterior.
- Leituras e side effects devem ficar separados sempre que possivel.
- Nao descarte comando ou evento transitivamente sem trilha minima de erro.

## Sinais de qualidade

- Existe comportamento definido para replay.
- O sistema tolera indisponibilidade temporaria do provider.
- Filas locais ou em memoria tem limite, log e criterio de descarte claro.

## Validacao

- Teste o caminho feliz e ao menos uma falha transitoria.
- Verifique se os logs e estados persistidos permitem explicar o que aconteceu.
