'use client';

import { X } from 'lucide-react';
import { useDifalCalculator } from './useDifalCalculator';
import { DifalResults } from './components/DifalResults';
import { DifalExplanation } from './components/DifalExplanation';
import { formatCurrency, UFS } from './utils';

export function CalculadoraDifal() {
    const {
        valores, finalidade, baseDeCalculo, resultados,
        setFinalidade, handleChange, handleCurrencyChange, handleUfChange, limparTudo
    } = useDifalCalculator();

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* --- PASSO 1: FORMULÁRIO --- */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2"><span className="text-primary">1.</span> Composição da Base de Cálculo</h3>

                <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground">Qual a finalidade?</label>
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-md p-1 bg-secondary">
                        {(['revenda', 'consumo'] as const).map((tipo) => (
                            <button
                                key={tipo}
                                onClick={() => setFinalidade(tipo)}
                                className={`px-3 py-1.5 rounded text-sm transition-colors ${finalidade === tipo ? 'bg-primary text-primary-foreground font-semibold shadow' : 'hover:bg-background/50'
                                    }`}
                            >
                                {tipo === 'revenda' ? 'Revenda / Industrialização' : 'Uso, Consumo ou Ativo'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div><label>Valor Produtos</label><input type="text" inputMode="decimal" placeholder="1.000,00" value={valores.produto} onChange={handleCurrencyChange('produto')} className="mt-1 w-full p-2 bg-background border rounded-md" /></div>
                    <div><label>Valor Frete</label><input type="text" inputMode="decimal" placeholder="100,00" value={valores.frete} onChange={handleCurrencyChange('frete')} className="mt-1 w-full p-2 bg-background border rounded-md" /></div>
                    <div><label>Outras Despesas</label><input type="text" inputMode="decimal" placeholder="50,00" value={valores.outras} onChange={handleCurrencyChange('outras')} className="mt-1 w-full p-2 bg-background border rounded-md" /></div>
                    <div>
                        <label className={finalidade === 'revenda' ? 'text-muted-foreground/50' : ''}>Valor IPI</label>
                        <input type="text" inputMode="decimal" placeholder="0,00" value={valores.ipi} onChange={handleCurrencyChange('ipi')} disabled={finalidade === 'revenda'} className={`mt-1 w-full p-2 bg-background border rounded-md ${finalidade === 'revenda' ? 'bg-muted/50 cursor-not-allowed' : ''}`} />
                    </div>
                </div>

                {baseDeCalculo.valor > 0 && (
                    <div className="mt-4 p-3 bg-secondary rounded-lg text-center animate-in fade-in slide-in-from-top-2">
                        <p className="text-sm text-muted-foreground">Base de Cálculo Total ({baseDeCalculo.formula})</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(baseDeCalculo.valor)}</p>
                    </div>
                )}
            </div>

            {/* --- PASSO 2: ALÍQUOTAS --- */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2"><span className="text-primary">2.</span> Alíquotas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                        <label>Alíq. Inter</label>
                        <select value={valores.aliqInterestadual} onChange={e => handleChange('aliqInterestadual', e.target.value)} className="mt-1 w-full p-2 bg-background border rounded-md">
                            <option value="12">12% (Padrão)</option><option value="7">7%</option><option value="4">4% (Importados)</option>
                        </select>
                    </div>
                    <div>
                        <label>UF Destino</label>
                        <select value={valores.ufDestino} onChange={handleUfChange} className="mt-1 w-full p-2 bg-background border rounded-md">
                            <option value="">Selecione...</option>{UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                        </select>
                    </div>
                    <div><label>Alíq. Destino (%)</label><input type="number" placeholder="18" value={valores.aliqDestino} onChange={e => handleChange('aliqDestino', e.target.value)} className="mt-1 w-full p-2 bg-background border rounded-md" /></div>
                    <div><label className="flex items-center gap-1">Redução BC (%)</label><input type="number" placeholder="0" value={valores.reducaoBC} onChange={e => handleChange('reducaoBC', e.target.value)} className="mt-1 w-full p-2 bg-background border rounded-md" /></div>
                </div>
                <div className="flex justify-end mt-4">
                    <button onClick={limparTudo} className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1"><X size={16} /> Limpar Tudo</button>
                </div>
            </div>

            {/* --- RESULTADOS --- */}
            <DifalResults resultados={resultados} reducaoBC={valores.reducaoBC} />

            {/* --- EXPLICAÇÃO --- */}
            <DifalExplanation />
        </div>
    );
}