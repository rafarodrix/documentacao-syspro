export type OperationsView = "em_andamento" | "requer_acao" | "concluidas" | "falhas";

export function parseOperationsView(value: string): OperationsView {
  return value === "requer_acao" || value === "concluidas" || value === "falhas" ? value : "em_andamento";
}
