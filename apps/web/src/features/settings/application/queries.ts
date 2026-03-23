"use server";

import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { settingsSchema, type SettingsInput, SETTING_KEYS } from "@dosc-syspro/contracts";
import { Role } from "@prisma/client";
import { sefazRoutesSchema, type SefazRoutesInput } from "@dosc-syspro/contracts";
import { buildDefaultSefazRoutes } from "@dosc-syspro/contracts";
import type { SettingsActionResponse, SettingsAdminViewData } from "@/features/settings/domain/model";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER];

export async function getSettingsAction(): Promise<SettingsActionResponse<SettingsInput>> {
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

    const validation = settingsSchema.safeParse(data);
    if (!validation.success) {
      return { success: false, error: "Erro ao carregar dados." };
    }

    return { success: true, data: validation.data };
  } catch (error) {
    console.error("Erro ao buscar configuracoes:", error);
    return { success: false, error: "Erro ao carregar dados." };
  }
}

export async function getSefazRoutesAction(): Promise<SettingsActionResponse<SefazRoutesInput>> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, error: "Permissao negada." };
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEYS.SEFAZ_ROUTES },
      select: { value: true },
    });

    if (!setting?.value) {
      const defaults = buildDefaultSefazRoutes() satisfies SefazRoutesInput;
      return { success: true, data: defaults };
    }

    const parsedJson = JSON.parse(setting.value);
    const validation = sefazRoutesSchema.safeParse(parsedJson);
    if (!validation.success) {
      return { success: false, error: "Formato invalido das rotas SEFAZ." };
    }

    return { success: true, data: validation.data };
  } catch (error) {
    console.error("Erro ao carregar rotas SEFAZ:", error);
    return { success: false, error: "Erro ao carregar rotas SEFAZ." };
  }
}

export async function getSettingsAdminViewData(): Promise<SettingsAdminViewData> {
  const [rbacSetting, sefazRoutesRes] = await Promise.all([
    prisma.systemSetting.findUnique({
      where: { key: SETTING_KEYS.RBAC_MATRIX_ENABLED },
      select: { value: true },
    }),
    getSefazRoutesAction(),
  ]);

  return {
    rbacMatrixEnabled: rbacSetting?.value !== "false",
    sefazRoutes: sefazRoutesRes.success ? (sefazRoutesRes.data ?? buildDefaultSefazRoutes()) : buildDefaultSefazRoutes(),
  };
}
