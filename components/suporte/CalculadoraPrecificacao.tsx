'use client';

import { useState, useMemo } from 'react';
import { Tag, DollarSign, TrendingDown, Package, Landmark, Target, X, Percent, HelpCircle, ChevronDown } from 'lucide-react';

// --- Funções de Formatação ---
const formatCurrency = (value: number) => isNaN(value) ? 'R$ 0,00' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (value: number) => isNaN(value) ? '0,00%' : `${value.toFixed(2)}%`;

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

        // Análise
        const vImpostos = venda * (pImpostos / 100);
        const receitaLiquida = venda - vImpostos;
        const lucroBruto = receitaLiquida - custo;
        const vCustoFixo = venda * (pCustoFixo / 100);
        const lucroLiquido = lucroBruto - vCustoFixo;

        // Indicadores
        const margemBruta = (lucroBruto / venda) * 100;
        const margemLiquida = (lucroLiquido / venda) * 100;
        const markup = (venda / custo - 1) * 100;

        return {
            venda, custo, vImpostos, receitaLiquida,
            lucroBruto, margemBruta, vCustoFixo,
            lucroLiquido, margemLiquida, markup
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
                        {/* DRE Simplificado */}
                        <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                            <span>(+) Preço de Venda</span>
                            <span className="font-semibold">{formatCurrency(resultados.venda)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                            <span>(-) Impostos sobre a Venda</span>
                            <span className="text-red-500">{formatCurrency(resultados.vImpostos)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                            <span>(-) Custo do Produto</span>
                            <span className="text-red-500">{formatCurrency(resultados.custo)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-2">
                            <span>(=) Lucro Bruto (Margem de Contribuição)</span>
                            <span>{formatCurrency(resultados.lucroBruto)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-secondary/30 mt-4">
                            <span>(-) Custo Fixo (Rateio)</span>
                            <span className="text-orange-500">{formatCurrency(resultados.vCustoFixo)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-xl text-primary border-t-2 pt-3 mt-3">
                            <span>(=) LUCRO LÍQUIDO DO PRODUTO</span>
                            <span>{formatCurrency(resultados.lucroLiquido)}</span>
                        </div>

                        {/* Indicadores */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t mt-4">
                            <div className="text-center p-2 bg-secondary rounded-md">
                                <p className="text-xs text-muted-foreground">Markup</p>
                                <p className="text-lg font-bold">{formatPercent(resultados.markup)}</p>
                            </div>
                            <div className="text-center p-2 bg-secondary rounded-md">
                                <p className="text-xs text-muted-foreground">Margem Bruta</p>
                                <p className="text-lg font-bold">{formatPercent(resultados.margemBruta)}</p>
                            </div>
                            <div className="text-center p-2 bg-secondary rounded-md">
                                <p className="text-xs text-muted-foreground">Margem Líquida</p>
                                <p className="text-lg font-bold text-primary">{formatPercent(resultados.margemLiquida)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <details className="mt-8 text-sm group bg-card border rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-primary list-none flex items-center gap-2">
                    <HelpCircle size={16} /> Entendendo os Indicadores: Markup, Margem Bruta e Margem Líquida
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 ml-auto" />
                </summary>

                <div className="mt-4 border-t pt-4 space-y-4 animate-fade-in text-muted-foreground">
                    {/* Card 1: Markup */}
                    <div className="border rounded-lg p-3 bg-secondary/30">
                        <h4 className="font-semibold text-foreground flex items-center gap-2"><Percent size={16} /> Markup</h4>
                        <p className="mt-1">
                            É um índice aplicado sobre o **custo** do produto para formar o preço de venda. Ele mostra o quanto, em percentual, seu preço de venda é maior que o seu custo direto.
                        </p>
                        <p className="font-mono text-xs mt-2 bg-background p-2 rounded">
                            Fórmula: (Preço de Venda / Custo do Produto - 1) * 100
                        </p>
                        <p className="text-xs italic mt-2">
                            <strong>Exemplo:</strong> Se um produto custa R$ 50 e é vendido por R$ 100, seu Markup é de 100%.
                        </p>
                    </div>

                    {/* Card 2: Margem Bruta */}
                    <div className="border rounded-lg p-3 bg-secondary/30">
                        <h4 className="font-semibold text-foreground flex items-center gap-2"><TrendingDown size={16} /> Margem Bruta (ou de Contribuição)</h4>
                        <p className="mt-1">
                            Representa o quanto sobrou do **preço de venda** após subtrair os custos diretos (custo do produto e impostos sobre a venda). É o dinheiro que "sobra" para pagar as despesas fixas da empresa e gerar lucro.
                        </p>
                        <p className="font-mono text-xs mt-2 bg-background p-2 rounded">
                            Fórmula: ((Receita Líquida - Custo do Produto) / Preço de Venda) * 100
                        </p>
                        <p className="text-xs italic mt-2">
                            <strong>Exemplo:</strong> Venda de R$ 100, com imposto de R$ 18 e custo de R$ 50. O Lucro Bruto é R$ 32, e a Margem Bruta é 32%.
                        </p>
                    </div>

                    {/* Card 3: Margem Líquida */}
                    <div className="border rounded-lg p-3 bg-secondary/30">
                        <h4 className="font-semibold text-foreground flex items-center gap-2"><Target size={16} /> Margem Líquida</h4>
                        <p className="mt-1">
                            Este é o indicador mais importante. Ele mostra o percentual do **preço de venda** que efetivamente se transforma em **lucro no seu bolso**, após pagar **todos** os custos e despesas (diretos, indiretos e fixos).
                        </p>
                        <p className="font-mono text-xs mt-2 bg-background p-2 rounded">
                            Fórmula: (Lucro Líquido / Preço de Venda) * 100
                        </p>
                        <p className="text-xs italic mt-2">
                            <strong>Exemplo:</strong> Se o Lucro Líquido de uma venda de R$ 100 foi R$ 15, sua Margem Líquida é de 15%.
                        </p>
                    </div>
                </div>
            </details>
        </div>
    );
}