export const STATUS_FILTER_OPTIONS = [
  { value: "OPEN", label: "Em aberto", countKey: "open" },
  { value: "PENDING", label: "Pendentes", countKey: "pending" },
  { value: "WAITING_CUSTOMER", label: "Aguardando cliente", countKey: "waitingCustomer" },
  { value: "RECEIVED", label: "Recebidas", countKey: "received" },
  { value: "SENT_TO_ACCOUNTING", label: "Enviadas", countKey: "sentToAccounting" },
  { value: "OVERDUE", label: "Atrasadas", countKey: "overdue" },
] as const;

export const ADVANCED_STATUS_FILTER_OPTIONS = [
  ...STATUS_FILTER_OPTIONS,
  { value: "ALL", label: "Todas", countKey: "total" },
  { value: "COMPLETED", label: "Concluidas", countKey: "completed" },
  { value: "CANCELED", label: "Canceladas", countKey: "canceled" },
] as const;

export const TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "Todos os tipos" },
  { value: "ROTINA_MENSAL", label: "Rotinas mensais" },
  { value: "TAREFA", label: "Tarefas avulsas" },
] as const;

export const ORIGIN_FILTER_OPTIONS = [
  { value: "ALL", label: "Todas as origens" },
  { value: "MONTHLY", label: "Rotina mensal" },
  { value: "MANUAL", label: "Manual" },
  { value: "TICKET", label: "Ticket" },
] as const;
