import { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
    ADMIN: "Administrador",
    DEVELOPER: "Desenvolvedor",
    SUPORTE: "Suporte",
    CLIENTE_ADMIN: "Gestor",
    CLIENTE_USER: "Usuário",
};

// 1. Permissões Granulares
export const SYSTEM_PERMISSIONS = {
    // --- GERAL ---
    "dashboard:view": "Visualizar Dashboard",

    // --- CADASTROS: EMPRESAS ---
    "companies:view": "Visualizar Lista de Empresas",
    "companies:create": "Cadastrar Nova Empresa",
    "companies:edit": "Editar Dados da Empresa",
    "companies:status": "Ativar/Desativar Empresa",

    // --- CADASTROS: USUÁRIOS ---
    "users:view": "Visualizar Lista de Usuários",
    "users:create": "Cadastrar/Convidar Usuário",
    "users:edit": "Editar Usuário",
    "users:reset_password": "Resetar Senha de Usuário",
    "users:status": "Ativar/Desativar Acesso",

    // --- CADASTROS: SISTEMA (Equipe Interna) ---
    "system_team:view": "Visualizar Equipe Interna",
    "system_team:manage": "Gerenciar Equipe Interna",
} as const;

export type PermissionKey = keyof typeof SYSTEM_PERMISSIONS;

export type AccessControlMatrix = Record<Role, PermissionKey[]>;

// 2. Matriz de Acesso (Quem pode fazer o quê)
export const ACCESS_MATRIX: AccessControlMatrix = {
    // SUPER ADMIN e DEV: Podem tudo
    ADMIN: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],
    DEVELOPER: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],

    // SUPORTE: Vê tudo, mas só edita usuários básicos e reseta senhas
    SUPORTE: [
        "dashboard:view",
        "companies:view",
        "users:view", "users:reset_password"
    ],

    // GESTOR DO CLIENTE: Gerencia a própria empresa e equipe
    CLIENTE_ADMIN: [
        "dashboard:view",
        "companies:view", "companies:edit", // Vê e edita a própria
        "users:view", "users:create", "users:edit", "users:status" // Gerencia equipe
    ],

    // USUÁRIO COMUM: Apenas visualiza o básico (se necessário)
    CLIENTE_USER: [
        "dashboard:view"
        // Não vê lista de usuários nem edita empresa
    ],
};