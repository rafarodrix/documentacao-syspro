import { Briefcase, HelpCircle } from 'lucide-react';
import { PricingState, Segmento } from '../types';
import { BENCHMARKS } from '../constants';
import { formatCurrency, formatPercent, parseCurrency } from '@/lib/formatters';

interface Step1Props {
    valores: PricingState;
    segmento: Segmento;
    setSegmento: (v: Segmento) => void;
    handleCurrencyChange: any; // Tipar corretamente se preferir
    percentualCustoFixo: number;
}

export function Step1Custos({ valores, segmento, setSegmento, handleCurrencyChange, percentualCustoFixo }: Step1Props) {
    const limiares = BENCHMARKS[segmento];

    // Lógica visual simples
    const getStatus = (pct: number) => {
        if (pct < limiares.saudavel) return { color: 'green', label: 'Saudável', text: limiares.textoSaudavel };
        if (pct < limiares.atencao) return { color: 'amber', label: 'Atenção', text: limiares.textoAtencao };
        return { color: 'red', label: 'Perigoso', text: limiares.textoPerigoso };
    };

    const status = getStatus(percentualCustoFixo);

    return (
        <div className="bg-card border rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2"><Briefcase size={20} /> Passo 1: Custo Fixo Percentual</h3>

            <div className="my-4">
                <label className="font-medium text-muted-foreground text-sm">Seu segmento</label>
                <select
                    value={segmento}
                    onChange={(e) => setSegmento(e.target.value as Segmento)}
                    className="mt-1 w-full p-2 bg-background border rounded-md text-sm"
                >
                    <option value="varejo">Varejo</option>
                    <option value="industria">Indústria</option>
                    <option value="servicos">Serviços</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <label className="font-medium text-muted-foreground">Faturamento Médio</label>
                    <input
                        className="mt-1 w-full p-2 bg-background border rounded-md"
                        value={valores.faturamentoMedio}
                        onChange={handleCurrencyChange('faturamentoMedio')}
                        placeholder="Ex: 20.000,00"
                    />
                </div>
                <div>
                    <label className="font-medium text-muted-foreground flex items-center gap-1.5">
                        Despesas Fixas
                        <HelpCircle size={14} className="cursor-help text-muted-foreground/80" />
                    </label>
                    <input
                        className="mt-1 w-full p-2 bg-background border rounded-md"
                        value={valores.despesasFixasMensais}
                        onChange={handleCurrencyChange('despesasFixasMensais')}
                        placeholder="Ex: 3.000,00"
                    />
                </div>
            </div>

            {percentualCustoFixo > 0 && (
                <div className={`mt-4 p-4 border rounded-lg text-center bg-${status.color}-500/5 border-${status.color}-500/20`}>
                    <p className={`text-sm font-semibold text-${status.color}-600`}>Nível {status.label}</p>
                    <p className={`text-3xl font-bold my-1 text-${status.color}-500`}>{formatPercent(percentualCustoFixo)}</p>
                    <p className="text-xs text-muted-foreground mt-2">{status.text}</p>
                </div>
            )}
        </div>
    );
}