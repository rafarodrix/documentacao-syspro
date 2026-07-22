# Plano de Endurecimento e Refatoracao

| ID | Pri. | Evidencia e causa raiz | Correcao e teste | Complexidade |
| --- | --- | --- | --- | --- |
| SEC-P0-001 | P0 concluido | `auth.service.ts` aceitava `fallback-secret-para-dev-local` | `requireBetterAuthSecret` agora falha na inicializacao quando ausente; testes cobrem ausencia e segredo valido | baixa |
| ARC-P1-001 | P1 bloqueado | web resolve `@dosc-syspro/contracts/trpc` para a fonte da API; um alias opaco remove os procedimentos aninhados e quebra o typecheck | Publicar contratos endpoint-a-endpoint ou gerar tipos em `packages/contracts`, migrar consumidores por feature e so entao remover o alias | alta |
| REL-P1-002 | P1 concluido | suite esperava nenhuma consulta para `in_reply_to_external_id`, mas a persistencia idempotente consulta o vinculo outbound | Caracterizado o reply direto e a consulta de deduplicacao do `MessageLink`, sem mudar a entrega | baixa |
| REL-P1-003 | P1 | build Nest captura hook Console Ninja externo | Reproduzir em shell/CI limpo; impedir instrumentacao externa no build sem adicionar dependencias opcionais | baixa |
| SEC-P1-004 | P1 | `npm audit`: Better Auth critica e Nodemailer alta | Atualizar com changelog e testes de login/OAuth; nao usar `audit fix --force` | media |
| ARC-P2-001 | P2 | 517 clones; concentracao em `automation-whatsapp`, `companies`, agent e formularios | Triar semantica, extrair apenas regras que evoluem juntas; caracterizacao antes | media |
| ARC-P2-002 | P2 | 12 ciclos confirmados entre settings, tickets, tarefas e integracoes | Substituir imports de modulo amplo por bridges/ports de caso de uso; testes de integracao por fronteira | alta |
| GOV-P2-002 | P2 | `arch:guard`, `utf8:guard` e `docs:audit` nao existem, apesar da convencao | Usar `quality:*` adicionados e decidir se os aliases legados serao criados em PR separado | baixa |
| QLT-P2-003 | P2 | Knip lista 113 tipos e varios exports candidatos | Revisar por entry point, lazy load, testes e geracao antes de cada remocao isolada | media |
| MOD-P2-004 | P2 | services de 40-85 KB misturam leitura, escrita, autorizacao e integracao | Fatiar por casos de uso/queries, com testes focados | alta |

Cada item preserva APIs publicas, exige gates aplicaveis e atualizacao documental.
