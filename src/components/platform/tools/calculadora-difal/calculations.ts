import { Finalidade, ResultadoCalculo } from './types';

// Helper local de arredondamento
const round = (value: number): number => Math.round(value * 100) / 100;

export function calcularBaseTotal(
    vp: number, vf: number, vod: number, vIpi: number, finalidade: Finalidade
) {
    const bcComum = vp + vf + vod;
    // Regra: IPI entra na base se for Consumo
    const valor = finalidade === 'consumo' ? bcComum + vIpi : bcComum;

    return {
        valor,
        formula: finalidade === 'consumo'
            ? "Produtos + Frete + Desp. + IPI"
            : "Produtos + Frete + Desp."
    };
}

export function calcularAntecipacao(
    bc: number, alqInter: number, alqDest: number, pRed: number
): ResultadoCalculo {
    const bcOrigem = round(bc * (1 - pRed / 100));
    const vCredito = round(bcOrigem * (alqInter / 100));
    const divisor = 1 - alqDest / 100;

    if (divisor <= 0) {
        return { type: 'antecipacao', error: 'Alíquota de destino muito alta (Divisor zero/negativo).' };
    }

    const bcDestino = round((bcOrigem - vCredito) / divisor);
    const vDebito = round(bcDestino * (alqDest / 100));
    const vAntecipacao = round(vDebito - vCredito);

    return { type: 'antecipacao', bcOrigem, vCredito, bcDestino, vDebito, vAntecipacao, error: null };
}

export function calcularDifalConsumo(
    bc: number, alqInter: number, alqDest: number, pRed: number
): ResultadoCalculo {
    const bcReduzida = round(bc * (1 - pRed / 100));
    const diferencial = (alqDest - alqInter) / 100;
    const valorAPagar = round(bcReduzida * diferencial);

    return {
        type: 'difal',
        baseDeCalculo: bc,
        bcReduzida,
        diferencial,
        valorAPagar,
        error: null
    };
}