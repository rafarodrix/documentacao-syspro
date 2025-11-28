import {
    Calculator, X, Archive, Scaling, Percent,
    ArrowRight, ArrowLeftRight, FileDigit, HelpCircle, LucideIcon
} from 'lucide-react';
import { ResultadoCalculo } from '../types';
import { formatCurrency } from '@/lib/formatters';

interface ResultRowProps {
    icon: LucideIcon;
    label: string;
    value: string;
    tooltip?: string;
    valueColor?: string;
    subValue?: string;
}

const ResultRow = ({ icon: Icon, label, value, tooltip, valueColor = "text-foreground", subValue }: ResultRowProps) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 transition-colors hover:bg-secondary/70">
        <div className="flex items-center gap-3">
            <Icon size={20} className="text-muted-foreground flex-shrink-0" />
            <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{label}</span>
                    {tooltip && (
                        <span title={tooltip} className="flex"><HelpCircle size={13} className="cursor-help text-muted-foreground" /></span>
                    )}
                </div>
                {subValue && <span className="text-[10px] text-muted-foreground">{subValue}</span>}
            </div>
        </div>
        <span className={`font-semibold text-sm ${valueColor}`}>{value}</span>
    </div>
);

interface DifalResultsProps {
    resultados: ResultadoCalculo | null;
    finalidade: 'revenda' | 'consumo';
    reducaoBC: string;
}

export function DifalResults({ resultados, finalidade, reducaoBC }: DifalResultsProps) {
    if (!resultados) {
        return (
            <div className="bg-card border-2 border-dashed rounded-lg p-8 text-center h-full flex flex-col items-center justify-center">
                <div className="p-3 bg-muted rounded-full mb-3"><Calculator className="text-muted-foreground" size={32} /></div>
                <h3 className="text-md font-semibold">Aguardando dados</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">Preencha os valores para calcular.</p>
            </div>
        );
    }

    if (resultados.error) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center animate-in fade-in">
                <p className="text-destructive font-semibold flex items-center justify-center gap-2"><X size={18} /> {resultados.error}</p>
            </div>
        );
    }

    return (
        <div className="bg-card border rounded-lg p-6 animate-in slide-in-from-bottom-2 duration-500 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                Resultado do Cálculo
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">
                    {finalidade}
                </span>
            </h3>

            <div className="space-y-3">
                {/* 1. Base de Cálculo */}
                <ResultRow
                    icon={Archive}
                    label="1. Base de Cálculo"
                    value={formatCurrency(resultados.baseOriginal)}
                    tooltip={finalidade === 'consumo' ? "Inclui IPI" : "Não inclui IPI"}
                />

                {/* 2. Redução (Se houver) */}
                {resultados.baseReduzida !== resultados.baseOriginal && (
                    <ResultRow
                        icon={Scaling}
                        label={`2. Base Reduzida (${reducaoBC}%)`}
                        value={formatCurrency(resultados.baseReduzida)}
                    />
                )}

                {/* 3. Memória de Cálculo (Débito x Crédito) */}
                <div className="grid grid-cols-2 gap-3 my-2">
                    <div className="p-2 bg-background rounded border border-border/50">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <ArrowRight size={12} /> Débito (Destino)
                        </div>
                        <div className="font-semibold text-sm text-green-600">
                            {formatCurrency(resultados.valorDebito)}
                        </div>
                    </div>
                    <div className="p-2 bg-background rounded border border-border/50">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <ArrowLeftRight size={12} /> Crédito (Origem)
                        </div>
                        <div className="font-semibold text-sm text-red-500">
                            {formatCurrency(resultados.valorCredito)}
                        </div>
                    </div>
                </div>

                {/* 4. Diferencial */}
                <ResultRow
                    icon={Percent}
                    label="Diferencial de Alíquota"
                    value={`${resultados.diferencialPct.toFixed(2).replace('.', ',')}%`}
                />

                {/* 5. Total */}
                <div className="flex justify-between items-center p-4 mt-4 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <div className="flex items-center gap-3">
                        <FileDigit size={24} />
                        <span className="text-lg font-bold">Valor a Pagar:</span>
                    </div>
                    <span className="text-lg font-bold">{formatCurrency(resultados.valorAPagar)}</span>
                </div>
            </div>
        </div>
    );
}