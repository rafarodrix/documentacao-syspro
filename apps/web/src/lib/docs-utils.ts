/**
 * Utilitários compartilhados do módulo de documentação.
 *
 * Antes: funções soltas em page.tsx (estimateReadingTimeMinutes,
 * formatSlugLabel) e lógica de datas replicada em DocsHomePage.
 */

// ---------------------------------------------------------------------------
// Leitura / tempo estimado
// ---------------------------------------------------------------------------

/**
 * Estima o tempo de leitura em minutos com base no texto do conteúdo.
 * Assume 220 palavras por minuto.
 */
export function estimateReadingTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

// ---------------------------------------------------------------------------
// Formatação de strings / slugs
// ---------------------------------------------------------------------------

/**
 * Converte um segmento de slug em label legível.
 * Ex.: "manuais-tecnicos" → "Manuais Tecnicos"
 */
export function formatSlugLabel(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// ---------------------------------------------------------------------------
// Formatação de datas
// ---------------------------------------------------------------------------

/**
 * Formata uma string ISO como data longa em pt-BR.
 * Ex.: "2024-03-15" → "15 de março de 2024"
 * Retorna `null` para valores inválidos.
 */
export function formatDateLong(date?: string): string | null {
  if (!date) return null;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(value);
}

/**
 * Formata uma string ISO como data média em pt-BR.
 * Ex.: "2024-03-15" → "15 de mar. de 2024"
 */
export function formatDateMedium(date?: string): string | null {
  if (!date) return null;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(value);
}

/**
 * Formata um timestamp Unix como data e hora curtas em pt-BR.
 * Ex.: 1710499200000 → "15/03/2024 10:30"
 */
export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

/**
 * Parseia uma string de data para timestamp numérico.
 * Retorna 0 para valores inválidos ou ausentes.
 */
export function parseDate(date?: string): number {
  if (!date) return 0;
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? 0 : parsed;
}
