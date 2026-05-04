'use client';

import { usePricingCalculator } from './use-pricing-calculator';
import { Step1Custos } from './components/step1-custos';
import { Step2Precificacao } from './components/step2-precificacao';
import { PricingResults } from './components/pricing-results';
import { PricingExplanation } from './components/pricing-explanation';

export function CalculadoraPrecificacao() {
    const {
        valores, segmento, modoCalculo, percentualCustoFixo, resultados,
        setSegmento, setModoCalculo, handleCurrencyChange, handleSimpleChange, handleClear
    } = usePricingCalculator();

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Step1Custos
                valores={valores}
                segmento={segmento}
                setSegmento={setSegmento}
                handleCurrencyChange={handleCurrencyChange}
                percentualCustoFixo={percentualCustoFixo}
            />

            <Step2Precificacao
                valores={valores}
                modoCalculo={modoCalculo}
                setModoCalculo={setModoCalculo}
                handleCurrencyChange={handleCurrencyChange}
                handleSimpleChange={handleSimpleChange}
                resultados={resultados} // Para mostrar o preview dos valores calculados nos inputs
                handleClear={handleClear}
            />

            <PricingResults resultados={resultados} />

            <PricingExplanation />
        </div>
    );
}
