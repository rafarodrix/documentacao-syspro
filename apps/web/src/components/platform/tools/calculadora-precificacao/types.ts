export type Segmento = 'varejo' | 'industria' | 'servicos';
export type ModoCalculo = 'venda' | 'lucro_valor' | 'lucro_percentual';

export interface PricingState {
    faturamentoMedio: string;
    despesasFixasMensais: string;
    custoAquisicao: string;
    precoVenda: string;
    impostosVenda: string;
    lucroLiquidoDesejado: string;
    margemLiquidaDesejada: string;
}

export interface PricingResult {
    venda: number;
    custo: number;
    pImpostos: number;
    vImpostos: number;
    receitaLiquida: number;
    lucroBruto: number;
    margemBrutaPercent: number;
    vCustoFixo: number;
    pCustoFixo: number;
    lucroLiquido: number;
    margemLiquidaPercent: number;
    markup: number;
    margemDeContribuicao: number;
    pontoDeEquilibrio: number;
    impossivel: boolean;
}