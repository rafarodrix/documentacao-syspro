import { ChangeEvent } from 'react';
import { CalculatorState, Finalidade } from '../types';
import { formatCurrency } from '@/lib/formatters';

interface DifalStep1Props {
    valores: CalculatorState;
    finalidade: Finalidade;
    setFinalidade: (v: Finalidade) => void;
    handleCurrencyChange: (campo: keyof CalculatorState) => (e: ChangeEvent<HTMLInputElement>) => void;
    baseDeCalculo: { valor: number; formula: string };
}

export function DifalStep1({ valores, finalidade, setFinalidade, handleCurrencyChange, baseDeCalculo }: DifalStep1Props) {
    return (
        <div className="bg-card border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="text-primary font-mono bg-primary/10 w-6 h-6 rounded flex items-center justify-center text-sm">1</span>
                Composição da Base de Cálculo
            </h3>

            {/* Seletor de Finalidade */}
            <div className="mt-4">
                <label className="text-sm font-medium text-muted-foreground">Qual a finalidade?</label>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-md p-1 bg-secondary/50 border border-border/50">
                    {(['revenda', 'consumo'] as const).map((tipo) => (
                        <button
                            key={tipo}
                            onClick={() => setFinalidade(tipo)}
                            className={`px-3 py-1.5 rounded text-sm transition-all duration-200 font-medium ${finalidade === tipo
                                    ? 'bg-background text-primary shadow-sm ring-1 ring-border'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                        >
                            {tipo === 'revenda' ? 'Revenda / Industrialização' : 'Uso, Consumo ou Ativo'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Inputs de Valores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <InputGroup label="Valor Produtos" value={valores.produto} onChange={handleCurrencyChange('produto')} placeholder="1.000,00" />
                <InputGroup label="Valor Frete" value={valores.frete} onChange={handleCurrencyChange('frete')} placeholder="100,00" />
                <InputGroup label="Outras Despesas" value={valores.outras} onChange={handleCurrencyChange('outras')} placeholder="50,00" />

                <div className="flex flex-col gap-1.5">
                    <label className={`text-xs font-medium ${finalidade === 'revenda' ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                        Valor IPI
                    </label>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={valores.ipi}
                        onChange={handleCurrencyChange('ipi')}
                        disabled={finalidade === 'revenda'}
                        className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${finalidade === 'revenda' ? 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-70' : ''
                            }`}
                    />
                </div>
            </div>

            {/* Feedback Visual da Base */}
            {baseDeCalculo.valor > 0 && (
                <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg text-center animate-in fade-in slide-in-from-top-2">
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Base de Cálculo Total</p>
                    <p className="text-2xl font-bold text-primary tracking-tight">{formatCurrency(baseDeCalculo.valor)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono bg-background/50 inline-block px-2 py-0.5 rounded border border-border/50">
                        {baseDeCalculo.formula}
                    </p>
                </div>
            )}
        </div>
    );
}

// Pequeno Helper Local para limpar o JSX
const InputGroup = ({ label, value, onChange, placeholder }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <input
            type="text"
            inputMode="decimal"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
    </div>
);