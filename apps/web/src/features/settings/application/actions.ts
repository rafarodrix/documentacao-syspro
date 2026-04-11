"use server";

import { prisma } from "@/lib/prisma";
import { settingsSchema, type SettingsOutput, SETTING_KEYS } from "@dosc-syspro/contracts";
import { sefazRoutesSchema, type SefazRoutesInput } from "@dosc-syspro/contracts";
import { SefazService } from "@/app/api/sefaz/sefaz.service";
import { revalidateSettingsViews } from "@/lib/cache-invalidation";
import type { SettingsActionResponse } from "@/features/settings/domain/model";
import { updateSettingsPermissionsMatrixVisibilityAction } from "@/features/settings/permissions/application/permissions-actions";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

export async function updateSettingsAction(data: SettingsOutput): Promise<SettingsActionResponse> {
  if (!(await currentUserHasPermission("settings:edit"))) {
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

    revalidateSettingsViews();
    return { success: true, message: "Configuracoes salvas." };
  } catch (error) {
    console.error("Erro ao salvar configuracoes:", error);
    return { success: false, error: "Erro interno ao salvar." };
  }
}

export async function updateRbacMatrixVisibilityAction(enabled: boolean): Promise<SettingsActionResponse> {
  return updateSettingsPermissionsMatrixVisibilityAction(enabled);
}

export async function updateSefazRoutesAction(routes: SefazRoutesInput): Promise<SettingsActionResponse> {
  if (!(await currentUserHasPermission("settings:edit"))) {
    return { success: false, error: "Permissao negada." };
  }

  const validation = sefazRoutesSchema.safeParse(routes);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message ?? "Dados invalidos para rotas SEFAZ.";
    return { success: false, error: firstIssue };
  }

  try {
    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEYS.SEFAZ_ROUTES },
      update: { value: JSON.stringify(validation.data) },
      create: {
        key: SETTING_KEYS.SEFAZ_ROUTES,
        value: JSON.stringify(validation.data),
        description: "Rotas de monitoramento SEFAZ por UF/servico",
      },
    });

    revalidateSettingsViews();
    return { success: true, message: "Rotas SEFAZ salvas com sucesso." };
  } catch (error) {
    console.error("Erro ao salvar rotas SEFAZ:", error);
    return { success: false, error: "Erro ao salvar rotas SEFAZ." };
  }
}

export async function runSefazCheckAction(): Promise<SettingsActionResponse> {
  if (!(await currentUserHasPermission("settings:edit"))) {
    return { success: false, error: "Permissao negada." };
  }

  try {
    const service = new SefazService();
    const result = await service.runFullCheck();
    revalidateSettingsViews(true);
    return { success: true, message: `Verificacao concluida (${result.count} rotas).` };
  } catch (error) {
    console.error("Erro ao executar verificacao SEFAZ:", error);
    return { success: false, error: "Erro ao executar verificacao SEFAZ." };
  }
}
