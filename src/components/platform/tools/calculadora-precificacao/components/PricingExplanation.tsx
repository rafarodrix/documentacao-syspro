import { HelpCircle, ChevronDown, ShieldAlert, Percent, DollarSign, TrendingDown, Target } from 'lucide-react';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export function PricingExplanation() {
    return (
        <details className="mt-8 text-sm group bg-card border rounded-lg p-4 shadow-sm">
            <summary className="cursor-pointer font-semibold text-primary list-none flex items-center gap-2 select-none">
                <HelpCircle size={16} />
                Entendendo os Indicadores
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 ml-auto" />
            </summary>

            <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in text-muted-foreground">

                {/* Preço Mínimo */}
                <ExplanationItem
                    icon={ShieldAlert}
                    title="Preço Mínimo (Ponto de Equilíbrio)"
                    description="Também conhecido como PMZ. É o valor de venda onde o lucro é zero. Vender abaixo disso gera prejuízo real."
                    formula="PMZ = \frac{Custo}{1 - \frac{Impostos + CustoFixo\%}{100}}"
                />

                {/* Markup */}
                <ExplanationItem
                    icon={Percent}
                    title="Markup sobre o Custo"
                    description="Índice aplicado sobre o custo do produto para formar o preço de venda. Indica quanto o preço está acima do custo."
                    formula="Markup = \left( \frac{Venda}{Custo} - 1 \right) \times 100"
                />

                {/* Margem de Contribuição */}
                <ExplanationItem
                    icon={DollarSign}
                    title="Margem de Contribuição"
                    description="O valor que sobra da venda após pagar os custos variáveis (Produto + Impostos). É o que 'sobra' para pagar o aluguel e gerar lucro."
                    formula="MC = Venda - (Custo + Impostos)"
                />

                {/* Lucro Líquido */}
                <ExplanationItem
                    icon={Target}
                    title="Lucro Líquido"
                    description="O resultado final. O que realmente sobra no caixa após pagar fornecedores, governo e os custos fixos da empresa."
                    formula="Lucro = Margem~Contrib. - Despesas~Fixas"
                />

            </div>
        </details>
    );
}

// Helper local para os itens de explicação
const ExplanationItem = ({ icon: Icon, title, description, formula }: any) => (
    <div className="border rounded-lg p-4 bg-secondary/30 flex flex-col">
        <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2 text-sm">
            <Icon size={16} className="text-primary" /> {title}
        </h4>
        <p className="text-xs mb-3 leading-relaxed flex-grow">
            {description}
        </p>
        <div className="mt-auto bg-background p-2 rounded border border-border/50 text-xs overflow-x-auto">
            <BlockMath math={formula} />
        </div>
    </div>
);