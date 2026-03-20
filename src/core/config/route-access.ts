import type { Role } from "@prisma/client";

export const APP_ROLES: Role[] = ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN", "CLIENTE_USER"];
export type AppRole = Role;

export const SYSTEM_ROLES: Role[] = ["ADMIN", "DEVELOPER", "SUPORTE"];
export const CADASTRO_MANAGER_ROLES: Role[] = ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"];

export const CADASTROS_ROUTE_RULES = {
  root: {
    blocked: ["CLIENTE_USER"],
    redirectIfBlocked: "/app",
    redirectIfAllowed: "/app/cadastros/empresa",
  },
  empresa: {
    pathPrefix: "/app/cadastros/empresa",
    allowed: CADASTRO_MANAGER_ROLES,
    redirectIfBlocked: "/app",
  },
  usuarios: {
    pathPrefix: "/app/cadastros/usuarios",
    allowed: CADASTRO_MANAGER_ROLES,
    redirectIfBlocked: "/app",
  },
  sistema: {
    pathPrefix: "/app/cadastros/sistema",
    allowed: SYSTEM_ROLES,
    redirectIfBlocked: "/app",
  },
} as const;

export const DOCS_ROUTE_RULES = {
  technical: {
    pathPrefix: "/docs/manuais-tecnicos",
    allowed: SYSTEM_ROLES,
    redirectIfBlocked: "/docs",
  },
} as const;

export const SIDEBAR_ROLE_RULES = {
  chamadosCliente: ["CLIENTE_ADMIN", "CLIENTE_USER"],
  chamadosSistema: SYSTEM_ROLES,
  cadastroEmpresa: CADASTRO_MANAGER_ROLES,
  cadastroUsuarios: CADASTRO_MANAGER_ROLES,
  cadastroSistema: SYSTEM_ROLES,
  contratos: ["ADMIN"],
} as const;

export function hasAllowedRole(role: string | Role, allowed: readonly AppRole[]): boolean {
  return allowed.includes(role as AppRole);
}
