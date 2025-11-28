'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import { Target, X, HelpCircle, ChevronDown, TrendingUp, TrendingDown, DollarSign, Package, Coins } from 'lucide-react';

// --- Funções Auxiliares (reutilizadas) ---
const formatCurrency = (value: number) => isNaN(value) ? 'R$ 0,00' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNumber = (value: number) => isNaN(value) ? '0' : Math.ceil(value).toLocaleString('pt-BR');
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
const round = (value: number) => Math.round(value * 100) / 100;

// --- Componente Principal ---
export function AnalisadorPontoEquilibrio() {
    // --- Estados ---
    const [custosFixos, setCustosFixos] = useState('');
    const [precoVendaMedio, setPrecoVendaMedio] = useState('');
    const [custosVariaveisMedios, setCustosVariaveisMedios] = useState('');
    
    // NOVOS ESTADOS para cálculo bidirecional
    const [faturamentoDesejado, setFaturamentoDesejado] = useState('');
    const [lucroDesejado, setLucroDesejado] = useState('');
    const [modoAnalise, setModoAnalise] = useState<'faturamento' | 'lucro'>('faturamento');

    // --- Lógica de Análise ---
    const analise = useMemo(() => {
        const cf = parseCurrency(custosFixos);
        const pv = parseCurrency(precoVendaMedio);
        const cv = parseCurrency(custosVariaveisMedios);

        if (cf === 0 || pv === 0) return null;
        if (pv <= cv) return { error: 'O Preço de Venda deve ser maior que o Custo Variável.' };
        
        const margemContribuicaoUnitaria = pv - cv;
        const indiceMargemContribuicao = margemContribuicaoUnitaria / pv;

        if (indiceMargemContribuicao <= 0) return { error: 'A Margem de Contribuição deve ser positiva.' };

        const pontoEquilibrioFaturamento = cf / indiceMargemContribuicao;
        const pontoEquilibrioUnidades = cf / margemContribuicaoUnitaria;

        let faturamentoProjetado = 0;
        let lucroProjetado = 0;

        // LÓGICA BIDIRECIONAL
        if (modoAnalise === 'faturamento') {
            faturamentoProjetado = parseCurrency(faturamentoDesejado);
            lucroProjetado = faturamentoProjetado * indiceMargemContribuicao - cf;
        } else { // modoAnalise === 'lucro'
            lucroProjetado = parseCurrency(lucroDesejado);
            faturamentoProjetado = (lucroProjetado + cf) / indiceMargemContribuicao;
        }
        
        const percentualNoGrafico = faturamentoProjetado > 0 ? (pontoEquilibrioFaturamento / faturamentoProjetado) * 100 : 0;

        return {
            error: null,
            pontoEquilibrioFaturamento,
            pontoEquilibrioUnidades,
            faturamentoProjetado: round(faturamentoProjetado),
            lucroProjetado: round(lucroProjetado),
            percentualNoGrafico: Math.min(percentualNoGrafico, 100)
        };

    }, [custosFixos, precoVendaMedio, custosVariaveisMedios, faturamentoDesejado, lucroDesejado, modoAnalise]);

    // --- Handlers ---
    const handleClear = () => {
        setCustosFixos('');
        setPrecoVendaMedio('');
        setCustosVariaveisMedios('');
        setFaturamentoDesejado('');
        setLucroDesejado('');
        setModoAnalise('faturamento');
    };
    const handleCurrencyChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: ChangeEvent<HTMLInputElement>) => {
        setter(formatarMoedaInput(e.target.value));
    };
    // NOVOS HANDLERS para definir o modo de análise
    const handleFaturamentoChange = (e: ChangeEvent<HTMLInputElement>) => {
        setModoAnalise('faturamento');
        setFaturamentoDesejado(formatarMoedaInput(e.target.value));
    };
    const handleLucroChange = (e: ChangeEvent<HTMLInputElement>) => {
        setModoAnalise('lucro');
        setLucroDesejado(formatarMoedaInput(e.target.value));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Target size={20} /> Parâmetros do Negócio</h3>
                    <button onClick={handleClear} className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"><X size={16} /> Limpar</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm items-start">
                    {/* Coluna 1: Custos */}
                    <div className="space-y-4">
                         <div>
                            <label className="font-medium text-muted-foreground flex items-center gap-1.5">
                                Custos Fixos Totais Mensais
                                <span title="A soma de todas as despesas que não mudam com o volume de vendas (aluguel, salários, software, etc.).">
                                    <HelpCircle size={14} className="cursor-help" />
                                </span>
                            </label>
                            <input type="text" inputMode="decimal" placeholder="Ex: 8.000,00" value={custosFixos} onChange={handleCurrencyChange(setCustosFixos)} className="mt-1 w-full p-2 bg-background border rounded-md" />
                        </div>
                        <div>
                            <label className="font-medium text-muted-foreground">Preço de Venda Médio por Unidade</label>
                            <input type="text" inputMode="decimal" placeholder="Ex: 50,00" value={precoVendaMedio} onChange={handleCurrencyChange(setPrecoVendaMedio)} className="mt-1 w-full p-2 bg-background border rounded-md" />
                        </div>
                        <div>
                            <label className="font-medium text-muted-foreground flex items-center gap-1.5">
                                Custos Variáveis Médios por Unidade
                                <span title="A soma dos custos que acontecem a cada venda (impostos, comissões, matéria-prima, embalagem, etc.).">
                                    <HelpCircle size={14} className="cursor-help" />
                                </span>
                            </label>
                            <input type="text" inputMode="decimal" placeholder="Ex: 20,00" value={custosVariaveisMedios} onChange={handleCurrencyChange(setCustosVariaveisMedios)} className="mt-1 w-full p-2 bg-background border rounded-md" />
                        </div>
                    </div>
                    {/* Coluna 2: Bloco de Metas */}
                    <div className="bg-secondary/50 p-4 rounded-lg space-y-4">
                        <h4 className="font-medium text-muted-foreground">Simulador de Metas</h4>
                        <p className="text-xs text-muted-foreground/80 -mt-3">Edite o faturamento para ver o lucro, ou edite o lucro para ver o faturamento necessário.</p>
                        <div>
                            <label className="font-semibold text-sm flex items-center gap-2"><TrendingUp size={16}/> Meta de Faturamento Mensal</label>
                             <input type="text" inputMode="decimal" placeholder="Ex: 20.000,00"
                                value={modoAnalise === 'lucro' && analise ? formatarMoedaInput(String(analise.faturamentoProjetado)) : faturamentoDesejado}
                                onChange={handleFaturamentoChange}
                                className="mt-1 w-full p-2 bg-background border rounded-md" />
                        </div>
                         <div>
                            <label className="font-semibold text-sm flex items-center gap-2"><Coins size={16}/> Meta de Lucro Mensal</label>
                             <input type="text" inputMode="decimal" placeholder="Ex: 5.000,00"
                                value={modoAnalise === 'faturamento' && analise ? formatarMoedaInput(String(analise.lucroProjetado)) : lucroDesejado}
                                onChange={handleLucroChange}
                                className="mt-1 w-full p-2 bg-background border rounded-md" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Card de Análise */}
            {!analise ? (
                <div className="bg-card border-2 border-dashed rounded-lg p-6 text-center animate-fade-in">
                    <TrendingUp className="mx-auto text-muted-foreground/80" size={32} />
                    <h3 className="text-md font-semibold mt-2">Aguardando dados</h3>
                    <p className="text-sm text-muted-foreground mt-1">Preencha os custos e preços para analisar seu ponto de equilíbrio.</p>
                </div>
            ) : analise.error ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center text-destructive font-semibold animate-fade-in">
                    {analise.error}
                </div>
            ) : (
                <div className="bg-card border rounded-lg p-6 shadow-sm animate-fade-in">
                    <h3 className="text-lg font-bold mb-4">Análise do Ponto de Equilíbrio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                        <div className="bg-secondary p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Você precisa faturar no mínimo</p>
                            <p className="text-3xl font-bold text-primary">{formatCurrency(analise.pontoEquilibrioFaturamento ?? 0)}</p>
                            <p className="text-sm text-muted-foreground">por mês para não ter prejuízo.</p>
                        </div>
                        <div className="bg-secondary p-4 rounded-lg">
                            <p className="text-sm text-muted-foreground">Isso equivale a vender</p>
                            <p className="text-3xl font-bold text-primary">{formatNumber(analise.pontoEquilibrioUnidades ?? 0)}</p>
                             <p className="text-sm text-muted-foreground">unidades por mês.</p>
                        </div>
                    </div>
                    
                    {(analise.faturamentoProjetado ?? 0) > 0 && (
                        <div className="mt-6">
                            <h4 className="font-semibold text-center mb-3">Análise Gráfica da sua Meta</h4>
                            <div className="w-full bg-secondary rounded-full h-8 relative overflow-hidden border">
                                <div className="absolute inset-0 flex items-center justify-center z-20">
                                    <p className="text-xs font-bold text-background drop-shadow-sm">
                                        {(analise.faturamentoProjetado ?? 0) < (analise.pontoEquilibrioFaturamento ?? 0) ? "Meta abaixo do Ponto de Equilíbrio (Prejuízo)" : "Meta acima do Ponto de Equilíbrio (Lucro)"}
                                    </p>
                                </div>
                                <div className={`absolute top-0 left-0 h-full rounded-full z-10 ${
                                    (typeof analise.faturamentoProjetado === 'number' && typeof analise.pontoEquilibrioFaturamento === 'number' && analise.faturamentoProjetado < analise.pontoEquilibrioFaturamento)
                                        ? 'bg-destructive'
                                        : 'bg-green-500'
                                }`} style={{ width: '100%' }}></div>
                                <div className="absolute top-0 left-0 h-full bg-primary z-10" style={{ width: `${analise.percentualNoGrafico}%` }}></div>
                                <div className="absolute top-0 h-full border-r-2 border-dashed border-background/80 z-20" style={{ left: `${analise.percentualNoGrafico}%` }}>
                                     <div className="absolute -translate-x-1/2 mt-8 text-xs font-bold text-primary text-center w-24">Ponto de Equilíbrio</div>
                                </div>
                            </div>
                            {typeof analise.lucroProjetado === 'number' && (
                                <div className={`mt-10 text-center p-4 rounded-lg ${analise.lucroProjetado < 0 ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                                    <p className="text-sm">Com uma meta de faturamento de {formatCurrency(analise.faturamentoProjetado)}, seu resultado projetado é um</p>
                                    <p className={`text-2xl font-bold ${analise.lucroProjetado < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                        {analise.lucroProjetado < 0 ? `PREJUÍZO de ${formatCurrency(Math.abs(analise.lucroProjetado))}` : `LUCRO de ${formatCurrency(analise.lucroProjetado)}`}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Seção de Explicações */}
            <details className="mt-8 text-sm group">{/* ... Mesmo conteúdo da versão anterior ... */}</details>
        </div>
    );
}