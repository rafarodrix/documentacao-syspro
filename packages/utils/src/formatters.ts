//Converte um número para o formato monetário brasileiro. Ex.: 1234.5 ? "R$ 1.234,50"
export const formatCurrency = (value: number | null | undefined): string => {
    if (value == null || isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

//Converte um texto no formato de moeda (ex.: "1.234,56") para número. Remove pontos e substitui vírgula por ponto antes de aplicar parseFloat. Ex.: "1.234,56" ? 1234.56
export const parseCurrency = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
};

//Formata um valor digitado em um input de moeda. Mantém apenas dígitos, converte para número e retorna formatado com 2 casas decimais. Ex.: "123456" ? "1.234,56"
export const formatarMoedaInput = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';
    const numberValue = parseFloat(digitsOnly) / 100;
    return numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

//Formata um número como porcentagem no padrão brasileiro. Ex.: 12.5 ? "12,50%"
export const formatPercent = (value: number): string => {
    if (isNaN(value)) return '0,00%';
    return `${(value || 0).toFixed(2).replace('.', ',')}%`;
};

//Arredonda um número para 2 casas decimais. Ex.: 12.345 ? 12.35
export const round = (value: number): number => {
    return Math.round(value * 100) / 100;
};

// Formata CNPJ: 00.000.000/0000-00
export function formatCNPJ(value: string) {
    return value
        .replace(/\D/g, "")
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .substr(0, 18)
}

// Formata CEP: 00000-000
export function formatCEP(value: string) {
    return value
        .replace(/\D/g, "")
        .replace(/^(\d{5})(\d)/, "$1-$2")
        .substr(0, 9)
}

// Formata Telefone: (00) 00000-0000
export function formatPhone(value: string) {
    const v = value.replace(/\D/g, "").substr(0, 11)
    if (v.length > 10) {
        return v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    }
    return v.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
}



