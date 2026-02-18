import { round } from "@/lib/formatters";
import { ModoCalculo, PricingResult } from '@/components/platform/tools/calculadora-precificacao/types';

interface CalculateParams {
    custo: number;
    pImpostos: number;
    pCustoFixo: number;
    precoVendaInput: number;
    lucroDesejadoInput: number;
    margemDesejadaInput: number;
    modo: ModoCalculo;
}

export function calculatePricing({
    custo, pImpostos, pCustoFixo, precoVendaInput, lucroDesejadoInput, margemDesejadaInput, modo
}: CalculateParams): PricingResult | null {

    let venda = 0;
    let lucroLiquido = 0;
    let margemLiquidaPercent = 0;

    const percentualCustosVar = pImpostos + pCustoFixo;

    // 1. Determinar o Preço de Venda baseado no Modo
    switch (modo) {
        case 'venda':
            venda = precoVendaInput;
            if (venda === 0 || custo === 0) return null;
            // Lucro = Venda - Custo - Impostos - Custo Fixo
            lucroLiquido = round(venda - custo - (venda * (pImpostos / 100)) - (venda * (pCustoFixo / 100)));
            margemLiquidaPercent = venda > 0 ? (lucroLiquido / venda) * 100 : 0;
            break;

        case 'lucro_valor':
            lucroLiquido = lucroDesejadoInput;
            if (custo === 0 || percentualCustosVar >= 100) return null;
            // Fórmula para chegar no preço tendo o lucro fixo alvo
            venda = round((lucroLiquido + custo) / (1 - (percentualCustosVar / 100)));
            margemLiquidaPercent = venda > 0 ? (lucroLiquido / venda) * 100 : 0;
            break;

        case 'lucro_percentual':
            margemLiquidaPercent = margemDesejadaInput;
            const totalPercent = percentualCustosVar + margemLiquidaPercent;
            if (custo === 0 || totalPercent >= 100) return null;
            // Markup Divisor
            venda = round(custo / (1 - (totalPercent / 100)));
            lucroLiquido = round(venda * (margemLiquidaPercent / 100));
            break;
    }

    if (venda < 0) return null;

    // 2. Calcular Derivados
    const vImpostos = round(venda * (pImpostos / 100));
    const receitaLiquida = round(venda - vImpostos);
    const vCustoFixo = round(venda * (pCustoFixo / 100));
    const margemDeContribuicao = round(venda - custo - vImpostos);
    const lucroBruto = round(receitaLiquida - custo);
    const margemBrutaPercent = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
    const markup = custo > 0 ? (venda / custo - 1) * 100 : 0;

    // Ponto de Equilíbrio: Quanto preciso vender para pagar Custo + Impostos + Custo Fixo (Lucro Zero)
    const pontoDeEquilibrio = custo > 0 ? round(custo / (1 - (percentualCustosVar / 100))) : 0;

    return {
        venda, custo, pImpostos, vImpostos, receitaLiquida,
        lucroBruto, margemBrutaPercent, vCustoFixo, pCustoFixo,
        lucroLiquido, margemLiquidaPercent, markup,
        margemDeContribuicao, pontoDeEquilibrio,
        impossivel: percentualCustosVar >= 100
    };
}