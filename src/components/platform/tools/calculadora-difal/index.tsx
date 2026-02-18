'use client';

import { useDifalCalculator } from './useDifalCalculator';
import { DifalResults } from './components/DifalResults';
import { DifalExplanation } from './components/DifalExplanation';
import { DifalStep1 } from './components/DifalStep1';
import { DifalStep2 } from './components/DifalStep2';

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