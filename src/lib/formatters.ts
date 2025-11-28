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