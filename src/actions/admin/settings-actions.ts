"use server";

import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { settingsSchema, SettingsInput, SETTING_KEYS } from "@/core/application/schema/settings-schema";
import { Role } from "@prisma/client";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER];

export async function getSettingsAction() {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Nao autorizado." };

    try {
        const settings = await prisma.systemSetting.findMany();
        const configMap = settings.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {} as Record<string, string>);

        const data: SettingsInput = {
            minimumWage: Number(configMap[SETTING_KEYS.MIN_WAGE] || 0),
            maintenanceMode: configMap[SETTING_KEYS.MAINTENANCE] === "true",
            supportEmail: configMap[SETTING_KEYS.SUPPORT_EMAIL] || "",
            supportPhone: configMap[SETTING_KEYS.SUPPORT_PHONE] || "",
            rbacMatrixEnabled: configMap[SETTING_KEYS.RBAC_MATRIX_ENABLED] !== "false",
        };

        return { success: true, data };
    } catch (error) {
        console.error("Erro ao buscar configuracoes:", error);
        return { success: false, error: "Erro ao carregar dados." };
    }
}

export async function updateSettingsAction(data: SettingsInput) {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissao negada." };
    }

    const validation = settingsSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Dados invalidos." };
    }

    try {
        await prisma.$transaction([
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.MIN_WAGE },
                update: { value: String(data.minimumWage) },
                create: { key: SETTING_KEYS.MIN_WAGE, value: String(data.minimumWage), description: "Salario minimo base" },
            }),
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.MAINTENANCE },
                update: { value: String(data.maintenanceMode) },
                create: { key: SETTING_KEYS.MAINTENANCE, value: String(data.maintenanceMode), description: "Modo manutencao" },
            }),
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.SUPPORT_EMAIL },
                update: { value: data.supportEmail },
                create: { key: SETTING_KEYS.SUPPORT_EMAIL, value: data.supportEmail, description: "Email de suporte" },
            }),
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.SUPPORT_PHONE },
                update: { value: data.supportPhone },
                create: { key: SETTING_KEYS.SUPPORT_PHONE, value: data.supportPhone, description: "Telefone de suporte" },
            }),
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.RBAC_MATRIX_ENABLED },
                update: { value: String(data.rbacMatrixEnabled) },
                create: { key: SETTING_KEYS.RBAC_MATRIX_ENABLED, value: String(data.rbacMatrixEnabled), description: "Visibilidade da matriz RBAC" },
            }),
        ]);

        revalidatePath("/app/configuracoes");
        return { success: true, message: "Configuracoes salvas." };
    } catch (error) {
        console.error("Erro ao salvar configuracoes:", error);
        return { success: false, error: "Erro interno ao salvar." };
    }
}

export async function updateRbacMatrixVisibilityAction(enabled: boolean) {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissao negada." };
    }

    try {
        await prisma.systemSetting.upsert({
            where: { key: SETTING_KEYS.RBAC_MATRIX_ENABLED },
            update: { value: String(enabled) },
            create: {
                key: SETTING_KEYS.RBAC_MATRIX_ENABLED,
                value: String(enabled),
                description: "Visibilidade da matriz RBAC",
            },
        });

        revalidatePath("/app/configuracoes");
        return { success: true, message: enabled ? "Matriz RBAC ativada." : "Matriz RBAC desativada." };
    } catch (error) {
        console.error("Erro ao atualizar visibilidade da matriz RBAC:", error);
        return { success: false, error: "Erro ao atualizar configuracao." };
    }
}
