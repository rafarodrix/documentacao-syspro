# Calculadora de Precificação e Markup

Este módulo implementa uma ferramenta para cálculo de preço de venda, margem de lucro e análise de custos fixos baseada em benchmarks de mercado.

## ?? Estrutura de Arquivos

A arquitetura segue o padrão **Colocation Flat**:

- **`index.tsx`**: Ponto de entrada. Orquestra a UI e o Hook.
- **`usePricingCalculator.ts`**: Gerenciamento de estado (React) e inputs do usuário.
- **`calculations.ts`**: Lógica matemática pura (Testável e Reutilizável).
- **`constants.ts`**: Dados estáticos, textos de feedback e benchmarks de mercado.
- **`types.ts`**: Definições de tipagem TypeScript.
- **`components/`**: Sub-componentes visuais (Steps, Cards de Resultado).

## ?? Lógica de Negócio

### 1. Cálculo de Preço de Venda
O sistema suporta três modos de cálculo (definidos em `calculations.ts`):

1.  **A partir do Preço (Modo `venda`)**:
    O usuário define o preço final e o sistema calcula quanto sobra de lucro.
    `Lucro = Venda - Custo - Impostos - Despesas Fixas`

2.  **A partir do Lucro em R$ (Modo `lucro_valor`)**:
    Calcula o preço necessário para atingir um valor fixo de lucro (ex: quero ganhar R$ 50,00).
    `Venda = (Lucro Alvo + Custo) / (1 - %CustosVariáveis)`

3.  **A partir da Margem % (Modo `lucro_percentual`)**:
    Calcula o preço baseada em uma margem desejada (ex: quero 20% de margem líquida).
    `Venda = Custo / (1 - (%CustosVariáveis + %MargemDesejada))`

### 2. Indicadores Calculados
- **Markup**: Percentual adicionado sobre o custo para formar o preço.
- **Margem de Contribuição**: `Venda - Custo - Impostos`. É o que sobra para pagar custos fixos.
- **Ponto de Equilíbrio (PMZ)**: O preço mínimo onde o lucro é zero.

## ?? Benchmarks de Mercado (`constants.ts`)

Os feedbacks visuais (Saudável, Atenção, Perigoso) sobre o Custo Fixo são baseados nos seguintes limiares:

| Segmento | Saudável | Atenção | Perigoso |
| :--- | :--- | :--- | :--- |
| **Varejo** | < 25% | 25% - 40% | > 40% |
| **Indústria**| < 35% | 35% - 55% | > 55% |
| **Serviços** | < 30% | 30% - 50% | > 50% |

> *Nota: Estes valores são estimativas gerais de mercado e servem apenas como guia educativo.*

## ?? Como Reutilizar

Se precisar calcular preços em lote (ex: Backend ou script de importação), importe apenas a função pura:

```typescript
import { calculatePricing } from '@/components/tools/calculadora-precificacao/calculations';

const resultado = calculatePricing({
  custo: 100,
  pImpostos: 18,
  pCustoFixo: 25,
  precoVendaInput: 200,
  modo: 'venda',
  // ...outros params zerados
});
