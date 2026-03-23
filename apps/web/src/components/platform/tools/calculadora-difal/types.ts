export type Finalidade = 'revenda' | 'consumo';

export interface CalculatorState {
    produto: string;
    frete: string;
    outras: string;
    ipi: string;
    aliqInterestadual: string;
    ufDestino: string;
    aliqDestino: string;
    reducaoBC: string;
}

export interface ResultadoCalculo {
    error: string | null;

    // Base Inicial
    baseOriginal: number;    // Base somada (com ou sem IPI)
    baseReduzida: number;    // Base após redução

    // Cálculo "Por Dentro"
    vCredito: number;        // ICMS Origem (que será abatido)
    bcDestino: number;       // Nova base recalculada para o destino (Gross-up)
    vDebito: number;         // ICMS Destino total

    // Resultado Final
    valorAPagar: number;     // Débito - Crédito
}