import { HelpCircle, ChevronDown, Package, Archive, Check, X as XIcon } from 'lucide-react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface ExplanationCardProps {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    ipiStatus: 'include' | 'exclude';
    description: string;
}

function ExplanationCard({ title, subtitle, icon: Icon, ipiStatus, description }: ExplanationCardProps) {
    const isIncluded = ipiStatus === 'include';

    return (
        <div className="flex flex-col border rounded-lg overflow-hidden bg-card hover:border-primary/50 transition-colors">
            {/* Cabeçalho do Card */}
            <div className="p-4 bg-secondary/30 border-b flex items-start justify-between gap-4">
                <div className="flex gap-3">
                    <div className="p-2 bg-background rounded-md border shadow-sm h-fit">
                        <Icon size={20} className="text-primary" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground text-sm">{title}</h4>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                </div>

                {/* Badge do IPI (O grande diferencial) */}
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1 h-fit ${isIncluded
                        ? 'bg-orange-500/10 text-orange-600 border-orange-200'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                    }`}>
                    {isIncluded ? <Check size={10} strokeWidth={4} /> : <XIcon size={10} strokeWidth={4} />}
                    IPI na Base
                </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-4 flex-grow flex flex-col">
                <p className="text-xs text-muted-foreground leading-relaxed min-h-[40px]">
                    {description}
                </p>

                {/* Bloco Visual da Base */}
                <div className="mt-auto pt-2">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                        Composição da Base:
                    </div>
                    <div className={`rounded-md p-2 text-center text-xs font-mono border ${isIncluded ? 'bg-orange-500/5 border-orange-500/20 text-orange-700' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700'
                        }`}>
                        {isIncluded
                            ? "Produtos + Frete + Desp. + IPI"
                            : "Produtos + Frete + Desp."}
                    </div>

                    {/* Fórmula Unificada (Visualmente idêntica para reforçar que o cálculo é igual) */}
                    <div className="mt-3 opacity-70">
                        <div className="text-[10px] text-center mb-1 text-muted-foreground">Fórmula de Cálculo:</div>
                        <BlockMath math={`\\text{Difal} = \\text{Débito}_{Dest} - \\text{Crédito}_{Orig}`} />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function DifalExplanation() {
    return (
        <details className="mt-8 text-sm group bg-card border rounded-lg p-4 shadow-sm">
            <summary className="cursor-pointer font-semibold text-primary list-none flex items-center gap-2 select-none">
                <HelpCircle size={16} />
                Como o cálculo é feito?
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 ml-auto" />
            </summary>

            <div className="mt-4 border-t pt-4 animate-in fade-in slide-in-from-top-2">

                {/* Explicação Geral */}
                <div className="mb-6 text-center max-w-3xl mx-auto space-y-2">
                    <p className="text-muted-foreground">
                        O método de cálculo é o mesmo para ambos os casos (Cálculo "Por Dentro").
                    </p>
                    <p className="text-xs bg-muted inline-block px-3 py-1 rounded-full text-foreground/80 font-medium">
                        A única diferença está na formação da <strong>Base de Cálculo Inicial</strong>:
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Cenário 1: Revenda */}
                    <ExplanationCard
                        title="Revenda / Industrialização"
                        subtitle="Antecipação Parcial"
                        icon={Package}
                        ipiStatus="exclude"
                        description="O IPI não é considerado custo, pois será recuperado na venda posterior. Logo, é removido da base."
                    />

                    {/* Cenário 2: Consumo */}
                    <ExplanationCard
                        title="Uso / Consumo / Ativo"
                        subtitle="DIFAL Padrão"
                        icon={Archive}
                        ipiStatus="include"
                        description="O IPI é um custo definitivo para a empresa. Logo, ele deve ser somado para compor a base de cálculo."
                    />

                </div>
            </div>
        </details>
    );
}