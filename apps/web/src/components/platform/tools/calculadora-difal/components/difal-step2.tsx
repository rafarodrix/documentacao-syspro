import { ChangeEvent } from 'react';
import { X } from 'lucide-react';
import { CalculatorState } from '../types';
import { UFS } from '../utils';

interface DifalStep2Props {
    valores: CalculatorState;
    handleChange: (campo: keyof CalculatorState, valor: string) => void;
    handleUfChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    limparTudo: () => void;
}

export function DifalStep2({ valores, handleChange, handleUfChange, limparTudo }: DifalStep2Props) {
    return (
        <div className="bg-card border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="text-primary font-mono bg-primary/10 w-6 h-6 rounded flex items-center justify-center text-sm">2</span>
                Definição de Alíquotas
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Alíq. Interestadual</label>
                    <select
                        value={valores.aliqInterestadual}
                        onChange={e => handleChange('aliqInterestadual', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="12">12% (Padrão)</option>
                        <option value="7">7% (Sul/Sudeste para Norte/Nordeste/CO)</option>
                        <option value="4">4% (Importados)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">UF Destino</label>
                    <select
                        value={valores.ufDestino}
                        onChange={handleUfChange}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="">Selecione...</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Alíq. Interna Destino (%)</label>
                    <input
                        type="number"
                        placeholder="18"
                        value={valores.aliqDestino}
                        onChange={e => handleChange('aliqDestino', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        Redução BC (%)
                    </label>
                    <input
                        type="number"
                        placeholder="0"
                        value={valores.reducaoBC}
                        onChange={e => handleChange('reducaoBC', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t">
                <button
                    onClick={limparTudo}
                    className="text-xs font-medium text-destructive hover:bg-destructive/10 px-3 py-2 rounded-md transition-colors flex items-center gap-2"
                >
                    <X size={14} /> Limpar Formulário
                </button>
            </div>
        </div>
    );
}