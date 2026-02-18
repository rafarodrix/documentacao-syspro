export const ALIQUOTAS_DESTINO: Record<string, string> = {
    'AC': '19', 'AL': '19', 'AP': '18', 'AM': '20', 'BA': '19', 'CE': '18', 'DF': '18', 'ES': '17',
    'GO': '17', 'MA': '20', 'MT': '17', 'MS': '17', 'MG': '18', 'PA': '17', 'PB': '18', 'PR': '19',
    'PE': '18', 'PI': '18', 'RJ': '20', 'RN': '18', 'RS': '17', 'RO': '17.5', 'RR': '17', 'SC': '17',
    'SP': '18', 'SE': '19', 'TO': '18'
};

export const UFS = Object.keys(ALIQUOTAS_DESTINO).sort();

export const formatCurrency = (value: number | null | undefined): string => {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const parseCurrency = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
};

export const formatarMoedaInput = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';
    const numberValue = parseFloat(digitsOnly) / 100;
    return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const round = (value: number): number => Math.round(value * 100) / 100;