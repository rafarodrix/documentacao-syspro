import { BarChart2, ShieldAlert } from 'lucide-react';
import { PricingResult } from '../types';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface PricingResultsProps {
    resultados: PricingResult | null;
}

export function PricingResults({ resultados }: PricingResultsProps) {
    if (!resultados) {
        return (
            <div className="bg-card border-2 border-dashed rounded-lg p-8 text-center animate-fade-in">
                <div className="flex justify-center mb-3">
                    <div className="p-3 bg-muted rounded-full">
                        <BarChart2 className="text-muted-foreground" size={32} />
                    </div>
                </div>
                <h3 className="text-md font-semibold">Aguardando dados</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    Preencha os campos acima para ver a análise completa da sua precificação.
                </p>
            </div>
        );
    }

    if (resultados.impossivel) {
        return (
            <div className="text-center text-destructive p-6 bg-destructive/10 border border-destructive/20 rounded-lg animate-in zoom-in-95">
                <h3 className="font-bold text-lg flex items-center justify-center gap-2">
                    <ShieldAlert /> Precificação Inválida
                </h3>
                <p className="text-sm mt-2 max-w-md mx-auto">
                    A soma dos impostos ({formatPercent(resultados.pImpostos)}) e do custo fixo percentual ({formatPercent(resultados.pCustoFixo)}) ultrapassa ou iguala 100%.
                    <br /><br />
                    É matematicamente impossível obter lucro neste cenário pois os custos variáveis consomem todo o preço de venda.
                </p>
            </div>
        );
    }

    const isLoss = resultados.lucroLiquido < 0;

    return (
        <div className="bg-card border rounded-lg p-6 animate-in slide-in-from-bottom-2 duration-500 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Análise Financeira (DRE)</h3>

            {/* Tabela DRE */}
            <div className="space-y-3 text-sm">

                {/* Receita */}
                <div className="flex justify-between items-center p-3 bg-secondary/30 rounded-md">
                    <span className="font-medium text-foreground">(+) Preço de Venda</span>
                    <span className="font-bold text-base">{formatCurrency(resultados.venda)}</span>
                </div>

                {/* Deduções */}
                <div className="pl-2 space-y-2 border-l-2 border-border ml-2">
                    <div className="flex justify-between items-center text-muted-foreground">
                        <span>(-) Impostos ({formatPercent(resultados.pImpostos)})</span>
                        <span className="text-red-500">{formatCurrency(resultados.vImpostos)}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border/50 font-medium">
                        <span>(=) Receita Líquida</span>
                        <span>{formatCurrency(resultados.receitaLiquida)}</span>
                    </div>

                    <div className="flex justify-between items-center text-muted-foreground pt-1">
                        <span>(-) Custo do Produto (CMV)</span>
                        <span className="text-orange-500">{formatCurrency(resultados.custo)}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border/50 font-medium">
                        <span>(=) Lucro Bruto</span>
                        <span>{formatCurrency(resultados.lucroBruto)}</span>
                    </div>

                    <div className="flex justify-between items-center text-muted-foreground pt-1">
                        <span>(-) Despesas Fixas (Rateio {formatPercent(resultados.pCustoFixo)})</span>
                        <span className="text-yellow-600">{formatCurrency(resultados.vCustoFixo)}</span>
                    </div>
                </div>

                {/* Resultado Final */}
                <div className={`flex justify-between items-center p-4 mt-2 rounded-lg border-2 ${isLoss ? 'bg-destructive/5 border-destructive/20 text-destructive' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
                    }`}>
                    <span className="font-bold text-lg">(=) LUCRO LÍQUIDO</span>
                    <span className="font-bold text-xl">{formatCurrency(resultados.lucroLiquido)}</span>
                </div>
            </div>

            {/* KPIs Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                <KpiCard
                    label="Margem Líquida"
                    value={formatPercent(resultados.margemLiquidaPercent)}
                    color={isLoss ? 'text-destructive' : 'text-primary'}
                />
                <KpiCard
                    label="Markup"
                    value={formatPercent(resultados.markup)}
                />
                <KpiCard
                    label="Margem Contrib."
                    value={formatCurrency(resultados.margemDeContribuicao)}
                />
                <KpiCard
                    label="Ponto de Equilíbrio"
                    value={formatCurrency(resultados.pontoDeEquilibrio)}
                    color="text-amber-600"
                    tooltip="Preço mínimo para não ter prejuízo"
                />
            </div>
        </div>
    );
}

// Helper para os Cards de KPI
const KpiCard = ({ label, value, color = "text-foreground", tooltip }: any) => (
    <div className="text-center p-3 bg-secondary/50 rounded-lg flex flex-col justify-center h-full" title={tooltip}>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
);