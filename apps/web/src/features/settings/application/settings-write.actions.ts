"use server";

import {
  interstateIcmsSettingsSchema,
  type InterstateIcmsSettings,
  settingsSchema,
  type SettingsOutput,
} from "@dosc-syspro/contracts/settings";
import { sefazRoutesSchema, type SefazRoutesInput } from "@dosc-syspro/contracts/sefaz-routes";
import { revalidateSettingsViews } from "@/lib/cache-invalidation";
import { toMessageActionResponse } from "@/lib/server-action-api";
import type { SettingsActionResponse } from "@/features/settings/domain/settings.types";
import { updateSettingsPermissionsMatrixVisibilityAction } from "@/features/settings/permissions/application/permissions-actions";
import {
  runSefazCheckGateway,
  updateInterstateIcmsSettingsGateway,
  updateGeneralSettingsGateway,
  updateSefazRoutesGateway,
} from "@/features/settings/infrastructure/gateways/settings.gateway";

export async function updateSettingsAction(data: SettingsOutput): Promise<SettingsActionResponse> {
  const validation = settingsSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "Dados invalidos." };
  }

  try {
    const result = toMessageActionResponse(
      await updateGeneralSettingsGateway(validation.data),
      "Erro interno ao salvar.",
      "Configuracoes salvas.",
    );
    if (!result.success) return result;

    revalidateSettingsViews();
    return result;
  } catch (error) {
    console.error("Erro ao salvar configuracoes:", error);
    return { success: false, error: "Erro interno ao salvar." };
  }
}

export async function updateRbacMatrixVisibilityAction(enabled: boolean): Promise<SettingsActionResponse> {
  return updateSettingsPermissionsMatrixVisibilityAction(enabled);
}

export async function updateSefazRoutesAction(routes: SefazRoutesInput): Promise<SettingsActionResponse> {
  const validation = sefazRoutesSchema.safeParse(routes);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message ?? "Dados invalidos para rotas SEFAZ.";
    return { success: false, error: firstIssue };
  }

  try {
    const result = toMessageActionResponse(
      await updateSefazRoutesGateway(validation.data),
      "Erro ao salvar rotas SEFAZ.",
      "Rotas SEFAZ salvas com sucesso.",
    );
    if (!result.success) return result;

    revalidateSettingsViews();
    return result;
  } catch (error) {
    console.error("Erro ao salvar rotas SEFAZ:", error);
    return { success: false, error: "Erro ao salvar rotas SEFAZ." };
  }
}

export async function runSefazCheckAction(): Promise<SettingsActionResponse> {
  try {
    const response = await runSefazCheckGateway();
    if (!response.success) {
      return { success: false, error: response.error || "Erro ao executar verificacao SEFAZ." };
    }

    revalidateSettingsViews(true);
    return {
      success: true,
      message: response.message || `Verificacao concluida (${response.data?.count ?? 0} rotas).`,
    };
  } catch (error) {
    console.error("Erro ao executar verificacao SEFAZ:", error);
    return { success: false, error: "Erro ao executar verificacao SEFAZ." };
  }
}

export async function updateInterstateIcmsSettingsAction(
  rows: InterstateIcmsSettings,
): Promise<SettingsActionResponse> {
  const validation = interstateIcmsSettingsSchema.safeParse(rows);
  if (!validation.success) {
    const firstIssue = validation.error.issues[0]?.message ?? "Dados invalidos para ICMS interestadual.";
    return { success: false, error: firstIssue };
  }

  try {
    const result = toMessageActionResponse(
      await updateInterstateIcmsSettingsGateway(validation.data),
      "Erro ao salvar configuracao interestadual.",
      "Configuracao interestadual salva com sucesso.",
    );
    if (!result.success) return result;

    revalidateSettingsViews();
    return result;
  } catch (error) {
    console.error("Erro ao salvar configuracao interestadual:", error);
    return { success: false, error: "Erro ao salvar configuracao interestadual." };
  }
}
