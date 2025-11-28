import { Calculator, X, Package, ArrowLeftRight, Scaling, ArrowRight, FileDigit, Archive, Percent, HelpCircle } from 'lucide-react';
import { ResultadoCalculo } from '../types';
import { formatCurrency } from '../utils';

// Pequeno sub-componente local apenas para visualização
const ResultRow = ({ icon: Icon, label, value, tooltip, valueColor = "text-foreground" }: any) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
        <div className="flex items-center gap-3">
            <Icon size={20} className="text-muted-foreground flex-shrink-0" />
            <div className="flex items-center gap-1.5">
                <span>{label}</span>
                {tooltip && <span title={tooltip}><HelpCircle size={13} className="cursor-help text-muted-foreground" /></span>}
            </div>
        </div>
        <span className={`font-semibold ${valueColor}`}>{value}</span>
    </div>
);

interface DifalResultsProps {
    resultados: ResultadoCalculo | null;
    reducaoBC: string;
}

export function DifalResults({ resultados, reducaoBC }: DifalResultsProps) {
    if (!resultados) {
        return (
            <div className="bg-card border-2 border-dashed rounded-lg p-6 text-center">
                <Calculator className="mx-auto text-muted-foreground/80" size={32} />
                <h3 className="text-md font-semibold mt-2">Aguardando dados</h3>
                <p className="text-sm text-muted-foreground mt-1">Preencha os campos acima para calcular.</p>
            </div>
        );
    }

    return (
        <div className="bg-card border rounded-lg p-6 animate-fade-in shadow-sm">
            {resultados.error ? (
                <p className="text-center text-destructive font-semibold flex items-center justify-center gap-2">
                    <X size={18} /> {resultados.error}
                </p>
            ) : (
                <>
                    <h3 className="text-lg font-bold mb-4">
                        {resultados.type === 'antecipacao' ? 'Resultado da Antecipação Parcial' : 'Resultado do DIFAL'}
                    </h3>

                    <div className="space-y-3 text-sm">
                        {resultados.type === 'antecipacao' ? (
                            <>
                                <ResultRow icon={Package} label="1. Base de Cálculo Origem" value={formatCurrency(resultados.bcOrigem)} tooltip="Base da nota - redução" />
                                <ResultRow icon={ArrowLeftRight} label="2. Crédito (ICMS Inter)" value={formatCurrency(resultados.vCredito)} valueColor="text-red-500" tooltip="Valor destacado na nota" />
                                <ResultRow icon={Scaling} label="3. BC Destino ('Gross up')" value={formatCurrency(resultados.bcDestino)} tooltip="Base recalculada com imposto por dentro" />
                                <ResultRow icon={ArrowRight} label="4. Débito (ICMS Destino)" value={formatCurrency(resultados.vDebito)} valueColor="text-green-600" />

                                <div className="flex justify-between items-center p-4 mt-4 rounded-lg bg-primary/10 border border-primary/20 text-lg font-bold text-primary">
                                    <div className="flex items-center gap-3"><FileDigit size={24} /><span>Valor a Pagar:</span></div>
                                    <span>{formatCurrency(resultados.vAntecipacao)}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <ResultRow icon={Archive} label="1. Base de Cálculo Cheia" value={formatCurrency(resultados.baseDeCalculo)} />
                                {resultados.bcReduzida !== resultados.baseDeCalculo && (
                                    <ResultRow icon={Scaling} label={`2. Base Reduzida (${reducaoBC}%)`} value={formatCurrency(resultados.bcReduzida)} />
                                )}
                                <ResultRow icon={Percent} label="Diferencial de Alíquotas" value={`${(((resultados.diferencial ?? 0) * 100).toFixed(2)).replace('.', ',')}%`} />

                                <div className="flex justify-between items-center p-4 mt-4 rounded-lg bg-primary/10 border border-primary/20 text-lg font-bold text-primary">
                                    <div className="flex items-center gap-3"><FileDigit size={24} /><span>Valor do DIFAL:</span></div>
                                    <span>{formatCurrency(resultados.valorAPagar)}</span>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}