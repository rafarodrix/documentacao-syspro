import type { TaskItem } from "@dosc-syspro/contracts/tarefas";

export function getTaskStatusLabel(status: TaskItem["status"]): string {
  switch (status) {
    case "PENDING":
      return "Pendente";
    case "WAITING_CUSTOMER":
      return "Aguardando cliente";
    case "RECEIVED":
      return "Recebido";
    case "SENT_TO_ACCOUNTING":
      return "Enviado para contabilidade";
    case "COMPLETED":
      return "Concluido";
    case "OVERDUE":
      return "Atrasado";
    case "CANCELED":
      return "Cancelado";
    default:
      return status;
  }
}

export function getTaskStatusVariant(status: TaskItem["status"]) {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "OVERDUE":
      return "destructive" as const;
    case "SENT_TO_ACCOUNTING":
      return "info" as const;
    case "RECEIVED":
      return "warning" as const;
    case "WAITING_CUSTOMER":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export function getManualRequestStatusLabel(status: TaskItem["manualRequests"][number]["status"]): string {
  switch (status) {
    case "SENT":
      return "Enviado";
    case "FAILED":
      return "Falhou";
    default:
      return status;
  }
}

export function getManualRequestStatusVariant(status: TaskItem["manualRequests"][number]["status"]) {
  switch (status) {
    case "SENT":
      return "success" as const;
    case "FAILED":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function getTaskTypeLabel(type: TaskItem["type"]): string {
  return type === "ROTINA_MENSAL" ? "Rotina mensal" : "Tarefa avulsa";
}

export function getTaskTypeVariant(type: TaskItem["type"]) {
  return type === "ROTINA_MENSAL" ? ("secondary" as const) : ("outline" as const);
}
