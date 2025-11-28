import {
    Calculator, X, Package, ArrowLeftRight, Scaling,
    ArrowRight, FileDigit, Archive, Percent, HelpCircle, LucideIcon
} from 'lucide-react';
import { ResultadoCalculo } from '../types';
import { formatCurrency } from '../utils';

// --- Sub-componente: Linha de Resultado ---
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
                    <div className="group relative flex items-center">
                        <HelpCircle size={13} className="cursor-help text-muted-foreground hover:text-primary transition-colors" />
                        {/* Tooltip simples via title nativo ou componente de tooltip do shadcn se tiver */}
                        <span className="sr-only">{tooltip}</span>
                    </div>
                )}
            </div>
        </div>
        <span className={`font-semibold text-sm ${valueColor}`}>{value}</span>
    </div>
);

// --- Sub-componente: Caixa de Total ---
const TotalBox = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center p-4 mt-4 rounded-lg bg-primary/10 border border-primary/20 text-primary">
        <div className="flex items-center gap-3">
            <FileDigit size={24} />
            <span className="text-lg font-bold">{label}</span>
        </div>
        <span className="text-lg font-bold">{value}</span>
    </div>
);

// --- Componente Principal ---
interface DifalResultsProps {
    resultados: ResultadoCalculo | null;
    reducaoBC: string;
}

export function DifalResults({ resultados, reducaoBC }: DifalResultsProps) {
    // 1. Estado Vazio (Sem dados)
    if (!resultados) {
        return (
            <div className="bg-card border-2 border-dashed rounded-lg p-8 text-center h-full flex flex-col items-center justify-center">
                <div className="p-3 bg-muted rounded-full mb-3">
                    <Calculator className="text-muted-foreground" size={32} />
                </div>
                <h3 className="text-md font-semibold">Aguardando dados</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                    Preencha os valores e alíquotas para ver o resultado.
                </p>
            </div>
        );
    }

    // 2. Estado de Erro
    if (resultados.error) {
        return (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center animate-in fade-in">
                <p className="text-destructive font-semibold flex items-center justify-center gap-2">
                    <X size={18} /> {resultados.error}
                </p>
            </div>
        );
    }

    // 3. Renderização dos Detalhes (Antecipação vs DIFAL)
    const isAntecipacao = resultados.type === 'antecipacao';

    return (
        <div className="bg-card border rounded-lg p-6 animate-in slide-in-from-bottom-2 duration-500 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                {isAntecipacao ? 'Resultado da Antecipação' : 'Resultado do DIFAL'}
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {isAntecipacao ? 'Revenda' : 'Uso/Consumo'}
                </span>
            </h3>

            <div className="space-y-3">
                {isAntecipacao ? (
                    // === LÓGICA DE REVENDA (IPI FORA) ===
                    <>
                        <ResultRow
                            icon={Package}
                            label="1. BC Origem"
                            value={formatCurrency(resultados.bcOrigem)}
                            tooltip="Soma dos produtos + despesas (IPI não incluso)"
                        />
                        <ResultRow
                            icon={ArrowLeftRight}
                            label="2. Crédito (ICMS Origem)"
                            value={formatCurrency(resultados.vCredito)}
                            valueColor="text-red-500"
                            tooltip="Valor do imposto destacado na nota de origem"
                        />
                        <ResultRow
                            icon={Scaling}
                            label="3. BC Destino Ajustada"
                            value={formatCurrency(resultados.bcDestino)}
                            tooltip="Base recalculada com a alíquota interna (Cálculo por dentro)"
                        />
                        <ResultRow
                            icon={ArrowRight}
                            label="4. Débito (ICMS Destino)"
                            value={formatCurrency(resultados.vDebito)}
                            valueColor="text-green-600"
                        />

                        <TotalBox label="Valor a Recolher:" value={formatCurrency(resultados.vAntecipacao)} />
                    </>
                ) : (
                    // === LÓGICA DE USO/CONSUMO (IPI DENTRO) ===
                    <>
                        <ResultRow
                            icon={Archive}
                            label="1. Base de Cálculo Total"
                            value={formatCurrency(resultados.baseDeCalculo)}
                            tooltip="Soma total da nota incluindo IPI"
                        />

                        {resultados.bcReduzida !== resultados.baseDeCalculo && (
                            <ResultRow
                                icon={Scaling}
                                label={`2. Base Reduzida (${reducaoBC}%)`}
                                value={formatCurrency(resultados.bcReduzida)}
                            />
                        )}

                        <ResultRow
                            icon={Percent}
                            label="Diferencial de Alíquotas"
                            value={`${(((resultados.diferencial ?? 0) * 100).toFixed(2)).replace('.', ',')}%`}
                            tooltip="Diferença entre a alíquota interna e a interestadual"
                        />

                        <TotalBox label="Valor do DIFAL:" value={formatCurrency(resultados.valorAPagar)} />
                    </>
                )}
            </div>
        </div>
    );
}