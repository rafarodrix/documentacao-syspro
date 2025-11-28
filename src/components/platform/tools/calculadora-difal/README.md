# Calculadora de DIFAL e Antecipação de ICMS

Este módulo implementa a lógica de cálculo do Diferencial de Alíquota (DIFAL) e da Antecipação Parcial de ICMS para operações interestaduais.

A ferramenta suporta a metodologia de **"Cálculo por Dentro" (Base Dupla)**, onde o imposto de destino integra a sua própria base de cálculo.

## ?? Estrutura de Arquivos

A arquitetura segue o padrão **Colocation Flat**:

- **`index.tsx`**: Ponto de entrada visual. Orquestra os passos do formulário e resultados.
- **`useDifalCalculator.ts`**: Hook de gerenciamento de estado (Inputs, Seleção de UF, etc).
- **`calculations.ts`**: Lógica matemática pura e regras de composição da base (Testável).
- **`constants.ts`**: Tabela de alíquotas internas padrão por estado (UF).
- **`types.ts`**: Definições de tipagem TypeScript.
- **`components/`**: Sub-componentes visuais (`Step1`, `Step2`, `Results`, `Explanation`).

## ?? Regras de Negócio (Fiscal)

A calculadora atende dois cenários principais, cuja diferença fundamental está na **composição da Base de Cálculo inicial**:

### 1. Revenda / Industrialização (Antecipação Parcial)
- **Público:** Empresas do Simples Nacional comprando de fora do estado para revender.
- **Regra do IPI:** O valor do IPI **NÃO** entra na base de cálculo do ICMS, pois ele não é considerado um custo definitivo nesta etapa (será recuperado ou tributado na saída).
- **Base Inicial:** `Produtos + Frete + Outras Despesas`.

### 2. Uso / Consumo / Ativo Imobilizado (DIFAL)
- **Público:** Qualquer empresa comprando materiais para uso próprio.
- **Regra do IPI:** O valor do IPI **ENTRA** na base de cálculo, pois compõe o custo total de aquisição.
- **Base Inicial:** `Produtos + Frete + Outras Despesas + IPI`.

## ?? Metodologia de Cálculo

O sistema utiliza o cálculo **"Por Dentro"** (Gross-up), conforme exigido pela maioria dos estados para equalização da carga tributária.

### Fórmula Matemática

1.  **Definição da Base Origem:** Soma-se os valores (com ou sem IPI, ver regras acima) e aplica-se a redução de base (se houver).
    
2.  **Cálculo do Crédito (Origem):**
    `Crédito = BaseOrigem * AlíquotaInterestadual`

3.  **Cálculo da Base de Destino (Gross-up):**
    A base é reajustada para incluir o imposto de destino dentro dela mesma.
    `BaseDestino = (BaseOrigem - Crédito) / (1 - AlíquotaInternaDestino)`

4.  **Cálculo do Débito (Destino):**
    `Débito = BaseDestino * AlíquotaInternaDestino`

5.  **Valor Final a Pagar:**
    `DIFAL = Débito - Crédito`

## ?? Dados Estáticos (`constants.ts`)

As alíquotas internas de destino são carregadas de um objeto constante baseado na tabela padrão de ICMS 2024/2025.

> **Nota:** As alíquotas podem variar dependendo do produto (ex: supérfluos vs cesta básica). A ferramenta utiliza a alíquota modal (padrão) do estado, mas permite que o usuário edite o campo manualmente.

## hammer: Como Reutilizar

Para realizar cálculos em lote (backend ou scripts), utilize as funções puras de `calculations.ts`:

```typescript
import { calcularBaseTotal, calcularDifalPorDentro } from '@/components/tools/calculadora-difal/calculations';

// 1. Definir a Base (com ou sem IPI)
const { valor: baseInicial } = calcularBaseTotal(
  1000, // Valor Produtos
  100,  // Frete
  0,    // Despesas
  50,   // IPI
  'consumo' // ou 'revenda'
);

// 2. Calcular o Imposto
const resultado = calcularDifalPorDentro(
  baseInicial,
  12, // Alíquota Interestadual (4, 7 ou 12)
  18, // Alíquota Destino
  0   // Redução de Base (%)
);

console.log(resultado.valorAPagar);