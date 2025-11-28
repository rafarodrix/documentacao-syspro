import { Finalidade, ResultadoCalculo } from './types';

// Helper local
const round = (value: number): number => Math.round(value * 100) / 100;

export function calcularBaseTotal(
    vp: number, vf: number, vod: number, vIpi: number, finalidade: Finalidade
) {
    const bcComum = vp + vf + vod;

    // === A GRANDE DIFERENÇA ===
    // Consumo: IPI compõe a base.
    // Revenda: IPI não compõe a base.
    const valor = finalidade === 'consumo' ? bcComum + vIpi : bcComum;

    return {
        valor,
        formula: finalidade === 'consumo'
            ? "Produtos + Frete + Desp. + IPI"
            : "Produtos + Frete + Desp."
    };
}

export function calcularDifalUnificado(
    bc: number, alqInter: number, alqDest: number, pRed: number
): ResultadoCalculo {
    // 1. Aplica Redução de Base (se houver)
    const baseReduzida = round(bc * (1 - pRed / 100));

    // 2. Calcula Débito e Crédito (Opcional, mas bom para mostrar detalhes)
    const valorDebito = round(baseReduzida * (alqDest / 100));
    const valorCredito = round(baseReduzida * (alqInter / 100));

    // 3. Calcula o Diferencial
    const diferencialPct = alqDest - alqInter;

    // Fórmula: Base * (Destino - Origem)
    // ou (Base * Destino) - (Base * Origem) -> matematicamente igual, pequenas diffs de arredondamento
    const valorAPagar = round(valorDebito - valorCredito);

    return {
        error: null,
        baseOriginal: bc,
        baseReduzida,
        valorDebito,
        valorCredito,
        diferencialPct,
        valorAPagar
    };
}