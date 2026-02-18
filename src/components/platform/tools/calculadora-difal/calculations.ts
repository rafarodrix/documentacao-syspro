import { Finalidade, ResultadoCalculo } from './types';

const round = (value: number): number => Math.round(value * 100) / 100;

export function calcularBaseTotal(
    vp: number, vf: number, vod: number, vIpi: number, finalidade: Finalidade
) {
    const bcComum = vp + vf + vod;

    // A única diferença entre os cenários continua sendo esta:
    // Consumo = Soma IPI. Revenda = Não soma IPI.
    const valor = finalidade === 'consumo' ? bcComum + vIpi : bcComum;

    return {
        valor,
        formula: finalidade === 'consumo'
            ? "Produtos + Frete + Desp. + IPI"
            : "Produtos + Frete + Desp."
    };
}

/**
 * Fórmula "Por Dentro" (Gross-up)
 * Usada anteriormente apenas para Revenda/Antecipação, agora aplicada geral.
 */
export function calcularDifalPorDentro(
    bc: number, alqInter: number, alqDest: number, pRed: number
): ResultadoCalculo {
    // 1. Aplica Redução na Base de Origem
    const baseReduzida = round(bc * (1 - pRed / 100));

    // 2. Calcula o Crédito (ICMS da Origem)
    // Valor que veio destacado na nota
    const vCredito = round(baseReduzida * (alqInter / 100));

    // 3. Encontra a Base de Destino (Cálculo por Dentro)
    // Remove-se o imposto de origem e divide-se pelo fator de destino para embutir o novo imposto
    const divisor = 1 - (alqDest / 100);

    if (divisor <= 0) {
        return {
            error: 'Alíquota de destino inválida (100% ou mais).',
            baseOriginal: bc, baseReduzida: 0, vCredito: 0, bcDestino: 0, vDebito: 0, valorAPagar: 0
        };
    }

    // Base de Destino = (Base Origem Líquida) / (1 - Alíquota Destino)
    // Nota: Alguns estados deduzem o vCredito da base antes de dividir. 
    // Seguindo a lógica do seu código original de revenda: (Base - Credito) / Divisor
    const bcDestino = round((baseReduzida - vCredito) / divisor);

    // 4. Calcula o Débito (ICMS do Destino)
    const vDebito = round(bcDestino * (alqDest / 100));

    // 5. Valor Final (Débito - Crédito)
    const valorAPagar = round(vDebito - vCredito);

    return {
        error: null,
        baseOriginal: bc,
        baseReduzida,
        vCredito,
        bcDestino,
        vDebito,
        valorAPagar
    };
}