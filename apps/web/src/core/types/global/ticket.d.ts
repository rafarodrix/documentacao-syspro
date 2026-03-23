export interface ZammadTicket {
    id: number;
    number: string; // O número protocolar (ex: 98231)
    title: string;
    state: string;  // ex: 'new', 'open', 'closed'
    priority: string; // ex: '1 low', '2 normal', '3 high'
    created_at: string;
    updated_at: string;
    customer_id: number;
}

// Interface simplificada para usar na nossa UI
export interface TicketDTO {
    id: string;
    subject: string;
    status: 'Aberto' | 'Em Análise' | 'Resolvido' | 'Pendente';
    priority: 'Baixa' | 'Média' | 'Alta';
    date: string;
}