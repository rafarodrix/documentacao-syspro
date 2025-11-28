'use client';

import { usePricingCalculator } from './usePricingCalculator';
import { Step1Custos } from './components/Step1Custos';
import { Step2Precificacao } from './components/Step2Precificacao';
import { PricingResults } from './components/PricingResults';
import { PricingExplanation } from './components/PricingExplanation';

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