# Calculadora de Precificacao e Markup

Ferramenta para calculo de preco de venda, margem, markup e leitura basica de custo fixo.

## Objetivo

Ajudar na simulacao de precificacao com foco em cenarios operacionais simples e em explicacao didatica dos indicadores formados.

## Estrutura do modulo

- `index.tsx`: entrada visual da calculadora
- `use-pricing-calculator.ts`: estado e inputs da interface
- `calculations.ts`: funcoes matematicas puras
- `constants.ts`: benchmarks e textos auxiliares
- `types.ts`: contratos do modulo
- `components/`: passos e cards de resultado

## Modos de calculo

### A partir do preco de venda

O usuario informa o preco final e o sistema calcula lucro e margem resultantes.

### A partir do lucro em valor

O sistema calcula o preco necessario para atingir um lucro alvo em reais.

### A partir da margem percentual

O sistema calcula o preco necessario para atingir uma margem liquida desejada.

## Indicadores exibidos

- markup
- margem de contribuicao
- lucro estimado
- ponto de equilibrio minimo

## Benchmarks

Os feedbacks de custo fixo usam faixas referenciais por segmento para leitura educativa. Eles nao substituem analise financeira formal.

## Reuso

Para processamento sem UI, importar a funcao pura principal de `calculations.ts`.

```typescript
import { calculatePricing } from "@/components/platform/tools/calculadora-precificacao/calculations";

const resultado = calculatePricing({
  custo: 100,
  pImpostos: 18,
  pCustoFixo: 25,
  precoVendaInput: 200,
  modo: "venda",
});
```

