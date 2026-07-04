---
name: syspro-definition-of-done
description: Checklist obrigatório de qualidade de código, validação de regras de negócio e documentação antes de fechar uma tarefa.
---

# syspro-definition-of-done

Use esta skill antes de declarar a tarefa pronta.

## Checklist obrigatorio

- A responsabilidade nova ficou na camada certa.
- Duplicacao obvia ao redor do trecho alterado foi removida ou justificada.
- Contratos, mappers e nomes exibidos ao usuario continuam coerentes.
- Permissoes, escopo por empresa e side effects foram revisados.
- Documentacao foi atualizada quando a mudanca altera arquitetura, fluxo ou operacao.
- Alguma validacao foi executada, ou a impossibilidade foi registrada explicitamente.

## Evidencias esperadas

- Arquivos alterados comunicam uma unica direcao tecnica.
- Nao sobra helper morto, caminho paralelo ou branch legado sem dono.
- O resumo final informa o que mudou, o que foi validado e o que ficou pendente.

## Regra

- Nunca marque como concluido apenas porque o codigo compila visualmente.
