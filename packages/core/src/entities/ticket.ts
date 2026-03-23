export type TicketStatus = "Aberto" | "Em Análise" | "Pendente" | "Resolvido";
export type TicketPriority = "Alta" | "Média" | "Baixa";

export interface Ticket {
  id: string;
  number: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  date: string;
  lastUpdate: string;
}