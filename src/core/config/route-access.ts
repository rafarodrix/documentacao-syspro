export const APP_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN", "CLIENTE_USER"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const SYSTEM_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE"] as const satisfies readonly AppRole[];
export const CADASTRO_MANAGER_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"] as const satisfies readonly AppRole[];

export const CADASTROS_ROUTE_RULES = {
  root: {
    blocked: ["CLIENTE_USER"] as const satisfies readonly AppRole[],
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

export const SIDEBAR_ROLE_RULES = {
  chamadosCliente: ["CLIENTE_ADMIN", "CLIENTE_USER"] as const satisfies readonly AppRole[],
  chamadosSistema: SYSTEM_ROLES,
  cadastroEmpresa: CADASTRO_MANAGER_ROLES,
  cadastroUsuarios: CADASTRO_MANAGER_ROLES,
  cadastroSistema: SYSTEM_ROLES,
  contratos: ["ADMIN"] as const satisfies readonly AppRole[],
} as const;

export function hasAllowedRole(role: string, allowed: readonly AppRole[]): boolean {
  return allowed.includes(role as AppRole);
}
