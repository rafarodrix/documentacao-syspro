# Calculadora de DIFAL e Antecipacao de ICMS

Este modulo implementa a logica de calculo do Diferencial de Aliquota (DIFAL) e da Antecipacao Parcial de ICMS para operacoes interestaduais.

A ferramenta suporta a metodologia de **"Calculo por Dentro" (Base Dupla)**, onde o imposto de destino integra a sua pr?pria base de calculo.

## Estrutura de Arquivos

A arquitetura segue o padrao **Colocation Flat**:

- **`index.tsx`**: Ponto de entrada visual. Orquestra os passos do formul?rio e resultados.
- **`useDifalCalculator.ts`**: Hook de gerenciamento de estado (Inputs, Selecao de UF, etc).
- **`calculations.ts`**: Logica matem?tica pura e regras de composicao da base (Testavel).
- **`constants.ts`**: Tabela de aliquotas internas padrao por estado (UF).
- **`types.ts`**: Definicoes de tipagem TypeScript.
- **`components/`**: Sub-componentes visuais (`Step1`, `Step2`, `Results`, `Explanation`).

## Regras de Negocio (Fiscal)

A calculadora atende dois cenarios principais, cuja diferenca fundamental esta na **composicao da Base de Calculo inicial**:

### 1. Revenda / Industrializacao (Antecipacao Parcial)
- **P?blico:** Empresas do Simples Nacional comprando de fora do estado para revender.
- **Regra do IPI:** O valor do IPI **NAO** entra na base de calculo do ICMS, pois ele nao ? considerado um custo definitivo nesta etapa (ser? recuperado ou tributado na sa?da).
- **Base Inicial:** `Produtos + Frete + Outras Despesas`.

### 2. Uso / Consumo / Ativo Imobilizado (DIFAL)
- **P?blico:** Qualquer empresa comprando materiais para uso proprio.
- **Regra do IPI:** O valor do IPI **ENTRA** na base de calculo, pois compoe o custo total de aquisicao.
- **Base Inicial:** `Produtos + Frete + Outras Despesas + IPI`.

## Metodologia de Calculo

O sistema utiliza o calculo **"Por Dentro"** (Gross-up), conforme exigido pela maioria dos estados para equalizacao da carga tributaria.

### F?rmula Matem?tica

1.  **Definicao da Base Origem:** Soma-se os valores (com ou sem IPI, ver regras acima) e aplica-se a reducao de base (se houver).
    
2.  **Calculo do Cr?dito (Origem):**
    `Cr?dito = BaseOrigem * AliquotaInterestadual`

3.  **Calculo da Base de Destino (Gross-up):**
    A base ? reajustada para incluir o imposto de destino dentro dela mesma.
    `BaseDestino = (BaseOrigem - Cr?dito) / (1 - AliquotaInternaDestino)`

4.  **Calculo do D?bito (Destino):**
    `D?bito = BaseDestino * AliquotaInternaDestino`

5.  **Valor Final a Pagar:**
    `DIFAL = D?bito - Cr?dito`

## Dados Estaticos (`constants.ts`)

As aliquotas internas de destino s?o carregadas de um objeto constante baseado na tabela padrao de ICMS 2024/2025.

> **Nota:** As aliquotas podem variar dependendo do produto (ex: sup?rfluos vs cesta b?sica). A ferramenta utiliza a aliquota modal (padrao) do estado, mas permite que o usuario edite o campo manualmente.

## hammer: Como Reutilizar

Para realizar calculos em lote (backend ou scripts), utilize as funcoes puras de `calculations.ts`:

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
  12, // Aliquota Interestadual (4, 7 ou 12)
  18, // Aliquota Destino
  0   // Reducao de Base (%)
);

console.log(resultado.valorAPagar);