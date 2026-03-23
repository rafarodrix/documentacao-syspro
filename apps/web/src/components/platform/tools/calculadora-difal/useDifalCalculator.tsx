import { useState, useMemo, ChangeEvent } from 'react';
import { CalculatorState, Finalidade, ResultadoCalculo } from './types';
import { ALIQUOTAS_DESTINO } from './constants';
import { calcularBaseTotal, calcularDifalPorDentro } from './calculations';
import { parseCurrency, formatarMoedaInput } from '@/lib/formatters';

export function useDifalCalculator() {
    const [valores, setValores] = useState<CalculatorState>({
        produto: '', frete: '', outras: '', ipi: '',
        aliqInterestadual: '12', ufDestino: '', aliqDestino: '', reducaoBC: ''
    });

    const [finalidade, setFinalidade] = useState<Finalidade>('revenda');

    const handleChange = (campo: keyof CalculatorState, valor: string) => {
        setValores(prev => ({ ...prev, [campo]: valor }));
    };

    const handleCurrencyChange = (campo: keyof CalculatorState) => (e: ChangeEvent<HTMLInputElement>) => {
        handleChange(campo, formatarMoedaInput(e.target.value));
    };

    const handleUfChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const uf = e.target.value;
        setValores(prev => ({
            ...prev,
            ufDestino: uf,
            aliqDestino: ALIQUOTAS_DESTINO[uf] || ''
        }));
    };

    const limparTudo = () => {
        setValores({
            produto: '', frete: '', outras: '', ipi: '',
            aliqInterestadual: '12', ufDestino: '', aliqDestino: '', reducaoBC: ''
        });
        setFinalidade('revenda');
    };

    const numeros = useMemo(() => ({
        vp: parseCurrency(valores.produto),
        vf: parseCurrency(valores.frete),
        vod: parseCurrency(valores.outras),
        vIpi: parseCurrency(valores.ipi),
        alqInter: parseFloat(valores.aliqInterestadual) || 0,
        alqDest: parseFloat(valores.aliqDestino) || 0,
        pRed: parseFloat(valores.reducaoBC) || 0,
    }), [valores]);

    const baseDeCalculo = useMemo(() => {
        return calcularBaseTotal(numeros.vp, numeros.vf, numeros.vod, numeros.vIpi, finalidade);
    }, [numeros, finalidade]);

    const resultados = useMemo((): ResultadoCalculo | null => {
        const bc = baseDeCalculo.valor;
        if (bc === 0 || numeros.alqInter === 0 || numeros.alqDest === 0) return null;

        if (numeros.alqDest <= numeros.alqInter) {
            return {
                error: 'Alíquota de destino deve ser maior que a interestadual.',
                baseOriginal: 0, baseReduzida: 0, vCredito: 0, bcDestino: 0, vDebito: 0, valorAPagar: 0
            };
        }

        // AGORA SEMPRE USA O CÁLCULO POR DENTRO (Gross-up)
        return calcularDifalPorDentro(bc, numeros.alqInter, numeros.alqDest, numeros.pRed);

    }, [baseDeCalculo, numeros]);

    return {
        valores, finalidade, baseDeCalculo, resultados,
        setFinalidade, handleChange, handleCurrencyChange, handleUfChange, limparTudo
    };
}