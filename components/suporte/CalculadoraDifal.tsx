'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import { Calculator, X, HelpCircle, ChevronDown, Repeat, ClipboardCheck, Package, ArrowLeftRight, Scaling, ArrowRight, FileDigit, Archive, Percent } from 'lucide-react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// --- Funções Auxiliares Refinadas ---
const formatCurrency = (value: number | null | undefined): string => {
    if (value == null || isNaN(value)) {
        return 'R$ 0,00';
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseCurrency = (value: string): number => {
    if (!value) return 0;
    // Remove pontos de milhar e substitui a última vírgula por ponto para o parseFloat
    const cleanedValue = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanedValue) || 0;
};

// Versão mais robusta para formatação em tempo real
const formatarMoedaInput = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';

    const numberValue = parseFloat(digitsOnly) / 100;
    return numberValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const round = (value: number): number => Math.round(value * 100) / 100;


// --- Dados de Alíquotas ---
const aliquotasDestinoPorUF: Record<string, string> = { 'AC': '19', 'AL': '19', 'AP': '18', 'AM': '20', 'BA': '19', 'CE': '18', 'DF': '18', 'ES': '17', 'GO': '17', 'MA': '20', 'MT': '17', 'MS': '17', 'MG': '18', 'PA': '17', 'PB': '18', 'PR': '19', 'PE': '18', 'PI': '18', 'RJ': '20', 'RN': '18', 'RS': '17', 'RO': '17.5', 'RR': '17', 'SC': '17', 'SP': '18', 'SE': '19', 'TO': '18' };
const ufs = Object.keys(aliquotasDestinoPorUF).sort();


// --- Componente Principal da Calculadora ---
export function CalculadoraDifal() {
    // --- Estados para PASSO 1 ---
    const [valorProduto, setValorProduto] = useState('');
    const [valorFrete, setValorFrete] = useState('');
    const [valorOutrasDespesas, setValorOutrasDespesas] = useState('');
    const [valorIpi, setValorIpi] = useState('');
    const [finalidade, setFinalidade] = useState<'revenda' | 'consumo'>('revenda');

    // --- Estados para PASSO 2 ---
    const [aliqInterestadual, setAliqInterestadual] = useState('12');
    const [ufDestino, setUfDestino] = useState('');
    const [aliqDestino, setAliqDestino] = useState('');
    const [reducaoBC, setReducaoBC] = useState('');

    // --- Lógica de Cálculo ---
    const baseDeCalculo = useMemo(() => {
        const vp = parseCurrency(valorProduto);
        const vf = parseCurrency(valorFrete);
        const vod = parseCurrency(valorOutrasDespesas);
        const vIpi = parseCurrency(valorIpi);
        const bcComum = vp + vf + vod;
        const bcFinal = finalidade === 'consumo' ? bcComum + vIpi : bcComum;
        return { valor: bcFinal, formula: finalidade === 'consumo' ? "Produtos + Frete + Desp. + IPI" : "Produtos + Frete + Desp." };
    }, [valorProduto, valorFrete, valorOutrasDespesas, valorIpi, finalidade]);

    const resultados = useMemo(() => {
        const bc = baseDeCalculo.valor;
        const alqInter = parseFloat(aliqInterestadual) || 0;
        const alqDest = parseFloat(aliqDestino) || 0;
        const pRed = parseFloat(reducaoBC) || 0;

        if (bc === 0 || alqInter === 0 || alqDest === 0) return null;
        if (alqDest <= alqInter) return { error: 'Alíquota de destino deve ser maior que a interestadual.' };

        if (finalidade === 'revenda') {
            const bcOrigem = round(bc * (1 - pRed / 100));
            const vCredito = round(bcOrigem * (alqInter / 100));
            const divisor = 1 - alqDest / 100;
            if (divisor <= 0) return { error: 'Alíquota de destino inválida.' };
            const bcDestino = round((bcOrigem - vCredito) / divisor);
            const vDebito = round(bcDestino * (alqDest / 100));
            const vAntecipacao = round(vDebito - vCredito);
            return { type: 'antecipacao', bcOrigem, vCredito, bcDestino, vDebito, vAntecipacao, error: null };
        } else { // finalidade === 'consumo'
            const bcReduzida = round(bc * (1 - pRed / 100));
            const diferencial = (alqDest - alqInter) / 100;
            const valorAPagar = round(bcReduzida * diferencial);
            return { type: 'difal', baseDeCalculo: bc, bcReduzida, diferencial, valorAPagar, error: null };
        }
    }, [baseDeCalculo, aliqInterestadual, aliqDestino, reducaoBC, finalidade]);

    // --- Handlers ---
    const handleClear = () => {
        setValorProduto(''); setValorFrete(''); setValorOutrasDespesas(''); setValorIpi('');
        setAliqInterestadual('12'); setUfDestino(''); setAliqDestino(''); setReducaoBC('');
        setFinalidade('revenda');
    };
    const handleCurrencyChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: ChangeEvent<HTMLInputElement>) => setter(formatarMoedaInput(e.target.value));
    const handleUfChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const uf = e.target.value;
        setUfDestino(uf);
        setAliqDestino(aliquotasDestinoPorUF[uf] || '');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* --- PASSO 1: COMPOSIÇÃO DA BASE DE CÁLCULO --- */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2"><span className="font-bold text-primary">1.</span> Composição da Base de Cálculo</h3>
                <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground">Qual a finalidade da mercadoria?</label>
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-md p-1 bg-secondary">
                        <button onClick={() => setFinalidade('revenda')} className={`px-3 py-1.5 rounded text-sm transition-colors ${finalidade === 'revenda' ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-background/50'}`}>Revenda / Industrialização</button>
                        <button onClick={() => setFinalidade('consumo')} className={`px-3 py-1.5 rounded text-sm transition-colors ${finalidade === 'consumo' ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-background/50'}`}>Uso, Consumo ou Ativo</button>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div><label>Valor dos Produtos</label><input type="text" inputMode="decimal" placeholder="1.000,00" value={valorProduto} onChange={handleCurrencyChange(setValorProduto)} className="mt-1 w-full p-2 bg-background border rounded-md" /></div>
                    <div><label>Valor do Frete</label><input type="text" inputMode="decimal" placeholder="100,00" value={valorFrete} onChange={handleCurrencyChange(setValorFrete)} className="mt-1 w-full p-2 bg-background border rounded-md" /></div>
                    <div><label>Outras Despesas</label><input type="text" inputMode="decimal" placeholder="50,00" value={valorOutrasDespesas} onChange={handleCurrencyChange(setValorOutrasDespesas)} className="mt-1 w-full p-2 bg-background border rounded-md" /></div>
                    <div><label className={`${finalidade === 'revenda' ? 'text-muted-foreground/50' : ''}`}>Valor do IPI</label><input type="text" inputMode="decimal" placeholder="0,00" value={valorIpi} onChange={handleCurrencyChange(setValorIpi)} disabled={finalidade === 'revenda'} className={`mt-1 w-full p-2 bg-background border rounded-md ${finalidade === 'revenda' ? 'bg-muted/50 cursor-not-allowed' : ''}`} /></div>
                </div>
                {baseDeCalculo.valor > 0 && (
                    <div className="mt-4 p-3 bg-secondary rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Base de Cálculo (BC) Total:</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(baseDeCalculo.valor)}</p>
                        <p className="text-xs font-mono text-muted-foreground/80">({baseDeCalculo.formula})</p>
                    </div>
                )}
            </div>

            {/* --- PASSO 2: APLICAÇÃO DAS ALÍQUOTAS --- */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2"><span className="font-bold text-primary">2.</span> Aplicação das Alíquotas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div><label>Alíq. Interestadual</label><select value={aliqInterestadual} onChange={e => setAliqInterestadual(e.target.value)} className="mt-1 w-full p-2 bg-background border rounded-md"><option value="12">12%</option><option value="7">7%</option><option value="4">4%</option></select></div>
                    <div><label>UF Destino</label><select value={ufDestino} onChange={handleUfChange} className="mt-1 w-full p-2 bg-background border rounded-md"><option value="">Selecione...</option>{ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}</select></div>
                    <div><label>Alíq. Destino (%)</label><input type="number" placeholder="18" value={aliqDestino} onChange={e => setAliqDestino(e.target.value)} className="mt-1 w-full p-2 bg-background border rounded-md" /></div>
                    <div>
                        <label className="flex items-center gap-1">Redução BC (%)<span title="Benefício fiscal de redução da Base de Cálculo, se aplicável."><HelpCircle size={13} /></span></label>
                        <input type="number" placeholder="0" value={reducaoBC} onChange={e => setReducaoBC(e.target.value)} className="mt-1 w-full p-2 bg-background border rounded-md" />
                    </div>
                </div>
                <div className="flex justify-end mt-4">
                    <button onClick={handleClear} className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"><X size={16} /> Limpar Tudo</button>
                </div>
            </div>

            {/* --- Card de Resultados --- */}
            {!resultados ? (
                <div className="bg-card border-2 border-dashed rounded-lg p-6 text-center animate-fade-in">
                    <Calculator className="mx-auto text-muted-foreground/80" size={32} />
                    <h3 className="text-md font-semibold mt-2">Aguardando dados</h3>
                    <p className="text-sm text-muted-foreground mt-1">Preencha os campos acima para calcular.</p>
                </div>
            ) : (
                <div className="bg-card border rounded-lg p-6 animate-fade-in shadow-sm">
                    {resultados.error ? (<p className="text-center text-destructive font-semibold">{resultados.error}</p>) : (
                        <>
                            {resultados.type === 'antecipacao' ? (
                                <>
                                    <h3 className="text-lg font-bold mb-4">Resultado da Antecipação Parcial</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><div className="flex items-center gap-3"><Package size={20} className="text-muted-foreground flex-shrink-0" /><div className="flex items-center gap-1.5"><span>1. Base de Cálculo Origem</span><span title="Valor base da nota com a redução de BC aplicada."><HelpCircle size={13} className="cursor-help" /></span></div></div><span className="font-semibold">{formatCurrency(resultados.bcOrigem)}</span></div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><div className="flex items-center gap-3"><ArrowLeftRight size={20} className="text-muted-foreground flex-shrink-0" /><div className="flex items-center gap-1.5"><span>2. Valor do Crédito (ICMS Inter)</span><span title="Valor do ICMS destacado na nota fiscal de origem, que será abatido."><HelpCircle size={13} className="cursor-help" /></span></div></div><span className="font-semibold text-red-500">{formatCurrency(resultados.vCredito)}</span></div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><div className="flex items-center gap-3"><Scaling size={20} className="text-muted-foreground flex-shrink-0" /><div className="flex items-center gap-1.5"><span>3. Base de Cálculo Destino ("por dentro")</span><span title="A base 'gross-up', que inclui o próprio imposto a ser pago, conforme legislação."><HelpCircle size={13} className="cursor-help" /></span></div></div><span className="font-semibold">{formatCurrency(resultados.bcDestino)}</span></div>
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><div className="flex items-center gap-3"><ArrowRight size={20} className="text-muted-foreground flex-shrink-0" /><span>4. Valor do Débito (ICMS Destino)</span></div><span className="font-semibold text-green-600">{formatCurrency(resultados.vDebito)}</span></div>
                                        <div className="flex justify-between items-center p-4 mt-4 rounded-lg bg-primary/10 border border-primary/20 text-lg font-bold text-primary"><div className="flex items-center gap-3"><FileDigit size={24} /><span>Valor da Antecipação a Pagar:</span></div><span>{formatCurrency(resultados.vAntecipacao)}</span></div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold mb-4">Resultado do DIFAL (Uso/Consumo)</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><div className="flex items-center gap-3"><Archive size={20} className="text-muted-foreground flex-shrink-0" /><div className="flex items-center gap-1.5"><span>1. Base de Cálculo Cheia</span><span title="Valor total da operação (Produtos + Frete + Desp. + IPI)."><HelpCircle size={13} className="cursor-help" /></span></div></div><span className="font-semibold">{formatCurrency(resultados.baseDeCalculo)}</span></div>
                                        {parseFloat(reducaoBC) > 0 && (<div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><div className="flex items-center gap-3"><Scaling size={20} className="text-muted-foreground flex-shrink-0" /><span>2. Base de Cálculo Reduzida ({reducaoBC}%):</span></div><span className="font-semibold">{formatCurrency(resultados.bcReduzida)}</span></div>)}
                                        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"><div className="flex items-center gap-3"><Percent size={20} className="text-muted-foreground flex-shrink-0" /><span>{parseFloat(reducaoBC) > 0 ? '3.' : '2.'} Diferencial de Alíquotas:</span></div><span className="font-semibold">{(((resultados.diferencial ?? 0) * 100).toFixed(2)).replace('.', ',')}%</span></div>
                                        <div className="flex justify-between items-center p-4 mt-4 rounded-lg bg-primary/10 border border-primary/20 text-lg font-bold text-primary"><div className="flex items-center gap-3"><FileDigit size={24} /><span>{parseFloat(reducaoBC) > 0 ? '4.' : '3.'} Valor do DIFAL a Pagar:</span></div><span>{formatCurrency(resultados.valorAPagar)}</span></div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* --- Seção de Explicações (Refinada) --- */}
            <details className="mt-8 text-sm group bg-card border rounded-lg p-4 shadow-sm">
                <summary className="cursor-pointer font-semibold text-primary list-none flex items-center gap-2">
                    <HelpCircle size={16} /> Entenda a Diferença: Antecipação vs. DIFAL
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 ml-auto" />
                </summary>

                <div className="mt-4 border-t pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in text-muted-foreground">

                    {/* Card 1: Antecipação Parcial */}
                    <div className="border rounded-lg p-4 bg-secondary/30 space-y-4 flex flex-col">
                        <h4 className="text-base font-semibold text-foreground flex items-center gap-3">
                            {/* AJUSTE: Cor unificada */}
                            <span className="bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                            <div>
                                Antecipação Parcial
                                <p className="text-xs font-normal text-muted-foreground">Para Revenda ou Industrialização</p>
                            </div>
                        </h4>
                        
                        <div className="flex items-start gap-2 text-xs">
                             {/* AJUSTE: Cor unificada */}
                            <Repeat size={18} className="text-primary mt-0.5 flex-shrink-0" />
                            <p>Aplicável a empresas do **Simples Nacional** ao comprar produtos de fora do estado para **revender ou usar como matéria-prima**.</p>
                        </div>

                         {/* AJUSTE: Cor unificada */}
                        <div className="p-3 bg-primary/10 text-primary-foreground rounded-md text-xs border border-primary/20">
                            <p className="font-semibold text-primary">Ponto Chave: O valor do IPI <strong className="uppercase">não entra</strong> na base de cálculo.</p>
                            <p className="font-mono mt-2 text-primary/80">BC = Produtos + Frete + Outras Despesas</p>
                        </div>
                        
                        <div className="flex-grow flex flex-col">
                            <p className="font-semibold text-xs uppercase text-foreground">Fórmula do Valor a Pagar ("Cálculo por Dentro"):</p>
                            <div className="mt-1 p-3 bg-background rounded-md text-sm leading-relaxed text-center flex-grow flex flex-col items-center justify-center">
                                {/* AJUSTE: Fórmula quebrada em etapas para melhor legibilidade e responsividade */}
                                <BlockMath math={`BC_{Dest.} = \\frac{BC_{Origem} \\times (1 - Alíq_{Inter})}{1 - Alíq_{Dest.}}`} />
                                <div className="text-xs space-y-2 mt-2">
                                  <BlockMath math={`Débito = BC_{Dest.} \\times Alíq_{Dest.}`} />
                                  <BlockMath math={`Crédito = BC_{Origem} \\times Alíq_{Inter}`} />
                                  <BlockMath math={`Pagar = Débito - Crédito`} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: DIFAL de Uso e Consumo */}
                    <div className="border rounded-lg p-4 bg-secondary/30 space-y-4 flex flex-col">
                        <h4 className="text-base font-semibold text-foreground flex items-center gap-3">
                             {/* AJUSTE: Cor unificada */}
                            <span className="bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                            <div>
                                DIFAL
                                <p className="text-xs font-normal text-muted-foreground">Para Uso, Consumo ou Ativo</p>
                            </div>
                        </h4>

                        <div className="flex items-start gap-2 text-xs">
                             {/* AJUSTE: Cor unificada */}
                            <ClipboardCheck size={18} className="text-primary mt-0.5 flex-shrink-0" />
                            <p>Aplicável a **qualquer empresa** (contribuinte de ICMS) que compra de fora do estado para **uso próprio, consumo ou ativo imobilizado**.</p>
                        </div>

                         {/* AJUSTE: Cor unificada */}
                        <div className="p-3 bg-primary/10 text-primary-foreground rounded-md text-xs border border-primary/20">
                            <p className="font-semibold text-primary">Ponto Chave: O valor do IPI <strong className="uppercase">entra</strong> na base de cálculo.</p>
                            <p className="font-mono mt-2 text-primary/80">BC = Produtos + IPI + Frete + Outras Despesas</p>
                        </div>
                        
                        <div className="flex-grow flex flex-col">
                            <p className="font-semibold text-xs uppercase text-foreground">Fórmula do Valor a Pagar ("Cálculo por Fora"):</p>
                            <div className="mt-1 p-3 bg-background rounded-md text-sm leading-relaxed text-center flex-grow flex items-center justify-center">
                                <BlockMath math={`Pagar = BC \\times (Alíq_{Dest.} - Alíq_{Inter})`} />
                            </div>
                        </div>
                    </div>
                </div>
            </details>
        </div>
    );
}