import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { AccessControlMatrix, DEFAULT_ACCESS_MATRIX } from "@/core/config/permissions";

export async function hasPermission(role: Role, permission: string): Promise<boolean> {
    // 1. Busca do banco
    const setting = await prisma.systemSetting.findUnique({
        where: { key: "access_control_config" },
    });

    let matrix: AccessControlMatrix = DEFAULT_ACCESS_MATRIX;

    if (setting?.value) {
        try {
            matrix = JSON.parse(setting.value);
        } catch {
            // Se falhar o parse, mantém o padrão silenciosamente
        }
    }

    // 2. Verifica a role na matriz
    const userPerms = matrix[role];

    // Se a role não existir na matriz (ex: nova role criada no banco mas não no config), nega acesso
    if (!userPerms) return false;

    // Admin/Dev sempre tem acesso total (failsafe de segurança)
    if (role === 'ADMIN' || role === 'DEVELOPER') return true;

    // 3. Verifica se a permissão está na lista
    // Usamos 'as any' para permitir checar string genérica contra tipos literais
    return userPerms.includes(permission as any);
}