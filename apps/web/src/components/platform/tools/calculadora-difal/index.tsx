'use client';

import { useDifalCalculator } from './use-difal-calculator';
import { DifalResults } from './components/difal-results';
import { DifalExplanation } from './components/difal-explanation';
import { DifalStep1 } from './components/difal-step1';
import { DifalStep2 } from './components/difal-step2';

export function CalculadoraDifal() {
    const {
        valores, finalidade, baseDeCalculo, resultados,
        setFinalidade, handleChange, handleCurrencyChange, handleUfChange, limparTudo
    } = useDifalCalculator();

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* Componente 1: Dados da Nota e Finalidade */}
            <DifalStep1
                valores={valores}
                finalidade={finalidade}
                setFinalidade={setFinalidade}
                handleCurrencyChange={handleCurrencyChange}
                baseDeCalculo={baseDeCalculo}
            />

            {/* Componente 2: Configuração de Impostos */}
            <DifalStep2
                valores={valores}
                handleChange={handleChange}
                handleUfChange={handleUfChange}
                limparTudo={limparTudo}
            />

            {/* Componente 3: Resultados */}
            <DifalResults
                resultados={resultados}
                finalidade={finalidade}
            />

            {/* Componente 4: Teoria/Explicação */}
            <DifalExplanation />

        </div>
    );
}
