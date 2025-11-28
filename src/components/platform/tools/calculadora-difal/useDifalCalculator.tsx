import { useState, useMemo, ChangeEvent } from 'react';
import { CalculatorState, Finalidade, ResultadoCalculo } from './types';
import { parseCurrency, formatarMoedaInput, round, ALIQUOTAS_DESTINO } from './utils';

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

    const baseDeCalculo = useMemo(() => {
        const vp = parseCurrency(valores.produto);
        const vf = parseCurrency(valores.frete);
        const vod = parseCurrency(valores.outras);
        const vIpi = parseCurrency(valores.ipi);

        const bcComum = vp + vf + vod;
        const bcFinal = finalidade === 'consumo' ? bcComum + vIpi : bcComum;

        return {
            valor: bcFinal,
            formula: finalidade === 'consumo' ? "Produtos + Frete + Desp. + IPI" : "Produtos + Frete + Desp."
        };
    }, [valores.produto, valores.frete, valores.outras, valores.ipi, finalidade]);

    const resultados = useMemo((): ResultadoCalculo | null => {
        const bc = baseDeCalculo.valor;
        const alqInter = parseFloat(valores.aliqInterestadual) || 0;
        const alqDest = parseFloat(valores.aliqDestino) || 0;
        const pRed = parseFloat(valores.reducaoBC) || 0;

        if (bc === 0 || alqInter === 0 || alqDest === 0) return null;
        if (alqDest <= alqInter) return { type: 'difal', error: 'Alíquota de destino deve ser maior que a interestadual.' };

        if (finalidade === 'revenda') {
            const bcOrigem = round(bc * (1 - pRed / 100));
            const vCredito = round(bcOrigem * (alqInter / 100));
            const divisor = 1 - alqDest / 100;

            if (divisor <= 0) return { type: 'antecipacao', error: 'Alíquota de destino inválida.' };

            const bcDestino = round((bcOrigem - vCredito) / divisor);
            const vDebito = round(bcDestino * (alqDest / 100));
            const vAntecipacao = round(vDebito - vCredito);

            return { type: 'antecipacao', bcOrigem, vCredito, bcDestino, vDebito, vAntecipacao, error: null };
        } else {
            const bcReduzida = round(bc * (1 - pRed / 100));
            const diferencial = (alqDest - alqInter) / 100;
            const valorAPagar = round(bcReduzida * diferencial);

            return { type: 'difal', baseDeCalculo: bc, bcReduzida, diferencial, valorAPagar, error: null };
        }
    }, [baseDeCalculo.valor, valores.aliqInterestadual, valores.aliqDestino, valores.reducaoBC, finalidade]);

    return {
        valores, finalidade, baseDeCalculo, resultados,
        setFinalidade, handleChange, handleCurrencyChange, handleUfChange, limparTudo
    };
}