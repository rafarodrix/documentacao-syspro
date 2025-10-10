'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import { Tag, X, HelpCircle, ChevronDown, Percent, TrendingDown, Target, DollarSign, Briefcase, ShieldAlert, BarChart2 } from 'lucide-react';

// --- Funções Auxiliares ---
const formatCurrency = (value: number) => isNaN(value) ? 'R$ 0,00' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (value: number) => isNaN(value) ? '0,00%' : `${(value || 0).toFixed(2).replace('.', ',')}%`;
const parseCurrency = (value: string): number => {
    if (!value) return 0;
    const cleanedValue = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanedValue) || 0;
};
const formatarMoedaInput = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';
    const numberValue = parseFloat(digitsOnly) / 100;
    return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
// Função de arredondamento movida para cá para melhor organização
const round = (value: number) => Math.round(value * 100) / 100;


// --- Componente Principal ---
export function CalculadoraPrecificacao() {
    // --- Estados ---
    const [faturamentoMedio, setFaturamentoMedio] = useState('');
    const [despesasFixasMensais, setDespesasFixasMensais] = useState('');
    const [custoAquisicao, setCustoAquisicao] = useState('');
    const [precoVenda, setPrecoVenda] = useState('');
    const [impostosVenda, setImpostosVenda] = useState('');
    const [lucroLiquidoDesejado, setLucroLiquidoDesejado] = useState('');
    const [margemLiquidaDesejada, setMargemLiquidaDesejada] = useState('');
    const [segmento, setSegmento] = useState<'varejo' | 'industria' | 'servicos'>('varejo');
    const [modoCalculo, setModoCalculo] = useState<'venda' | 'lucro_valor' | 'lucro_percentual'>('venda');

    // --- Hooks e Handlers ---
    const percentualCustoFixo = useMemo(() => {
        const faturamento = parseCurrency(faturamentoMedio);
        const despesas = parseCurrency(despesasFixasMensais);
        if (faturamento === 0) return 0;
        return (despesas / faturamento) * 100;
    }, [faturamentoMedio, despesasFixasMensais]);

    const resultados = useMemo(() => {
        const custo = parseCurrency(custoAquisicao);
        const pImpostos = parseFloat(impostosVenda) || 0;
        const pCustoFixo = percentualCustoFixo || 0;

        let venda = 0;
        let lucroLiquido = 0;
        let margemLiquidaPercent = 0;

        const percentualTotalCustosVariaveis = pImpostos + pCustoFixo;

        switch (modoCalculo) {
            case 'venda':
                venda = parseCurrency(precoVenda);
                if (venda === 0 || custo === 0) return null;
                lucroLiquido = round(venda - custo - (venda * (pImpostos / 100)) - (venda * (pCustoFixo / 100)));
                margemLiquidaPercent = venda > 0 ? (lucroLiquido / venda) * 100 : 0;
                break;
            case 'lucro_valor':
                lucroLiquido = parseCurrency(lucroLiquidoDesejado);
                if (custo === 0 || percentualTotalCustosVariaveis >= 100) return null;
                venda = round((lucroLiquido + custo) / (1 - (percentualTotalCustosVariaveis / 100)));
                margemLiquidaPercent = venda > 0 ? (lucroLiquido / venda) * 100 : 0;
                break;
            case 'lucro_percentual':
                margemLiquidaPercent = parseFloat(margemLiquidaDesejada.replace(',', '.')) || 0;
                const percentualTotal = percentualTotalCustosVariaveis + margemLiquidaPercent;
                if (custo === 0 || percentualTotal >= 100) return null;
                venda = round(custo / (1 - (percentualTotal / 100)));
                lucroLiquido = round(venda * (margemLiquidaPercent / 100));
                break;
        }

        if (venda < 0) return null;

        const vImpostos = round(venda * (pImpostos / 100));
        const receitaLiquida = round(venda - vImpostos);
        const vCustoFixo = round(venda * (pCustoFixo / 100));
        const margemDeContribuicao = round(venda - custo - vImpostos);
        const lucroBruto = round(receitaLiquida - custo);
        const margemBrutaPercent = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;
        const markup = custo > 0 ? (venda / custo - 1) * 100 : 0;
        const pontoDeEquilibrio = custo > 0 ? round(custo / (1 - (percentualTotalCustosVariaveis / 100))) : 0;

        return {
            venda, custo, pImpostos, vImpostos, receitaLiquida,
            lucroBruto, margemBrutaPercent, vCustoFixo, pCustoFixo,
            lucroLiquido, margemLiquidaPercent, markup,
            margemDeContribuicao, pontoDeEquilibrio, impossivel: percentualTotalCustosVariaveis >= 100
        };
    }, [custoAquisicao, impostosVenda, percentualCustoFixo, precoVenda, lucroLiquidoDesejado, margemLiquidaDesejada, modoCalculo]);

    const handleClear = () => {
        setFaturamentoMedio('');
        setDespesasFixasMensais('');
        setCustoAquisicao('');
        setPrecoVenda('');
        setImpostosVenda('');
        setLucroLiquidoDesejado('');
        setMargemLiquidaDesejada('');
        setSegmento('varejo'); // Reseta também o segmento
    };
    
    const handleCurrencyChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: ChangeEvent<HTMLInputElement>) => setter(formatarMoedaInput(e.target.value));
    const handlePrecoVendaChange = (e: ChangeEvent<HTMLInputElement>) => { setModoCalculo('venda'); setPrecoVenda(formatarMoedaInput(e.target.value)); };
    const handleLucroValorChange = (e: ChangeEvent<HTMLInputElement>) => { setModoCalculo('lucro_valor'); setLucroLiquidoDesejado(formatarMoedaInput(e.target.value)); };
    const handleMargemPercentualChange = (e: ChangeEvent<HTMLInputElement>) => { setModoCalculo('lucro_percentual'); setMargemLiquidaDesejada(e.target.value.replace(/[^0-9,.]/g, '')); };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* --- PASSO 1 --- */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2"><Briefcase size={20} /> Passo 1: Encontre seu Custo Fixo Percentual</h3>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                    Primeiro, informe os dados mensais e selecione seu segmento para analisarmos o peso das suas despesas fixas em relação a benchmarks do mercado.
                </p>
                <div className="mb-4">
                    <label htmlFor="segmento" className="font-medium text-muted-foreground text-sm">Seu segmento de mercado</label>
                    <select id="segmento" value={segmento} onChange={(e) => setSegmento(e.target.value as typeof segmento)} className="mt-1 w-full p-2 bg-background border rounded-md text-sm">
                        <option value="varejo">Varejo (Lojas, E-commerce)</option>
                        <option value="industria">Indústria (Manufatura, Produção)</option>
                        <option value="servicos">Serviços & Tecnologia (Consultoria, SaaS)</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <label className="font-medium text-muted-foreground">Faturamento Médio Mensal</label>
                        <input type="text" inputMode="decimal" placeholder="Ex: 20.000,00" value={faturamentoMedio} onChange={handleCurrencyChange(setFaturamentoMedio)} className="mt-1 w-full p-2 bg-background border rounded-md" />
                    </div>
                    <div>
                        <label className="font-medium text-muted-foreground flex items-center gap-1.5">
                            Total de Despesas Fixas Mensais
                            <span title="Inclua custos que não variam com as vendas: aluguel, salários, pro-labore, software, contador, etc.">
                                <HelpCircle size={14} className="cursor-help text-muted-foreground/80" />
                            </span>
                        </label>
                        <input type="text" inputMode="decimal" placeholder="Ex: 3.000,00" value={despesasFixasMensais} onChange={handleCurrencyChange(setDespesasFixasMensais)} className="mt-1 w-full p-2 bg-background border rounded-md" />
                    </div>
                </div>
                {percentualCustoFixo > 0 && (() => {
                const benchmarks = {
                    varejo: { 
                        saudavel: 25, 
                        atencao: 40, 
                        textoSaudavel: "Seus custos fixos estão bem controlados. Isso significa que uma menor parte da sua receita é necessária para manter a operação, o que geralmente resulta em maior flexibilidade para promoções e melhor margem de lucro.",
                        textoAtencao: "Seus custos fixos estão em um nível que exige atenção. No varejo, isso pode significar que sua estrutura (aluguel, equipe) é cara para o faturamento atual, exigindo um alto volume de vendas para ser lucrativo.",
                        textoPerigoso: "Sinal de alerta. Uma fatia muito grande da sua receita está sendo consumida apenas para manter as portas abertas. Isso torna o negócio vulnerável a quedas no faturamento e indica uma necessidade urgente de rever despesas ou aumentar as vendas."
                    },
                    industria: { 
                        saudavel: 35, 
                        atencao: 55, 
                        textoSaudavel: "Excelente estrutura de custos para uma indústria. Manter os custos fixos (maquinário, galpão) sob controle em relação à receita é um forte indicador de eficiência e competitividade no setor.",
                        textoAtencao: "Embora comum na indústria, este nível indica que sua operação tem um custo elevado. É crucial manter a produção em alta para diluir esses custos e garantir a lucratividade de cada unidade produzida.",
                        textoPerigoso: "Nível de risco elevado. Sua estrutura produtiva pode ser grande demais para o seu faturamento atual. Em momentos de baixa demanda, o prejuízo pode se acumular rapidamente. É vital otimizar a produção ou reavaliar os custos estruturais."
                    },
                    servicos: { 
                        saudavel: 30, 
                        atencao: 50, 
                        textoSaudavel: "Ótimo! Sua operação é enxuta e eficiente. Em serviços ou tecnologia, isso geralmente se traduz em alta rentabilidade, pois o custo para 'entregar' o serviço é baixo em comparação com a receita gerada.",
                        textoAtencao: "Este é um patamar comum, especialmente para negócios com equipes maiores ou que investem pesado em tecnologia. O foco deve ser a produtividade: garantir que o custo da sua equipe e ferramentas esteja gerando receita suficiente.",
                        textoPerigoso: "Sinal de alerta. Seus custos operacionais estão muito altos para sua receita. Isso pode indicar uma equipe grande com baixa geração de negócios, ou ferramentas/escritórios caros que não estão trazendo o retorno esperado."
                    }
                };
                    const limiares = benchmarks[segmento];
                    const status = percentualCustoFixo < limiares.saudavel ? { cor: 'green', textoStatus: 'Saudável', analise: limiares.textoSaudavel } : percentualCustoFixo < limiares.atencao ? { cor: 'amber', textoStatus: 'Atenção', analise: limiares.textoAtencao } : { cor: 'red', textoStatus: 'Perigoso', analise: limiares.textoPerigoso };
                    return (
                        <div className={`mt-4 p-4 border rounded-lg text-center animate-fade-in bg-${status.cor}-500/5 border-${status.cor}-500/20`}>
                            <p className={`text-sm font-semibold text-${status.cor}-600`}>Seu Custo Fixo Rateado está em um nível {status.textoStatus} para o seu segmento</p>
                            <p className={`text-3xl font-bold my-1 text-${status.cor}-500`}>{formatPercent(percentualCustoFixo)}</p>
                            <p className="text-xs text-muted-foreground mt-2">{status.analise}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-3 pt-3 border-t border-border/50">(Cálculo: {formatCurrency(parseCurrency(despesasFixasMensais))} ÷ {formatCurrency(parseCurrency(faturamentoMedio))})</p>
                        </div>
                    );
                })()}
                <p className="text-xs text-center text-muted-foreground/80 mt-4">* Os níveis de referência são baseados em médias de mercado e podem variar. Analise sempre o contexto do seu negócio.</p>
            </div>

            {/* --- PASSO 2 --- */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Tag size={20} /> Passo 2: Precifique seu Produto</h3>
                    <button onClick={handleClear} className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"><X size={16} /> Limpar Tudo</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm mt-4 items-start">
                    <div className="space-y-4">
                        <div>
                            <label className="font-medium text-muted-foreground">Custo do Produto</label>
                            <input type="text" inputMode="decimal" placeholder="Ex: 100,00" value={custoAquisicao} onChange={handleCurrencyChange(setCustoAquisicao)} className="mt-1 w-full p-2 bg-background border rounded-md" />
                        </div>
                        <div>
                            <label className="font-medium text-muted-foreground">Impostos sobre Venda (%)</label>
                            <input type="number" placeholder="Ex: 18" value={impostosVenda} onChange={e => setImpostosVenda(e.target.value)} className="mt-1 w-full p-2 bg-background border rounded-md" />
                        </div>
                        <div>
                            <label className="font-medium text-muted-foreground">Preço de Venda</label>
                            <input type="text" inputMode="decimal" placeholder="R$ 0,00" value={modoCalculo !== 'venda' && resultados ? (resultados.venda ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : precoVenda} onChange={handlePrecoVendaChange} className="mt-1 w-full p-2 bg-background border rounded-md" />
                        </div>
                    </div>
                    <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                        <label className="font-medium text-muted-foreground">Definir Meta de Lucro</label>
                        <p className="text-xs text-muted-foreground/80 -mt-1">Edite o valor (R$) ou a margem (%) para calcular o preço de venda.</p>
                        <div>
                            <label className="text-xs font-semibold">Lucro Líquido (R$)</label>
                            <input type="text" inputMode="decimal" placeholder="R$ 0,00" value={modoCalculo !== 'lucro_valor' && resultados ? (resultados.lucroLiquido ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : lucroLiquidoDesejado} onChange={handleLucroValorChange} className="mt-1 w-full p-2 bg-background border rounded-md" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold">Margem Líquida (%)</label>
                            <div className="relative"><input type="text" inputMode="decimal" placeholder="0,00" value={modoCalculo !== 'lucro_percentual' && resultados ? (resultados.margemLiquidaPercent ?? 0).toFixed(2).replace('.', ',') : margemLiquidaDesejada} onChange={handleMargemPercentualChange} className="mt-1 w-full p-2 bg-background border rounded-md pr-8" /><span className="absolute inset-y-0 right-3 flex items-center text-muted-foreground text-sm">%</span></div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* --- Card de Resultados --- */}
            {!resultados ? (
                <div className="bg-card border-2 border-dashed rounded-lg p-6 text-center animate-fade-in">
                    <BarChart2 className="mx-auto text-muted-foreground/80" size={32} />
                    <h3 className="text-md font-semibold mt-2">Aguardando dados</h3>
                    <p className="text-sm text-muted-foreground mt-1">Preencha os campos acima para ver a análise completa da sua precificação.</p>
                </div>
            ) : (
                <div className="bg-card border rounded-lg p-6 animate-fade-in shadow-sm">
                    {resultados.impossivel ? (
                        <div className="text-center text-destructive p-4 bg-destructive/10 rounded-lg">
                            <h3 className="font-bold text-lg flex items-center justify-center gap-2"><ShieldAlert /> Precificação Inválida</h3>
                            <p className="text-sm mt-2">A soma dos impostos ({formatPercent(resultados.pImpostos ?? 0)}) e do custo fixo percentual ({formatPercent(resultados.pCustoFixo ?? 0)}) é 100% ou mais. É impossível obter lucro neste cenário.</p>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold mb-4">Análise da Precificação</h3>
                            <div className="space-y-4 text-sm">
                                <div className="space-y-2 border p-4 rounded-lg"><div className="flex justify-between items-center"><span className="text-muted-foreground">(+) Preço de Venda (Receita Bruta)</span> <span className="font-semibold">{formatCurrency(resultados.venda ?? 0)}</span></div><div className="flex justify-between items-center"><span className="text-red-500">(-) Impostos sobre a Venda ({formatPercent(resultados.pImpostos ?? 0)})</span> <span className="font-semibold text-red-500">{formatCurrency(resultados.vImpostos ?? 0)}</span></div><div className="flex justify-between font-bold border-t pt-2"><span>(=) Receita Líquida</span> <span>{formatCurrency(resultados.receitaLiquida ?? 0)}</span></div></div>
                                <div className="space-y-2 border p-4 rounded-lg"><div className="flex justify-between items-center"><span className="text-orange-500">(-) Custo do Produto (CMV)</span> <span className="font-semibold text-orange-500">{formatCurrency(resultados.custo ?? 0)}</span></div><div className="flex justify-between font-bold border-t pt-2"><span>(=) Lucro Bruto</span> <span>{formatCurrency(resultados.lucroBruto ?? 0)}</span></div></div>
                                <div className="space-y-2 border p-4 rounded-lg"><div className="flex justify-between items-center"><span className="text-yellow-500">(-) Despesas Operacionais (Rateio de {formatPercent(resultados.pCustoFixo ?? 0)})</span> <span className="font-semibold text-yellow-500">{formatCurrency(resultados.vCustoFixo ?? 0)}</span></div><div className={`flex justify-between font-bold text-xl border-t-2 pt-3 mt-2 ${(resultados.lucroLiquido ?? 0) < 0 ? 'text-destructive' : 'text-primary'}`}><span>(=) LUCRO LÍQUIDO</span> <span>{formatCurrency(resultados.lucroLiquido ?? 0)}</span></div></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t mt-4">
                                <div className="text-center p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Preço Mínimo (PMZ)</p><p className="text-lg font-bold text-amber-600">{formatCurrency(resultados.pontoDeEquilibrio ?? 0)}</p></div>
                                <div className="text-center p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Markup sobre Custo</p><p className="text-lg font-bold">{formatPercent(resultados.markup ?? 0)}</p></div>
                                <div className="text-center p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Margem de Contribuição</p><p className="text-lg font-bold">{formatCurrency(resultados.margemDeContribuicao ?? 0)}</p></div>
                                <div className="text-center p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Margem Líquida (%)</p><p className={`text-lg font-bold ${(resultados.margemLiquidaPercent ?? 0) < 0 ? 'text-destructive' : 'text-primary'}`}>{formatPercent(resultados.margemLiquidaPercent ?? 0)}</p></div>
                            </div>
                        </>
                    )}
                </div>
            )}
            
            {/* --- Seção de Explicações --- */}
            <details className="mt-8 text-sm group bg-card border rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-primary list-none flex items-center gap-2"><HelpCircle size={16} /> Entendendo os Indicadores de Lucratividade</summary>
                <div className="mt-4 border-t pt-4 space-y-4 animate-fade-in text-muted-foreground">
                    <div className="border rounded-lg p-3 bg-secondary/30"><h4 className="font-semibold text-foreground flex items-center gap-2"><ShieldAlert size={16} /> Preço Mínimo (Ponto de Equilíbrio)</h4><p className="mt-1">Também conhecido como "PMZ" (Preço Mínimo Zero), este é o valor de venda exato onde o **Lucro Líquido é zero**. Ele cobre todos os custos: o custo de aquisição do produto, os impostos da venda e a fatia proporcional das despesas fixas.</p><p className="mt-2 text-xs"><strong>Importância Estratégica:</strong> Vender qualquer valor abaixo deste preço significa que você está pagando para trabalhar, ou seja, tendo **prejuízo** em cada unidade vendida. É o seu piso de negociação.</p><p className="font-mono text-xs mt-2 bg-background p-2 rounded">Fórmula: Custo do Produto / (1 - (% Impostos + % Custo Fixo))</p></div>
                    <div className="border rounded-lg p-3 bg-secondary/30"><h4 className="font-semibold text-foreground flex items-center gap-2"><Percent size={16} /> Markup sobre o Custo</h4><p className="mt-1">É o índice percentual que você aplica sobre o **custo** do produto para formar o preço de venda. Ele responde à pergunta: "Quanto meu preço de venda é maior que meu custo?".</p><p className="font-mono text-xs mt-2 bg-background p-2 rounded">Fórmula: ((Preço de Venda / Custo do Produto) - 1) * 100</p></div>
                    <div className="border rounded-lg p-3 bg-secondary/30"><h4 className="font-semibold text-foreground flex items-center gap-2"><DollarSign size={16} /> Margem de Contribuição</h4><p className="mt-1">(Visão **Gerencial**) É o valor que sobra da venda após pagar todos os **custos e impostos variáveis**. Mostra o quanto cada venda "contribui" para pagar as despesas fixas (aluguel, salários) e gerar lucro.</p><p className="font-mono text-xs mt-2 bg-background p-2 rounded">Fórmula: Preço de Venda - (Custo do Produto + Impostos sobre Venda)</p></div>
                    <div className="border rounded-lg p-3 bg-secondary/30"><h4 className="font-semibold text-foreground flex items-center gap-2"><TrendingDown size={16} /> Lucro Bruto</h4><p className="mt-1">(Visão **Contábil**) É o resultado da **Receita Líquida** (venda já sem impostos) menos o custo do produto. É uma etapa formal do Demonstrativo de Resultados (DRE).</p><p className="font-mono text-xs mt-2 bg-background p-2 rounded">Fórmula: (Preço de Venda - Impostos sobre Venda) - Custo do Produto</p></div>
                    <div className="border rounded-lg p-3 bg-secondary/30"><h4 className="font-semibold text-foreground flex items-center gap-2"><Target size={16} /> Lucro Líquido</h4><p className="mt-1">O indicador final. É o que realmente sobra no bolso após pagar **todas** as contas (custos variáveis, impostos, e despesas fixas rateadas).</p><p className="font-mono text-xs mt-2 bg-background p-2 rounded">Fórmula: Lucro Bruto - Despesas Fixas</p></div>
                </div>
            </details>
        </div>
    );
}