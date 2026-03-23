export const formatCurrency = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
};

export const formatCurrencyInput = (value: string): string => {
  if (!value) return "";
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  const numberValue = parseFloat(digitsOnly) / 100;
  return numberValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatarMoedaInput = formatCurrencyInput;

export const formatPercent = (value: number): string => {
  if (Number.isNaN(value)) return "0,00%";
  return `${(value || 0).toFixed(2).replace(".", ",")}%`;
};

export const round = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export function formatCNPJ(value: string) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

export function formatCEP(value: string) {
  return value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
}

export function formatPhone(value: string) {
  const normalized = value.replace(/\D/g, "").slice(0, 11);
  if (normalized.length > 10) {
    return normalized.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return normalized.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}