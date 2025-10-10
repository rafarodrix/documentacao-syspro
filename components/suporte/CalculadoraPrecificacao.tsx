'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import { Tag, X, HelpCircle, ChevronDown, Percent, TrendingDown, Target, DollarSign } from 'lucide-react';

// --- Funções de Formatação ---
const formatCurrency = (value: number) =>
    isNaN(value) ? 'R$ 0,00' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatPercent = (value: number) =>
    isNaN(value) ? '0,00%' : `${value.toFixed(2)}%`;

// --- Componente Principal ---
export function CalculadoraPrecificacao() {
    // --- Estados para os Inputs ---
    const [custoAquisicao, setCustoAquisicao] = useState('');
    const [precoVenda, setPrecoVenda] = useState('');
    const [impostosVenda, setImpostosVenda] = useState(''); // % sobre a venda
    const [custoFixo, setCustoFixo] = useState(''); // % rateado

    const resultados = useMemo(() => {
        const custo = parseFloat(custoAquisicao) || 0;
        const venda = parseFloat(precoVenda) || 0;
        const pImpostos = parseFloat(impostosVenda) || 0;
        const pCustoFixo = parseFloat(custoFixo) || 0;

        if (venda === 0 || custo === 0) return null;

        // Cálculos
        const vImpostos = venda * (pImpostos / 100);
        const receitaLiquida = venda - vImpostos;
        const vCustoFixo = venda * (pCustoFixo / 100);

        const margemDeContribuicao = venda - custo - vImpostos;
        const lucroBruto = receitaLiquida - custo;
        const lucroLiquido = lucroBruto - vCustoFixo;

        // Indicadores
        const margemBrutaPercent = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
        const margemLiquidaPercent = venda > 0 ? (lucroLiquido / venda) * 100 : 0;
        const markup = (venda / custo - 1) * 100;

        return {
            venda, custo, pImpostos, vImpostos, receitaLiquida,
            lucroBruto, margemBrutaPercent, vCustoFixo,
            lucroLiquido, margemLiquidaPercent, markup,
            margemDeContribuicao
        };
    }, [custoAquisicao, precoVenda, impostosVenda, custoFixo]);

    const handleClear = () => {
        setCustoAquisicao('');
        setPrecoVenda('');
        setImpostosVenda('');
        setCustoFixo('');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* --- Card de Inputs --- */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Tag size={20} /> Parâmetros de Precificação</h3>
                    <button onClick={handleClear} className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                        <X size={16} /> Limpar
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                        <label className="font-medium text-muted-foreground">Custo do Produto</label>
                        <input type="number" placeholder="Ex: 5.50" value={custoAquisicao} onChange={e => setCustoAquisicao(e.target.value)}
                            className="mt-1 w-full p-2 bg-background border rounded-md" />
                    </div>
                    <div>
                        <label className="font-medium text-muted-foreground">Preço de Venda</label>
                        <input type="number" placeholder="Ex: 10.00" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)}
                            className="mt-1 w-full p-2 bg-background border rounded-md" />
                    </div>
                    <div>
                        <label className="font-medium text-muted-foreground">Impostos sobre Venda (%)</label>
                        <input type="number" placeholder="Ex: 18" value={impostosVenda} onChange={e => setImpostosVenda(e.target.value)}
                            className="mt-1 w-full p-2 bg-background border rounded-md" />
                    </div>
                    <div>
                        <label className="font-medium text-muted-foreground">Custo Fixo Rateado (%)</label>
                        <input type="number" placeholder="Ex: 15" value={custoFixo} onChange={e => setCustoFixo(e.target.value)}
                            className="mt-1 w-full p-2 bg-background border rounded-md" />
                    </div>
                </div>
            </div>

            {/* --- Card de Resultados --- */}
            {resultados && (
                <div className="bg-card border rounded-lg p-6 animate-fade-in shadow-sm">
                    <h3 className="text-lg font-bold mb-4">Análise da Precificação</h3>
                    <div className="space-y-4 text-sm">

                        <div className="space-y-2 border p-4 rounded-lg">
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">(+) Preço de Venda (Receita Bruta)</span> <span className="font-semibold">{formatCurrency(resultados.venda)}</span></div>
                            <div className="flex justify-between items-center"><span className="text-red-500">(-) Impostos sobre a Venda ({formatPercent(resultados.pImpostos)})</span> <span className="font-semibold text-red-500">{formatCurrency(resultados.vImpostos)}</span></div>
                            <div className="flex justify-between font-bold border-t pt-2"><span>(=) Receita Líquida</span> <span>{formatCurrency(resultados.receitaLiquida)}</span></div>
                        </div>
                        <div className="space-y-2 border p-4 rounded-lg">
                            <div className="flex justify-between items-center"><span className="text-orange-500">(-) Custo do Produto (CMV)</span> <span className="font-semibold text-orange-500">{formatCurrency(resultados.custo)}</span></div>
                            <div className="flex justify-between font-bold border-t pt-2"><span>(=) Lucro Bruto</span> <span>{formatCurrency(resultados.lucroBruto)}</span></div>
                        </div>
                        <div className="space-y-2 border p-4 rounded-lg">
                            <div className="flex justify-between items-center"><span className="text-yellow-500">(-) Despesas Operacionais (Rateio)</span> <span className="font-semibold text-yellow-500">{formatCurrency(resultados.vCustoFixo)}</span></div>
                            <div className="flex justify-between font-bold text-xl text-primary border-t-2 pt-3 mt-2"><span>(=) LUCRO LÍQUIDO</span> <span>{formatCurrency(resultados.lucroLiquido)}</span></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t mt-4">
                            <div className="text-center p-3 bg-secondary rounded-md">
                                <p className="text-xs text-muted-foreground">Markup sobre Custo</p>
                                <p className="text-lg font-bold">{formatPercent(resultados.markup)}</p>
                            </div>
                            <div className="text-center p-3 bg-secondary rounded-md">
                                <p className="text-xs text-muted-foreground">Margem de Contribuição</p>
                                <p className="text-lg font-bold">{formatCurrency(resultados.margemDeContribuicao)}</p>
                            </div>
                            <div className="text-center p-3 bg-secondary rounded-md">
                                <p className="text-xs text-muted-foreground">Margem Bruta (%)</p>
                                <p className="text-lg font-bold">{formatPercent(resultados.margemBrutaPercent)}</p>
                            </div>
                            <div className="text-center p-3 bg-secondary rounded-md">
                                <p className="text-xs text-muted-foreground">Margem Líquida (%)</p>
                                <p className="text-lg font-bold text-primary">{formatPercent(resultados.margemLiquidaPercent)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <details className="mt-8 text-sm group bg-card border rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-primary list-none flex items-center gap-2">
                    <HelpCircle size={16} /> Entendendo os Indicadores de Lucratividade
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 ml-auto" />
                </summary>

                <div className="mt-4 border-t pt-4 space-y-4 animate-fade-in text-muted-foreground">

                    {/* Card 1: Markup */}
                    <div className="border rounded-lg p-3 bg-secondary/30">
                        <h4 className="font-semibold text-foreground flex items-center gap-2"><Percent size={16} /> Markup sobre o Custo</h4>
                        <p className="mt-1">
                            É o índice percentual que você aplica sobre o **custo** do produto para formar o preço de venda. Ele responde à pergunta: "Quanto meu preço de venda é maior que meu custo?".
                        </p>
                        <p className="font-mono text-xs mt-2 bg-background p-2 rounded">
                            Fórmula: ((Preço de Venda / Custo do Produto) - 1) * 100
                        </p>
                    </div>

                    {/* Card 2: Margem de Contribuição */}
                    <div className="border rounded-lg p-3 bg-secondary/30">
                        <h4 className="font-semibold text-foreground flex items-center gap-2"><DollarSign size={16} /> Margem de Contribuição</h4>
                        <p className="mt-1">
                            (Visão **Gerencial**) É o valor que sobra da venda após pagar todos os **custos e impostos variáveis**. Mostra o quanto cada venda "contribui" para pagar as despesas fixas (aluguel, salários) e gerar lucro.
                        </p>
                        <p className="font-mono text-xs mt-2 bg-background p-2 rounded">
                            Fórmula: Preço de Venda - (Custo do Produto + Impostos sobre Venda)
                        </p>
                    </div>

                    {/* Card 3: Lucro Bruto */}
                    <div className="border rounded-lg p-3 bg-secondary/30">
                        <h4 className="font-semibold text-foreground flex items-center gap-2"><TrendingDown size={16} /> Lucro Bruto</h4>
                        <p className="mt-1">
                            (Visão **Contábil**) É o resultado da **Receita Líquida** (venda já sem impostos) menos o custo do produto. É uma etapa formal do Demonstrativo de Resultados (DRE).
                        </p>
                        <p className="font-mono text-xs mt-2 bg-background p-2 rounded">
                            Fórmula: (Preço de Venda - Impostos sobre Venda) - Custo do Produto
                        </p>
                    </div>

                    {/* Card 4: Lucro Líquido */}
                    <div className="border rounded-lg p-3 bg-secondary/30">
                        <h4 className="font-semibold text-foreground flex items-center gap-2"><Target size={16} /> Lucro Líquido</h4>
                        <p className="mt-1">
                            O indicador final. É o que realmente sobra no bolso após pagar **todas** as contas (custos variáveis, impostos, e despesas fixas rateadas).
                        </p>
                        <p className="font-mono text-xs mt-2 bg-background p-2 rounded">
                            Fórmula: Lucro Bruto - Despesas Fixas
                        </p>
                    </div>
                </div>
            </details>
        </div>
    );
}