"use server";

import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { settingsSchema, SettingsInput, SETTING_KEYS } from "@/core/application/schema/settings-schema";
import {
    DEFAULT_ACCESS_MATRIX,
    AccessControlMatrix
} from "@/core/config/permissions"; // Certifique-se de ter criado este arquivo conforme o passo anterior

const WRITE_ROLES = ["ADMIN", "DEVELOPER"];
const ACCESS_CONTROL_KEY = "access_control_config";

// =========================================================
// SEÇÃO 1: CONFIGURAÇÕES GERAIS (Salário, Manutenção, etc.)
// =========================================================

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
                create: { key: SETTING_KEYS.MIN_WAGE, value: String(data.minimumWage), description: "Salário Mínimo Base" },
            }),
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.MAINTENANCE },
                update: { value: String(data.maintenanceMode) },
                create: { key: SETTING_KEYS.MAINTENANCE, value: String(data.maintenanceMode), description: "Modo Manutenção" },
            }),
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.SUPPORT_EMAIL },
                update: { value: data.supportEmail },
                create: { key: SETTING_KEYS.SUPPORT_EMAIL, value: data.supportEmail, description: "E-mail de Suporte" },
            }),
            prisma.systemSetting.upsert({
                where: { key: SETTING_KEYS.SUPPORT_PHONE },
                update: { value: data.supportPhone },
                create: { key: SETTING_KEYS.SUPPORT_PHONE, value: data.supportPhone, description: "Telefone de Suporte" },
            }),
        ]);

        revalidatePath("/admin/configuracoes");
        return { success: true, message: "Configurações salvas!" };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Erro interno ao salvar." };
    }
}

// =========================================================
// SEÇÃO 2: CONTROLE DE ACESSO (RBAC)
// =========================================================

export async function getAccessControlAction() {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado." };

    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: ACCESS_CONTROL_KEY }
        });

        let matrix: AccessControlMatrix = DEFAULT_ACCESS_MATRIX;

        if (setting?.value) {
            try {
                // Tenta fazer o parse do JSON salvo
                matrix = JSON.parse(setting.value);
            } catch (e) {
                console.error("Erro ao parsear permissões, usando padrão.", e);
                // Se falhar o parse, retorna o padrão para não quebrar a UI
            }
        }

        return { success: true, data: matrix };
    } catch (error) {
        console.error("Erro ao buscar matriz de acesso:", error);
        return { success: false, error: "Erro ao buscar permissões." };
    }
}

export async function updateAccessControlAction(matrix: AccessControlMatrix) {
    const session = await getProtectedSession();

    // Segurança crítica: Apenas ADMIN e DEVELOPER podem alterar permissões
    // Isso impede que um suporte mal-intencionado se dê acesso de admin, por exemplo.
    if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
        return { success: false, error: "Permissão negada. Apenas Administradores." };
    }

    try {
        await prisma.systemSetting.upsert({
            where: { key: ACCESS_CONTROL_KEY },
            update: { value: JSON.stringify(matrix) },
            create: {
                key: ACCESS_CONTROL_KEY,
                value: JSON.stringify(matrix),
                description: "Matriz de Controle de Acesso (RBAC)"
            }
        });

        revalidatePath("/admin/configuracoes");
        return { success: true, message: "Permissões de acesso atualizadas com sucesso!" };
    } catch (error) {
        console.error("Erro ao salvar permissões:", error);
        return { success: false, error: "Erro ao salvar permissões." };
    }
}