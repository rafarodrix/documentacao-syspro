# @dosc-syspro/remote-domain

Pacote de dominio compartilhado para o modulo remoto.

Objetivo:
- concentrar regras de negocio de `discover/bootstrap/sync/ack`
- manter `route.ts` como adapter HTTP fino
- permitir consumo unico por `apps/web`, `apps/api` e `apps/mobile`

Recortes ja entregues:
- contrato Zod e use case de `heartbeat`
- contrato Zod e use case de `bootstrap`
- contrato Zod e use case de `ack`
- contrato Zod e use case de `sync` (inclui compliance + command queue)
- contrato Zod e use case de `discover`
- facade `createTrilinkRemote` para composicao nos adapters HTTP
