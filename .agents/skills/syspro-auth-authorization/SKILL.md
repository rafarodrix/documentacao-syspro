---
name: syspro-auth-authorization
description: Orienta sobre controle de acesso, permissões (RBAC) persistidas, company scope e segurança de rotas.
---

# syspro-auth-authorization

Use esta skill quando alterar permissoes, company scope, sessao, headers internos ou fluxos que combinam role legado com RBAC persistido.

## Fonte de verdade

- A autorizacao efetiva vive no backend.
- `role` continua como identidade historica, nao como regra primaria espalhada.
- Perfis e permissoes persistidas no banco devem guiar o comportamento real do sistema.

## Regras

- No `web`, prefira `currentUserHasPermission` e `currentUserHasAnyPermission`.
- No `api`, valide requester, escopo e permissao no backend antes de agir.
- Use `acceptCompanyScope` apenas quando a regra puder operar por empresa.
- Nao replique matriz de permissao manualmente em tela, hook e service ao mesmo tempo.
- Integracao `web -> api` usa `x-internal-api-key`; nao misture auth de servico com auth de usuario.

## Casos sensiveis

- Tickets, dashboard, atendimento e Chatwoot exigem cuidado extra com escopo por empresa.
- Fallbacks por role devem ser reduzidos, nao expandidos.
- Mudancas em RBAC costumam exigir ajuste conjunto em contratos, backend e frontend.

## Validacao

- Teste pelo menos o caso permitido, negado e fora de escopo.
- Se uma permissao muda de significado, atualize a documentacao correspondente.
