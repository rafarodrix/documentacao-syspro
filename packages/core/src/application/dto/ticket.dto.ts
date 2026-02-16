export interface TicketDTO {
    id: string;
    subject: string;
    status: 'Aberto' | 'Em Análise' | 'Resolvido' | 'Pendente';
    priority: 'Baixa' | 'Média' | 'Alta';
    date: string;
    lastUpdate?: string;
}