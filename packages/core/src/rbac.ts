import { ACCESS_MATRIX, type PermissionKey, type Role } from "./config/permissions";

/**
 * Verifica se uma Role tem permissao para realizar uma acao.
 * Esta funcao e SINCRONA (instantanea) e nao consome banco de dados.
 */
export function hasPermission(role: Role, permission: PermissionKey): boolean {
    // 1. Failsafe de Seguranca: Super Admins e Devs sempre podem tudo
    if (role === "ADMIN" || role === "DEVELOPER") {
        return true;
    }

    // 2. Busca as permissoes da Role na Matriz Estatica
    const allowedPermissions = ACCESS_MATRIX[role];

    // Se a role nao estiver configurada, nega por seguranca
    if (!allowedPermissions) {
        return false;
    }

    // 3. Verifica se a permissao existe na lista
    return allowedPermissions.includes(permission);
}

/**
 * Verifica se o usuario tem PELO MENOS UMA das permissoes listadas.
 * Util para menus que agrupam varias funcoes (ex: Menu Cadastros).
 */
export function hasAnyPermission(role: Role, permissions: PermissionKey[]): boolean {
    if (role === "ADMIN" || role === "DEVELOPER") return true;

    return permissions.some((p) => hasPermission(role, p));
}
