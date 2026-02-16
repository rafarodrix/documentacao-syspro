// src/components/tools/calculadora-precificacao/usePricingCalculator.ts

import { useState, useMemo, ChangeEvent } from 'react';
import { PricingState, Segmento, ModoCalculo, PricingResult } from '@/components/platform/tools/calculadora-precificacao/types';
import { calculatePricing } from '@/components/platform/tools/calculadora-precificacao/calculations';
import { parseCurrency, formatarMoedaInput } from '@/lib/formatters';

export function usePricingCalculator() {
    const [valores, setValores] = useState<PricingState>({
        faturamentoMedio: '',
        despesasFixasMensais: '',
        custoAquisicao: '',
        precoVenda: '',
        impostosVenda: '',
        lucroLiquidoDesejado: '',
        margemLiquidaDesejada: ''
    });

    const [segmento, setSegmento] = useState<Segmento>('varejo');
    const [modoCalculo, setModoCalculo] = useState<ModoCalculo>('venda');

    // --- Handlers ---
    const handleCurrencyChange = (campo: keyof PricingState) => (e: ChangeEvent<HTMLInputElement>) => {
        setValores(prev => ({ ...prev, [campo]: formatarMoedaInput(e.target.value) }));
    };

    const handleSimpleChange = (campo: keyof PricingState) => (e: ChangeEvent<HTMLInputElement>) => {
        setValores(prev => ({ ...prev, [campo]: e.target.value }));
    };

    const handleClear = () => {
        setValores({
            faturamentoMedio: '', despesasFixasMensais: '', custoAquisicao: '', precoVenda: '',
            impostosVenda: '', lucroLiquidoDesejado: '', margemLiquidaDesejada: ''
        });
        setSegmento('varejo');
        setModoCalculo('venda');
    };

    // --- Derived State ---
    const percentualCustoFixo = useMemo(() => {
        const fat = parseCurrency(valores.faturamentoMedio);
        const desp = parseCurrency(valores.despesasFixasMensais);
        if (fat === 0) return 0;
        return (desp / fat) * 100;
    }, [valores.faturamentoMedio, valores.despesasFixasMensais]);

    const resultados = useMemo((): PricingResult | null => {
        return calculatePricing({
            custo: parseCurrency(valores.custoAquisicao),
            pImpostos: parseFloat(valores.impostosVenda) || 0,
            pCustoFixo: percentualCustoFixo,
            precoVendaInput: parseCurrency(valores.precoVenda),
            lucroDesejadoInput: parseCurrency(valores.lucroLiquidoDesejado),
            margemDesejadaInput: parseFloat(valores.margemLiquidaDesejada.replace(',', '.')) || 0,
            modo: modoCalculo
        });
    }, [valores, percentualCustoFixo, modoCalculo]);

    return {
        valores, segmento, modoCalculo, percentualCustoFixo, resultados,
        setSegmento, setModoCalculo, handleCurrencyChange, handleSimpleChange, handleClear
    };
}