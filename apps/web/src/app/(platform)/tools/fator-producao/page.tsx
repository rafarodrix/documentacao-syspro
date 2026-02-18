import { ProductionFactorCalculator } from "@/components/platform/tools/fator-producao/ProductionFactorCalculator";

export default function FatorProducaoPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Fator de Producao</h1>
            </div>
            <ProductionFactorCalculator />
        </div>
    );
}
