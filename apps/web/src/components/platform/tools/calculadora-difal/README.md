# Calculadora de DIFAL e Antecipa??o de ICMS

Este m?dulo implementa a l?gica de c?lculo do Diferencial de Al?quota (DIFAL) e da Antecipa??o Parcial de ICMS para opera??es interestaduais.

A ferramenta suporta a metodologia de **"C?lculo por Dentro" (Base Dupla)**, onde o imposto de destino integra a sua pr?pria base de c?lculo.

## ?? Estrutura de Arquivos

A arquitetura segue o padr?o **Colocation Flat**:

- **`index.tsx`**: Ponto de entrada visual. Orquestra os passos do formul?rio e resultados.
- **`useDifalCalculator.ts`**: Hook de gerenciamento de estado (Inputs, Sele??o de UF, etc).
- **`calculations.ts`**: L?gica matem?tica pura e regras de composi??o da base (Test?vel).
- **`constants.ts`**: Tabela de al?quotas internas padr?o por estado (UF).
- **`types.ts`**: Defini??es de tipagem TypeScript.
- **`components/`**: Sub-componentes visuais (`Step1`, `Step2`, `Results`, `Explanation`).

## ?? Regras de Neg?cio (Fiscal)

A calculadora atende dois cen?rios principais, cuja diferen?a fundamental est? na **composi??o da Base de C?lculo inicial**:

### 1. Revenda / Industrializa??o (Antecipa??o Parcial)
- **P?blico:** Empresas do Simples Nacional comprando de fora do estado para revender.
- **Regra do IPI:** O valor do IPI **N?O** entra na base de c?lculo do ICMS, pois ele n?o ? considerado um custo definitivo nesta etapa (ser? recuperado ou tributado na sa?da).
- **Base Inicial:** `Produtos + Frete + Outras Despesas`.

### 2. Uso / Consumo / Ativo Imobilizado (DIFAL)
- **P?blico:** Qualquer empresa comprando materiais para uso pr?prio.
- **Regra do IPI:** O valor do IPI **ENTRA** na base de c?lculo, pois comp?e o custo total de aquisi??o.
- **Base Inicial:** `Produtos + Frete + Outras Despesas + IPI`.

## ?? Metodologia de C?lculo

O sistema utiliza o c?lculo **"Por Dentro"** (Gross-up), conforme exigido pela maioria dos estados para equaliza??o da carga tribut?ria.

### F?rmula Matem?tica

1.  **Defini??o da Base Origem:** Soma-se os valores (com ou sem IPI, ver regras acima) e aplica-se a redu??o de base (se houver).
    
2.  **C?lculo do Cr?dito (Origem):**
    `Cr?dito = BaseOrigem * Al?quotaInterestadual`

3.  **C?lculo da Base de Destino (Gross-up):**
    A base ? reajustada para incluir o imposto de destino dentro dela mesma.
    `BaseDestino = (BaseOrigem - Cr?dito) / (1 - Al?quotaInternaDestino)`

4.  **C?lculo do D?bito (Destino):**
    `D?bito = BaseDestino * Al?quotaInternaDestino`

5.  **Valor Final a Pagar:**
    `DIFAL = D?bito - Cr?dito`

## ?? Dados Est?ticos (`constants.ts`)

As al?quotas internas de destino s?o carregadas de um objeto constante baseado na tabela padr?o de ICMS 2024/2025.

> **Nota:** As al?quotas podem variar dependendo do produto (ex: sup?rfluos vs cesta b?sica). A ferramenta utiliza a al?quota modal (padr?o) do estado, mas permite que o usu?rio edite o campo manualmente.

## hammer: Como Reutilizar

Para realizar c?lculos em lote (backend ou scripts), utilize as fun??es puras de `calculations.ts`:

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
  12, // Al?quota Interestadual (4, 7 ou 12)
  18, // Al?quota Destino
  0   // Redu??o de Base (%)
);

console.log(resultado.valorAPagar);