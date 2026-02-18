// components/danfe-visualizer/utils.ts
export const formatCurrency = (v?: number | null) => v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00';
export const formatNumber = (v?: number | null) => v != null ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0,00';
export const formatPercent = (v?: number | null) => (v != null ? `${v.toFixed(2)}%` : '-');
export const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short'}) : '-');