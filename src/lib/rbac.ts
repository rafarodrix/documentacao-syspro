import { Role } from "@prisma/client";
import { ACCESS_MATRIX, PermissionKey } from "@/core/config/permissions";

/**
 * Verifica se uma Role tem permissão para realizar uma ação.
 * Esta função é SÍNCRONA (instantânea) e não consome banco de dados.
 */
export function hasPermission(role: Role, permission: PermissionKey): boolean {

    // 1. Failsafe de Segurança: Super Admins e Devs sempre podem tudo
    if (role === 'ADMIN' || role === 'DEVELOPER') {
        return true;
    }

    // 2. Busca as permissões da Role na Matriz Estática
    const allowedPermissions = ACCESS_MATRIX[role];

    // Se a role não estiver configurada, nega por segurança
    if (!allowedPermissions) {
        return false;
    }

    // 3. Verifica se a permissão existe na lista
    return allowedPermissions.includes(permission);
}

/**
 * Verifica se o usuário tem PELO MENOS UMA das permissões listadas.
 * Útil para menus que agrupam várias funções (ex: Menu Cadastros).
 */
export function hasAnyPermission(role: Role, permissions: PermissionKey[]): boolean {
    if (role === 'ADMIN' || role === 'DEVELOPER') return true;

    return permissions.some((p) => hasPermission(role, p));
}