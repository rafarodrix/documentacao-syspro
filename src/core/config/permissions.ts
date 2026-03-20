import { Role } from "@prisma/client";
import { ROLE_LABELS as APP_ROLE_LABELS } from "./role-labels";

export const ROLE_LABELS: Record<Role, string> = APP_ROLE_LABELS as Record<Role, string>;

export const SYSTEM_PERMISSIONS = {
  "dashboard:view": "Visualizar dashboard",
  "dashboard:stats_full": "Visualizar estatisticas completas",

  "companies:view": "Visualizar lista de empresas",
  "companies:view_all": "Visualizar todas as empresas",
  "companies:view_own": "Visualizar empresas da propria unidade",
  "companies:create": "Cadastrar nova empresa",
  "companies:status": "Ativar ou desativar empresa",

  "users:view": "Visualizar lista de usuarios",
  "users:view_all": "Visualizar todos os usuarios",
  "users:view_team": "Visualizar equipe da propria unidade",
  "users:create": "Cadastrar ou convidar usuario",
  "users:edit": "Editar usuario",
  "users:reset_password": "Resetar senha de usuario",
  "users:status": "Ativar ou desativar acesso",

  "contracts:view": "Visualizar contratos",
  "contracts:create": "Criar contrato",
  "contracts:edit": "Editar contrato",

  "settings:view": "Visualizar configuracoes",
  "settings:edit": "Editar configuracoes",

  "tools:view": "Acessar ferramentas",
  "tools:all": "Acessar todas as ferramentas",
  "tools:basic": "Acessar ferramentas basicas",

  "tickets:view_own": "Visualizar proprios chamados",
  "tickets:view_all": "Visualizar todos os chamados",
  "tickets:create": "Criar chamado",
  "tickets:manage": "Gerenciar chamados",

  "tax_reform:view": "Visualizar reforma tributaria",
  "tax_reform:manage": "Gerenciar dados da reforma tributaria",

  "system_team:view": "Visualizar equipe interna",
  "system_team:manage": "Gerenciar equipe interna",
} as const;

export type PermissionKey = keyof typeof SYSTEM_PERMISSIONS;
export type AccessControlMatrix = Record<Role, PermissionKey[]>;

export const ACCESS_MATRIX: AccessControlMatrix = {
  ADMIN: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],
  DEVELOPER: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],

  SUPORTE: [
    "dashboard:view",
    "dashboard:stats_full",
    "companies:view",
    "companies:view_all",
    "companies:create",
    "companies:status",
    "users:view",
    "users:view_all",
    "users:create",
    "users:edit",
    "users:status",
    "users:reset_password",
    "contracts:view",
    "contracts:edit",
    "settings:view",
    "tools:view",
    "tools:all",
    "tickets:view_all",
    "tickets:manage",
    "tax_reform:view",
    "system_team:view",
  ],

  CLIENTE_ADMIN: [
    "dashboard:view",
    "companies:view",
    "companies:view_own",
    "users:view",
    "users:view_team",
    "users:create",
    "users:edit",
    "users:status",
    "contracts:view",
    "tickets:view_own",
    "tickets:create",
    "tools:view",
    "tools:basic",
  ],

  CLIENTE_USER: [
    "dashboard:view",
    "tickets:view_own",
    "tickets:create",
    "tools:view",
    "tools:basic",
  ],
};
