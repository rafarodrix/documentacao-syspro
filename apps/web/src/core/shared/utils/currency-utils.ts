export const formatCurrencyBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export const parseCurrencyBRL = (value: string): number => {
    const digitsOnly = value.replace(/\D/g, '');
    if (!digitsOnly) return 0;
    return Number(digitsOnly) / 100;
};