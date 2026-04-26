export type AppRole = "ADMIN" | "DEVELOPER" | "SUPORTE" | "CLIENTE_ADMIN" | "CLIENTE_USER";

export const APP_ROLES: AppRole[] = ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN", "CLIENTE_USER"];
export const SYSTEM_ROLES: AppRole[] = ["ADMIN", "DEVELOPER", "SUPORTE"];
export const CLIENT_ROLES: AppRole[] = ["CLIENTE_ADMIN", "CLIENTE_USER"];
export const CADASTRO_MANAGER_ROLES: AppRole[] = ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"];

export const CADASTROS_ROUTE_RULES = {
  root: {
    blocked: ["CLIENTE_USER"],
    redirectIfBlocked: "/portal",
    redirectIfAllowed: "/portal/cadastros/empresa",
  },
  empresa: {
    pathPrefix: "/portal/cadastros/empresa",
    allowed: CADASTRO_MANAGER_ROLES,
    redirectIfBlocked: "/portal",
  },
  usuarios: {
    pathPrefix: "/portal/cadastros/usuarios",
    allowed: CADASTRO_MANAGER_ROLES,
    redirectIfBlocked: "/portal",
  },
  contatos: {
    pathPrefix: "/portal/contatos",
    allowed: CADASTRO_MANAGER_ROLES,
    redirectIfBlocked: "/portal",
  },
  sistema: {
    pathPrefix: "/portal/cadastros/sistema",
    allowed: SYSTEM_ROLES,
    redirectIfBlocked: "/portal",
  },
} as const;

export const DOCS_ROUTE_RULES = {
  technical: {
    pathPrefix: "/portal/docs/manuais-tecnicos",
    allowed: SYSTEM_ROLES,
    redirectIfBlocked: "/portal/docs",
  },
} as const;

export const SIDEBAR_ROLE_RULES = {
  chamadosCliente: ["CLIENTE_ADMIN", "CLIENTE_USER"],
  chamadosSistema: SYSTEM_ROLES,
  cadastroEmpresa: CADASTRO_MANAGER_ROLES,
  cadastroUsuarios: CADASTRO_MANAGER_ROLES,
  cadastroContatos: CADASTRO_MANAGER_ROLES,
  docsTechnical: SYSTEM_ROLES,
  contratos: ["ADMIN"],
} as const;

export function hasAllowedRole(role: string, allowed: readonly AppRole[]): boolean {
  return allowed.includes(role as AppRole);
}
