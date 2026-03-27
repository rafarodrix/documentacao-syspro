# Calculadora de DIFAL e Antecipacao de ICMS

Ferramenta para calculo do Diferencial de Aliquota (DIFAL) e da antecipacao parcial de ICMS em operacoes interestaduais.

## Objetivo

Oferecer uma calculadora educativa e operacional para comparar base de origem, credito, base de destino e valor final a recolher.

## Estrutura do modulo

- `index.tsx`: entrada visual da ferramenta
- `useDifalCalculator.ts`: estado do formulario e interacoes
- `calculations.ts`: regras matematicas puras e reutilizaveis
- `constants.ts`: aliquotas internas padrao por UF
- `types.ts`: contratos do modulo
- `components/`: passos e blocos de resultado

## Regras fiscais cobertas

### Revenda ou industrializacao

- foco em antecipacao parcial
- o IPI nao entra na base inicial
- base inicial: `produtos + frete + outras despesas`

### Uso, consumo ou ativo

- foco em DIFAL
- o IPI entra na base inicial
- base inicial: `produtos + frete + outras despesas + IPI`

## Metodologia de calculo

O modulo usa calculo por dentro, com gross-up da base de destino.

Sequencia resumida:

1. definir base de origem
2. calcular credito de origem
3. recalcular base de destino com a aliquota interna
4. calcular debito de destino
5. obter valor final a pagar

## Reuso

Para processamento em lote, importar as funcoes puras de `calculations.ts`.

```typescript
import { calcularBaseTotal, calcularDifalPorDentro } from "@/components/platform/tools/calculadora-difal/calculations";

const { valor: baseInicial } = calcularBaseTotal(1000, 100, 0, 50, "consumo");
const resultado = calcularDifalPorDentro(baseInicial, 12, 18, 0);
```

## Observacoes

- as aliquotas internas de `constants.ts` sao referenciais
- a ferramenta permite ajuste manual quando houver regra especifica por produto ou UF
