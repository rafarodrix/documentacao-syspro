import type { TicketModuleStatus } from "@dosc-syspro/contracts/ticket";

export const TICKET_HISTORY_PAGE_SIZE = 50;

export const statusOptions: Array<{ value: TicketModuleStatus; label: string }> = [
  { value: "TRIAGE", label: "Triagem" },
  { value: "IN_PROGRESS", label: "Em desenvolvimento" },
  { value: "TESTING", label: "Em testes" },
  { value: "WAITING_CUSTOMER", label: "Pendente cliente" },
  { value: "WAITING_INTERNAL", label: "Aguardando interno" },
  { value: "RESOLVED", label: "Resolvido" },
];
