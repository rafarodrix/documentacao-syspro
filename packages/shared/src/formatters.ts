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

export function isValidCNPJ(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (base: string, factors: number[]) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base = digits.slice(0, 12);
  const firstDigit = calcDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calcDigit(`${base}${firstDigit}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits === `${base}${firstDigit}${secondDigit}`;
}

export const isValidCnpj = isValidCNPJ;

export function onlyDigits(value: string | number | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeCpf(value: string | number | null | undefined): string {
  return onlyDigits(value).slice(0, 11);
}

export function normalizeCnpj(value: string | number | null | undefined): string {
  return onlyDigits(value).slice(0, 14);
}

export function normalizeCep(value: string | number | null | undefined): string {
  return onlyDigits(value).slice(0, 8);
}

export function normalizeNcm(value: string | number | null | undefined): string {
  return onlyDigits(value).slice(0, 8);
}

export function normalizePhone(value: string | number | null | undefined): string {
  return onlyDigits(value);
}

export function formatCpf(value: string): string {
  const digits = onlyDigits(value);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function isValidCPF(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = onlyDigits(value);
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;

  const calcDigit = (base: string, factorStart: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (factorStart - i);
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base = digits.slice(0, 9);
  const firstDigit = calcDigit(base, 10);
  const secondDigit = calcDigit(`${base}${firstDigit}`, 11);
  return digits === `${base}${firstDigit}${secondDigit}`;
}

export const isValidCpf = isValidCPF;