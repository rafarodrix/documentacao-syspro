import type { AppRole } from "./route-access";

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Super Administrador",
  DEVELOPER: "Desenvolvedor",
  SUPORTE: "Suporte Técnico",
  CLIENTE_ADMIN: "Gestor da Conta",
  CLIENTE_USER: "Colaborador",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as AppRole] ?? role.replace(/_/g, " ").toLowerCase();
}