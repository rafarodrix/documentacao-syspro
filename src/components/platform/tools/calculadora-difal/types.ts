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

    // Dados Comuns
    baseOriginal: number;    // A base cheia (com ou sem IPI dependendo da finalidade)
    baseReduzida: number;    // A base após aplicar % de redução

    // Memória de Cálculo
    valorDebito: number;     // Base * Aliq Interna
    valorCredito: number;    // Base * Aliq Inter

    // Resultado
    diferencialPct: number;  // Diferença percentual (ex: 6%)
    valorAPagar: number;     // O valor final do imposto
}