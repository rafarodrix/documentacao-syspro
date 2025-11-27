import { Role } from "@prisma/client";

// Mapeamento amigável das Roles
export const ROLE_LABELS: Record<Role, string> = {
    ADMIN: "Administrador",
    DEVELOPER: "Desenvolvedor",
    SUPORTE: "Suporte",
    CLIENTE_ADMIN: "Gestor (Cliente)",
    CLIENTE_USER: "Usuário (Cliente)",
};

// Definição das Permissões do Sistema
export const SYSTEM_PERMISSIONS = {
    "dashboard:view": "Visualizar Dashboard",
    "users:view": "Visualizar Usuários",
    "users:manage": "Criar/Editar Usuários",
    "companies:view": "Visualizar Empresas",
    "companies:manage": "Gerenciar Empresas",
    "contracts:view": "Visualizar Contratos",
    "contracts:manage": "Gerenciar Contratos",
    "settings:view": "Visualizar Configurações",
    "settings:manage": "Editar Configurações",
} as const;

export type PermissionKey = keyof typeof SYSTEM_PERMISSIONS;

// Estrutura salva no Banco (JSON)
export type AccessControlMatrix = Record<Role, PermissionKey[]>;

// Configuração Padrão (Fallback)
export const DEFAULT_ACCESS_MATRIX: AccessControlMatrix = {
    ADMIN: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],
    DEVELOPER: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],
    SUPORTE: ["dashboard:view", "users:view", "companies:view", "contracts:view"],
    CLIENTE_ADMIN: ["dashboard:view", "contracts:view"],
    CLIENTE_USER: ["dashboard:view"],
};