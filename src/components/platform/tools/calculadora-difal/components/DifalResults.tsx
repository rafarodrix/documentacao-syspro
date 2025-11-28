import {
    Calculator, X, Archive, Scaling, ArrowRight, ArrowLeftRight,
    FileDigit, HelpCircle, LucideIcon, Package
} from 'lucide-react';
import { ResultadoCalculo } from '../types';
import { formatCurrency } from '@/lib/formatters';

interface ResultRowProps {
    icon: LucideIcon;
    label: string;
    value: string;
    tooltip?: string;
    valueColor?: string;
}

const ResultRow = ({ icon: Icon, label, value, tooltip, valueColor = "text-foreground" }: ResultRowProps) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 transition-colors hover:bg-secondary/70">
        <div className="flex items-center gap-3">
            <Icon size={20} className="text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{label}</span>
                {tooltip && (
                    <span title={tooltip} className="flex"><HelpCircle size={13} className="cursor-help text-muted-foreground" /></span>
                )}
            </div>
        </div>
        <span className={`font-semibold text-sm ${valueColor}`}>{value}</span>
    </div>
);

interface DifalResultsProps {
    resultados: ResultadoCalculo | null;
    finalidade: 'revenda' | 'consumo';
}

export function DifalResults({ resultados, finalidade }: DifalResultsProps) {
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
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Resultado do Cálculo</h3>
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize border border-border">
                    {finalidade}
                </span>
            </div>

            <div className="space-y-3">
                {/* 1. Base Original */}
                <ResultRow
                    icon={Archive}
                    label="1. Base de Cálculo Origem"
                    value={formatCurrency(resultados.baseOriginal)}
                    tooltip={finalidade === 'consumo' ? "Inclui IPI" : "Não inclui IPI"}
                />

                {/* 2. Base Reduzida (se houver) */}
                {resultados.baseReduzida !== resultados.baseOriginal && (
                    <ResultRow
                        icon={Scaling}
                        label="Base Reduzida"
                        value={formatCurrency(resultados.baseReduzida)}
                    />
                )}

                {/* 3. Crédito */}
                <ResultRow
                    icon={ArrowLeftRight}
                    label="2. Crédito (ICMS Origem)"
                    value={formatCurrency(resultados.vCredito)}
                    valueColor="text-red-500"
                    tooltip="Valor do imposto destacado na nota de origem"
                />

                {/* 4. Base Destino (Gross-up) */}
                <ResultRow
                    icon={Package}
                    label="3. Base de Cálculo Destino"
                    value={formatCurrency(resultados.bcDestino)}
                    tooltip="Base recalculada 'por dentro' (Gross-up)"
                />

                {/* 5. Débito */}
                <ResultRow
                    icon={ArrowRight}
                    label="4. Débito (ICMS Destino)"
                    value={formatCurrency(resultados.vDebito)}
                    valueColor="text-green-600"
                    tooltip="Imposto total devido ao estado de destino"
                />

                {/* 6. Total */}
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