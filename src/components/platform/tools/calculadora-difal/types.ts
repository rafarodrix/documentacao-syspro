export type Finalidade = 'revenda' | 'consumo';

export interface ResultadoCalculo {
    type: 'antecipacao' | 'difal';
    error: string | null;
    // Antecipação
    bcOrigem?: number;
    vCredito?: number;
    bcDestino?: number;
    vDebito?: number;
    vAntecipacao?: number;
    // Difal
    baseDeCalculo?: number;
    bcReduzida?: number;
    diferencial?: number;
    valorAPagar?: number;
}

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