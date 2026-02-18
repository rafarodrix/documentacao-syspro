// Roles do sistema - espelha o enum do Prisma
export type Role = "DEVELOPER" | "ADMIN" | "SUPORTE" | "CLIENTE_ADMIN" | "CLIENTE_USER";

export const ROLE_LABELS: Record<Role, string> = {
    ADMIN: "Administrador",
    DEVELOPER: "Desenvolvedor",
    SUPORTE: "Suporte",
    CLIENTE_ADMIN: "Gestor",
    CLIENTE_USER: "Usuario",
};

// Permissoes Granulares do Sistema
export const SYSTEM_PERMISSIONS = {
    // --- DASHBOARD ---
    "dashboard:view": "Visualizar Dashboard",
    "dashboard:stats_full": "Ver estatisticas completas (empresas, usuarios, SEFAZ)",

    // --- CADASTROS: EMPRESAS ---
    "companies:view": "Visualizar Lista de Empresas",
    "companies:view_all": "Ver TODAS as empresas",
    "companies:view_own": "Ver apenas a propria empresa",
    "companies:create": "Cadastrar Nova Empresa",
    "companies:edit": "Editar Dados da Empresa",
    "companies:status": "Ativar/Desativar Empresa",

    // --- CADASTROS: USUARIOS ---
    "users:view": "Visualizar Lista de Usuarios",
    "users:view_all": "Ver TODOS os usuarios",
    "users:view_team": "Ver equipe da propria empresa",
    "users:create": "Cadastrar/Convidar Usuario",
    "users:edit": "Editar Usuario",
    "users:reset_password": "Resetar Senha de Usuario",
    "users:status": "Ativar/Desativar Acesso",

    // --- CONTRATOS ---
    "contracts:view": "Visualizar Contratos",
    "contracts:create": "Criar Contrato",
    "contracts:edit": "Editar Contrato",

    // --- CONFIGURACOES ---
    "settings:view": "Visualizar Configuracoes",
    "settings:edit": "Editar Configuracoes",

    // --- FERRAMENTAS ---
    "tools:view": "Acessar Ferramentas",
    "tools:all": "Todas as ferramentas",
    "tools:basic": "Ferramentas basicas",

    // --- CHAMADOS ---
    "tickets:view_own": "Ver proprios chamados",
    "tickets:view_all": "Ver todos os chamados",
    "tickets:create": "Criar chamado",
    "tickets:manage": "Gerenciar chamados (atribuir, fechar)",

    // --- REFORMA TRIBUTARIA ---
    "tax_reform:view": "Visualizar Reforma Tributaria",
    "tax_reform:manage": "Gerenciar Dados Tributarios",

    // --- SISTEMA ---
    "system_team:view": "Visualizar Equipe Interna",
    "system_team:manage": "Gerenciar Equipe Interna",
} as const;

export type PermissionKey = keyof typeof SYSTEM_PERMISSIONS;

export type AccessControlMatrix = Record<Role, PermissionKey[]>;

// Matriz de Acesso (Quem pode fazer o que)
export const ACCESS_MATRIX: AccessControlMatrix = {
    // SUPER ADMIN e DEV: Podem tudo
    ADMIN: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],
    DEVELOPER: Object.keys(SYSTEM_PERMISSIONS) as PermissionKey[],

    // SUPORTE: Ve tudo, gerencia chamados, acesso a ferramentas
    SUPORTE: [
        "dashboard:view",
        "companies:view", "companies:view_all",
        "users:view", "users:view_all", "users:reset_password",
        "tickets:view_all", "tickets:create", "tickets:manage",
        "tools:view", "tools:all",
        "tax_reform:view",
    ],

    // GESTOR DO CLIENTE: Gerencia a propria empresa e equipe
    CLIENTE_ADMIN: [
        "dashboard:view",
        "companies:view", "companies:view_own", "companies:edit",
        "users:view", "users:view_team", "users:create", "users:edit", "users:status",
        "tickets:view_own", "tickets:create",
        "tools:view", "tools:basic",
    ],

    // USUARIO COMUM: Apenas visualiza o basico
    CLIENTE_USER: [
        "dashboard:view",
        "tickets:view_own", "tickets:create",
        "tools:view", "tools:basic",
    ],
};
