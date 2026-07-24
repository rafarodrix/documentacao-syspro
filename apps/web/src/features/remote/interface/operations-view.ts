export type OperationsView = "em_andamento" | "requer_acao" | "concluidas" | "falhas";

const OPERATIONS_VIEW_ALIASES: Record<string, OperationsView> = {
  em_andamento: "em_andamento",
  ativas: "em_andamento",
  active: "em_andamento",
  requer_acao: "requer_acao",
  concluidas: "concluidas",
  historico: "concluidas",
  falhas: "falhas",
};

export function parseOperationsView(value: string): OperationsView {
  const normalized = value.trim().toLowerCase();
  return OPERATIONS_VIEW_ALIASES[normalized] ?? "em_andamento";
}

export function operationsViewHref(view: OperationsView) {
  return `/portal/infraestrutura?tab=operacao&view=${view}`;
}
