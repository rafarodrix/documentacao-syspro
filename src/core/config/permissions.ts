import { Role } from "@prisma/client";
import { ROLE_LABELS as APP_ROLE_LABELS } from "./role-labels";

export const ROLE_LABELS: Record<Role, string> = APP_ROLE_LABELS as Record<Role, string>;

export const SYSTEM_PERMISSIONS = {
  "dashboard:view": "Visualizar Dashboard",

  "companies:view": "Visualizar Lista de Empresas",
  "companies:create": "Cadastrar Nova Empresa",
  "companies:edit": "Editar Dados da Empresa",
  "companies:status": "Ativar/Desativar Empresa",

  "users:view": "Visualizar Lista de Usuários",
  "users:create": "Cadastrar/Convidar Usuário",
  "users:edit": "Editar Usuário",
  "users:reset_password": "Resetar Senha de Usuário",
  "users:status": "Ativar/Desativar Acesso",

  "system_team:view": "Visualizar Equipe Interna",
  "system_team:manage": "Gerenciar Equipe Interna",
} as const;

export type PermissionKey = keyof typeof SYSTEM_PERMISSIONS;
export type AccessControlMatrix = Record<Role, PermissionKey[]>;

export const ACCESS_MATRIX: AccessControlMatrix = {
  ADMIN: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],
  DEVELOPER: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],
  SUPORTE: [
    "dashboard:view",
    "companies:view",
    "companies:create",
    "companies:edit",
    "companies:status",
    "users:view",
    "users:create",
    "users:edit",
    "users:status",
    "users:reset_password",
    "system_team:view",
  ],
  CLIENTE_ADMIN: [
    "dashboard:view",
    "companies:view",
    "companies:edit",
    "users:view",
    "users:create",
    "users:edit",
    "users:status",
  ],
  CLIENTE_USER: ["dashboard:view"],
};
