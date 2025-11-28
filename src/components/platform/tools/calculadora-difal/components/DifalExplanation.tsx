import { HelpCircle, ChevronDown, Repeat, ClipboardCheck } from 'lucide-react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export function DifalExplanation() {
    return (
        <details className="mt-8 text-sm group bg-card border rounded-lg p-4 shadow-sm">
            <summary className="cursor-pointer font-semibold text-primary list-none flex items-center gap-2">
                <HelpCircle size={16} /> Entenda a Diferença: Antecipação vs. DIFAL
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 ml-auto" />
            </summary>

            <div className="mt-4 border-t pt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in text-muted-foreground">
                {/* Card Antecipação */}
                <div className="border rounded-lg p-4 bg-secondary/30 space-y-4 flex flex-col">
                    <h4 className="text-base font-semibold text-foreground flex items-center gap-3">
                        <span className="bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                        <div>
                            Antecipação Parcial
                            <p className="text-xs font-normal text-muted-foreground">Para Revenda ou Industrialização</p>
                        </div>
                    </h4>
                    <div className="flex items-start gap-2 text-xs">
                        <Repeat size={18} className="text-primary mt-0.5 flex-shrink-0" />
                        <p>Aplicável a empresas do **Simples Nacional** ao comprar produtos de fora do estado para **revender**.</p>
                    </div>
                    <div className="p-3 bg-primary/10 text-primary-foreground rounded-md text-xs border border-primary/20">
                        <p className="font-semibold text-primary">Ponto Chave: IPI <strong className="uppercase">não entra</strong> na base.</p>
                    </div>

                    <div className="mt-1 p-3 bg-background rounded-md text-sm leading-relaxed text-center flex-grow flex flex-col items-center justify-center">
                        <BlockMath math={`BC_{Dest.} = \\frac{BC_{Origem} \\times (1 - Alíq_{Inter})}{1 - Alíq_{Dest.}}`} />
                        <div className="text-xs space-y-2 mt-2">
                            <BlockMath math={`Pagar = (BC_{Dest.} \\times Alíq_{Dest.}) - (BC_{Origem} \\times Alíq_{Inter})`} />
                        </div>
                    </div>
                </div>

                {/* Card Uso/Consumo */}
                <div className="border rounded-lg p-4 bg-secondary/30 space-y-4 flex flex-col">
                    <h4 className="text-base font-semibold text-foreground flex items-center gap-3">
                        <span className="bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                        <div>
                            DIFAL
                            <p className="text-xs font-normal text-muted-foreground">Para Uso, Consumo ou Ativo</p>
                        </div>
                    </h4>
                    <div className="flex items-start gap-2 text-xs">
                        <ClipboardCheck size={18} className="text-primary mt-0.5 flex-shrink-0" />
                        <p>Aplicável a **qualquer empresa** que compra para **uso próprio**.</p>
                    </div>
                    <div className="p-3 bg-primary/10 text-primary-foreground rounded-md text-xs border border-primary/20">
                        <p className="font-semibold text-primary">Ponto Chave: IPI <strong className="uppercase">entra</strong> na base.</p>
                    </div>
                    <div className="mt-1 p-3 bg-background rounded-md text-sm leading-relaxed text-center flex-grow flex items-center justify-center">
                        <BlockMath math={`Pagar = BC \\times (Alíq_{Dest.} - Alíq_{Inter})`} />
                    </div>
                </div>
            </div>
        </details>
    );
}