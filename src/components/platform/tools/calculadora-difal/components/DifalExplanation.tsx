import { HelpCircle, ChevronDown, Package, Archive, Check, X as XIcon } from 'lucide-react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface ExplanationCardProps {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    ipiStatus: 'include' | 'exclude';
    description: string;
    formula: string;
}

function ExplanationCard({ title, subtitle, icon: Icon, ipiStatus, description, formula }: ExplanationCardProps) {
    const isIncluded = ipiStatus === 'include';

    return (
        <div className="flex flex-col border rounded-lg overflow-hidden bg-card">
            {/* Cabeçalho do Card */}
            <div className="p-4 bg-secondary/30 border-b flex items-start justify-between gap-4">
                <div className="flex gap-3">
                    <div className="p-2 bg-background rounded-md border shadow-sm">
                        <Icon size={20} className="text-primary" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground text-sm">{title}</h4>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                </div>

                {/* Badge do IPI */}
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1 ${isIncluded
                        ? 'bg-orange-500/10 text-orange-600 border-orange-200'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                    }`}>
                    {isIncluded ? <Check size={10} strokeWidth={4} /> : <XIcon size={10} strokeWidth={4} />}
                    IPI na Base
                </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-4 flex-grow flex flex-col">
                <p className="text-xs text-muted-foreground leading-relaxed">
                    {description}
                </p>

                {/* Fórmula Visual */}
                <div className="mt-auto pt-2">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 text-center">
                        Como a Base é formada:
                    </div>
                    <div className="bg-secondary/50 rounded-md p-2 text-center text-xs font-medium border border-border/50">
                        {isIncluded
                            ? "Produtos + Frete + Desp. + IPI"
                            : "Produtos + Frete + Desp."}
                    </div>

                    <div className="mt-3">
                        <BlockMath math={formula} />
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
                <p className="text-muted-foreground mb-6 text-center max-w-2xl mx-auto">
                    O objetivo é igualar a carga tributária. A diferença principal está na composição da <strong>Base de Cálculo</strong>:
                    o IPI deve ser somado à base apenas quando a mercadoria é para consumo final.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Cenário 1: Revenda */}
                    <ExplanationCard
                        title="Revenda / Industrialização"
                        subtitle="Antecipação Parcial"
                        icon={Package}
                        ipiStatus="exclude"
                        description="Para empresas do Simples Nacional que compram para revender. O IPI é removido da base antes de calcular o imposto."
                        formula={`BC_{Dest} = \\frac{BC_{Origem}}{1 - Alíq_{Dest}}`}
                    />

                    {/* Cenário 2: Consumo */}
                    <ExplanationCard
                        title="Uso / Consumo / Ativo"
                        subtitle="DIFAL Padrão"
                        icon={Archive}
                        ipiStatus="include"
                        description="Para qualquer empresa que compra materiais para uso próprio. O IPI faz parte do custo, logo, entra na base do imposto."
                        formula={`Pagar = BC_{Total} \\times (Alíq_{Dest} - Alíq_{Inter})`}
                    />

                </div>
            </div>
        </details>
    );
}