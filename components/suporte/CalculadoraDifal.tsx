'use client';

import { useState, useMemo, ChangeEvent } from 'react';
import { Calculator, X, HelpCircle, ChevronDown } from 'lucide-react';
import 'katex/dist/katex.min.css';



// --- Funções de Formatação ---
const formatCurrency = (value: number | null | undefined) => {
    if (value == null || isNaN(value)) {
        return 'R$ 0,00';
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// --- Dados de Alíquotas ---
// Fonte: Portais de Secretarias da Fazenda Estaduais. Verifique para anos futuros.
const aliquotasDestinoPorUF: Record<string, string> = {
    'AC': '19', 'AL': '19', 'AP': '18', 'AM': '20', 'BA': '19', 'CE': '18',
    'DF': '18', 'ES': '17', 'GO': '17', 'MA': '20', 'MT': '17', 'MS': '17',
    'MG': '18', 'PA': '17', 'PB': '18', 'PR': '19', 'PE': '18', 'PI': '18',
    'RJ': '20', 'RN': '18', 'RS': '17', 'RO': '17.5', 'RR': '17', 'SC': '17',
    'SP': '18', 'SE': '19', 'TO': '18'
};

const ufs = Object.keys(aliquotasDestinoPorUF).sort();

// --- Componente Principal da Calculadora ---
export function CalculadoraDifal() {
    // --- Estados para os campos de entrada ---
    const [valorProduto, setValorProduto] = useState('');
    const [aliqInterestadual, setAliqInterestadual] = useState('12'); // Padrão 12%
    const [ufDestino, setUfDestino] = useState('');
    const [aliqDestino, setAliqDestino] = useState('');
    const [reducaoBC, setReducaoBC] = useState('0');

    // --- Lógica de Cálculo com useMemo para performance ---
    const resultados = useMemo(() => {
        const vp = parseFloat(valorProduto) || 0;
        const alqInter = parseFloat(aliqInterestadual) || 0;
        const alqDest = parseFloat(aliqDestino) || 0;
        const pRed = parseFloat(reducaoBC) || 0;

        if (vp === 0 || alqInter === 0 || alqDest === 0) return null;
        if (alqDest <= alqInter) return { error: 'Alíquota de destino deve ser maior que a interestadual.' };

        const bcOrigem = vp * (1 - pRed / 100);
        const vCredito = bcOrigem * (alqInter / 100);
        // Evita divisão por zero se a alíquota de destino for 100%
        const divisor = 1 - alqDest / 100;
        if (divisor <= 0) return { error: 'Alíquota de destino inválida.' };

        const bcDestino = (bcOrigem - vCredito) / divisor;
        const vDebito = bcDestino * (alqDest / 100);
        const vAntecipacao = vDebito - vCredito;

        return { bcOrigem, vCredito, bcDestino, vDebito, vAntecipacao, error: null };
    }, [valorProduto, aliqInterestadual, aliqDestino, reducaoBC]);

    // --- Manipuladores de Eventos ---
    const handleUfChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const uf = e.target.value;
        setUfDestino(uf);
        if (uf && aliquotasDestinoPorUF[uf]) {
            setAliqDestino(aliquotasDestinoPorUF[uf]);
        } else {
            setAliqDestino('');
        }
    };

    const handleClear = () => {
        setValorProduto('');
        setAliqInterestadual('12');
        setUfDestino('');
        setAliqDestino('');
        setReducaoBC('0');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Seção de Entradas */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Calculator size={20} /> Entradas para o Cálculo</h3>
                    <button onClick={handleClear} className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1">
                        <X size={16} /> Limpar
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="valorProduto" className="text-sm font-medium text-muted-foreground">Valor do Produto</label>
                        <input id="valorProduto" type="number" placeholder="Ex: 1494.33" value={valorProduto} onChange={e => setValorProduto(e.target.value)}
                            className="mt-1 w-full p-2 bg-background border rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="aliqInterestadual" className="text-sm font-medium text-muted-foreground">Alíquota Interestadual</label>
                        <select id="aliqInterestadual" value={aliqInterestadual} onChange={e => setAliqInterestadual(e.target.value)}
                            className="mt-1 w-full p-2 bg-background border rounded-md">
                            <option value="12">12% (Padrão)</option>
                            <option value="7">7% (Norte, NE, Centro-Oeste, ES)</option>
                            <option value="4">4% (Importados)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label htmlFor="ufDestino" className="text-sm font-medium text-muted-foreground">UF Destino</label>
                            <select id="ufDestino" value={ufDestino} onChange={handleUfChange} className="mt-1 w-full p-2 bg-background border rounded-md">
                                <option value="">Selecione...</option>
                                {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="aliqDestino" className="text-sm font-medium text-muted-foreground">Alíq. Destino (%)</label>
                            <input id="aliqDestino" type="number" placeholder="Ex: 18" value={aliqDestino} onChange={e => setAliqDestino(e.target.value)}
                                className="mt-1 w-full p-2 bg-background border rounded-md" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção de Resultados */}
            {resultados && (
                <div className="bg-card border rounded-lg p-6 animate-fade-in shadow-sm">
                    {resultados.error ? (
                        <p className="text-center text-red-500 font-semibold">{resultados.error}</p>
                    ) : (
                        <>
                            <h3 className="text-lg font-bold mb-4">Resultado do Cálculo (Passo a Passo)</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between p-2 rounded bg-secondary/30">
                                    <span className="text-muted-foreground">1. Base de Cálculo Origem:</span>
                                    <span className="font-semibold">{formatCurrency(resultados.bcOrigem)}</span>
                                </div>
                                <div className="flex justify-between p-2 rounded bg-secondary/30">
                                    <span className="text-muted-foreground">2. Valor do Crédito (ICMS Interestadual):</span>
                                    <span className="font-semibold">{formatCurrency(resultados.vCredito)}</span>
                                </div>
                                <div className="flex justify-between p-2 rounded bg-secondary/30">
                                    <span className="text-muted-foreground">3. Base de Cálculo Destino ("por dentro"):</span>
                                    <span className="font-semibold">{formatCurrency(resultados.bcDestino)}</span>
                                </div>
                                <div className="flex justify-between p-2 rounded bg-secondary/30">
                                    <span className="text-muted-foreground">4. Valor do Débito (ICMS Destino):</span>
                                    <span className="font-semibold">{formatCurrency(resultados.vDebito)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 mt-4 border-t text-lg font-bold text-primary">
                                    <span>5. Valor da Antecipação (DIFAL a Pagar):</span>
                                    <span>{formatCurrency(resultados.vAntecipacao)}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
            <details className="mt-8 text-sm group">
                <summary className="cursor-pointer font-semibold text-primary list-none flex items-center gap-2">
                    <HelpCircle size={16} /> Entenda a Diferença: Antecipação vs. DIFAL de Uso/Consumo
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 ml-auto" />
                </summary>

                <div className="mt-4 border-t pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">

                    {/* Card 1: Antecipação de Alíquota */}
                    <div className="border rounded-lg p-4 bg-secondary/30 space-y-4">
                        <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <span className="bg-blue-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">1</span>
                            Antecipação (Revenda/Industrialização)
                        </h4>
                        <p className="text-muted-foreground">
                            Para empresas do **Simples Nacional** que compram para **revender ou industrializar** produtos **tributados integralmente**.
                        </p>
                        <div className="p-3 bg-destructive/10 text-destructive-foreground rounded-md text-xs border border-destructive/20">
                            <p className="font-semibold">Ponto Chave: Base de Cálculo</p>
                            <p>O valor do **IPI não entra** (não é somado) na formação da Base de Cálculo da antecipação.</p>
                            {/* Exemplo de fórmula com KaTeX - adicione a biblioteca KaTeX ao seu projeto se necessário */}
                            <p className="font-mono mt-2">BC = Vl. Mercadoria + Frete + Outras Desp.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-xs uppercase">Fórmula do Valor a Pagar:</p>
                            <div className="p-2 mt-1 bg-background rounded-md font-mono text-xs leading-relaxed">
                                <p>BC Dest. = (BC - (BC × Alíq. Inter)) / (1 - Alíq. Destino)</p>
                                <p>Débito = BC Dest. × Alíq. Destino</p>
                                <p>Crédito = BC × Alíq. Interestadual</p>
                                <p className="font-bold">Valor a Pagar = Débito - Crédito</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: DIFAL de Uso e Consumo */}
                    <div className="border rounded-lg p-4 bg-secondary/30 space-y-4">
                        <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <span className="bg-green-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">2</span>
                            DIFAL (Uso, Consumo ou Ativo)
                        </h4>
                        <p className="text-muted-foreground">
                            Para **qualquer empresa** (contribuinte de ICMS) que compra para **uso próprio, consumo ou ativo imobilizado**.
                        </p>
                        <div className="p-3 bg-constructive/10 text-constructive-foreground rounded-md text-xs border border-constructive/20">
                            <p className="font-semibold">Ponto Chave: Base de Cálculo</p>
                            <p>O valor do **IPI entra (soma)** na formação da Base de Cálculo do DIFAL.</p>
                            <p className="font-mono mt-2">BC = Vl. Mercadoria + IPI + Frete + Outras Desp.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-xs uppercase">Fórmula do Valor a Pagar:</p>
                            <div className="p-2 mt-1 bg-background rounded-md font-mono text-xs leading-relaxed">
                                <p className="font-bold">Valor a Pagar = BC × (Alíq. Destino - Alíq. Interestadual)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </details>
        </div>
    );
}