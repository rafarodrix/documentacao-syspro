"use server";

import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { settingsSchema, SettingsInput, SETTING_KEYS } from "@/core/validation/settings-schema";

const WRITE_ROLES = ["ADMIN", "DEVELOPER"];

export async function getSettingsAction() {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado." };

    try {
        const settings = await prisma.systemSetting.findMany();

        // Converte o array do banco em objeto
        const configMap = settings.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {} as Record<string, string>);

        // Retorna os dados formatados conforme o Schema
        const data: SettingsInput = {
            minimumWage: Number(configMap[SETTING_KEYS.MIN_WAGE] || 0),
            maintenanceMode: configMap[SETTING_KEYS.MAINTENANCE] === "true",
            supportEmail: configMap[SETTING_KEYS.SUPPORT_EMAIL] || "",
            supportPhone: configMap[SETTING_KEYS.SUPPORT_PHONE] || "",
        };

        return { success: true, data };
    } catch (error) {
        console.error("Erro ao buscar configs:", error);
        return { success: false, error: "Erro ao carregar dados." };
    }
}

export async function updateSettingsAction(data: SettingsInput) {
    const session = await getProtectedSession();

    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, error: "Permissão negada." };
    }

    // Validação no Server-Side
    const validation = settingsSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Dados inválidos." };
    }

    try {
        await prisma.$transaction([
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.MIN_WAGE },
                update: { value: String(data.minimumWage) },
                create: { key: SETTING_KEYS.MIN_WAGE, value: String(data.minimumWage) },
            }),
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.MAINTENANCE },
                update: { value: String(data.maintenanceMode) },
                create: { key: SETTING_KEYS.MAINTENANCE, value: String(data.maintenanceMode) },
            }),
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.SUPPORT_EMAIL },
                update: { value: data.supportEmail },
                create: { key: SETTING_KEYS.SUPPORT_EMAIL, value: data.supportEmail },
            }),
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.SUPPORT_PHONE },
                update: { value: data.supportPhone },
                create: { key: SETTING_KEYS.SUPPORT_PHONE, value: data.supportPhone },
            }),
        ]);

        revalidatePath("/admin/configuracoes");
        return { success: true, message: "Configurações salvas!" };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erro interno ao salvar." };
    }
}