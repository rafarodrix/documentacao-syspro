// src/core/constants/sefaz-endpoints.ts

export const SEFAZ_ENDPOINTS = [
    { uf: 'MG', service: 'NFE', url: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NfeAutorizacao' },
    { uf: 'MG', service: 'NFCE', url: 'https://nfce.fazenda.mg.gov.br/w32/services/NfeAutorizacao4' },
    { uf: 'SP', service: 'NFE', url: 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx' },
    { uf: 'RS', service: 'NFE', url: 'https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx' },
    { uf: 'SVRS', service: 'NFE', url: 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx' },
] as const;

export type SefazConfig = typeof SEFAZ_ENDPOINTS[number];

/**
 * Analisa o tempo de resposta e o status HTTP para determinar a saúde do serviço.
 */
export function analyzeSefazResponse(latency: number, statusCode: number): 'ONLINE' | 'UNSTABLE' | 'OFFLINE' {
    // Se o servidor retornar erro de servidor (5xx), está offline
    if (statusCode >= 500) return 'OFFLINE';

    // Se a latência for maior que 2.5 segundos, consideramos instável
    // (A SEFAZ costuma responder entre 100ms e 800ms em condições normais)
    if (latency > 2500) return 'UNSTABLE';

    // Caso contrário, está operando normalmente
    return 'ONLINE';
}