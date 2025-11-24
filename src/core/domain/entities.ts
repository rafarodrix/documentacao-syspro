// --- ENTIDADE: RELEASE NOTE ---

// Definimos os tipos permitidos de release para evitar erros de digitação
export type ReleaseType = 'feature' | 'bugfix' | 'improvement' | 'announcement';

export interface Release {
    id: string;
    type: ReleaseType; // Melhor que apenas string
    isoDate: string;   // Formato YYYY-MM-DD
    title: string;
    summary: string | null;
    link: string;      // Link para a página completa da release
    videoLink: string | null;
    tags: string[];
}

// --- ENTIDADE: TICKET (Unificando UserTicket e TicketDTO) ---

export type TicketStatus = 'Aberto' | 'Em Análise' | 'Resolvido' | 'Pendente';
export type TicketPriority = 'Baixa' | 'Média' | 'Alta';

export interface Ticket {
    id: string;        // Zammad usa números, mas string é mais seguro para IDs no frontend
    number: string;    // O número protocolar visível (ex: #4123)
    subject: string;   // Era 'title' no seu UserTicket, mas 'subject' é mais comum em tickets
    status: TicketStatus;
    priority: TicketPriority;
    lastUpdate: string; // ou 'date'
}

