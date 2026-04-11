"use server";

import { type SettingsOutput } from "@dosc-syspro/contracts";
import { type SefazRoutesInput } from "@dosc-syspro/contracts";
import { buildDefaultSefazRoutes } from "@dosc-syspro/contracts";
import type { SettingsActionResponse, SettingsAdminViewData } from "@/features/settings/domain/model";
import {
  getSettingsPermissionsAdminViewAction,
} from "@/features/settings/permissions/application/permissions-actions";
import { buildFallbackSettingsPermissionsCatalog } from "@/features/settings/permissions/domain/catalog";
import {
  fetchGeneralSettingsGateway,
  fetchSefazRoutesGateway,
} from "@/features/settings/infrastructure/settings.gateway";

export async function getSettingsAction(): Promise<SettingsActionResponse<SettingsOutput>> {
  try {
    const response = await fetchGeneralSettingsGateway();
    if (!response.success || !response.data) {
      return { success: false, error: response.error || "Erro ao carregar dados." };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Erro ao buscar configuracoes:", error);
    return { success: false, error: "Erro ao carregar dados." };
  }
}

export async function getSefazRoutesAction(): Promise<SettingsActionResponse<SefazRoutesInput>> {
  try {
    const response = await fetchSefazRoutesGateway();
    if (!response.success || !response.data) {
      return { success: false, error: response.error || "Erro ao carregar rotas SEFAZ." };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Erro ao carregar rotas SEFAZ:", error);
    return { success: false, error: "Erro ao carregar rotas SEFAZ." };
  }
}

export async function getSettingsAdminViewData(): Promise<SettingsAdminViewData> {
  const [settingsRes, sefazRoutesRes, permissionsAdminViewRes] = await Promise.all([
    getSettingsAction(),
    getSefazRoutesAction(),
    getSettingsPermissionsAdminViewAction(),
  ]);

  if (!settingsRes.success) {
    throw new Error(settingsRes.error || "Falha ao carregar configuracoes.");
  }

  if (!sefazRoutesRes.success) {
    throw new Error(sefazRoutesRes.error || "Falha ao carregar rotas SEFAZ.");
  }

  if (!permissionsAdminViewRes.success || !permissionsAdminViewRes.data) {
    throw new Error(permissionsAdminViewRes.error || "Falha ao carregar a administracao de acessos.");
  }

  const matrixEnabled = settingsRes.data.rbacMatrixEnabled;
  const fallbackCatalog = buildFallbackSettingsPermissionsCatalog(matrixEnabled);

  return {
    rbacMatrixEnabled: matrixEnabled,
    sefazRoutes: sefazRoutesRes.data ?? buildDefaultSefazRoutes(),
    permissionsAdminView: permissionsAdminViewRes.data ?? {
      catalog: fallbackCatalog,
      profiles: fallbackCatalog.profiles.map((profile) => ({
        id: profile.key,
        key: profile.key,
        label: profile.label,
        description: "Perfil padrao em modo fallback.",
        isSystem: true,
        isActive: true,
        permissions: profile.permissions,
      })),
      users: [],
      companies: [],
      assignments: [],
    },
  };
}
