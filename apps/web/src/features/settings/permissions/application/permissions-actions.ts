"use server";

import type { SettingsPermissionsCatalog } from "@dosc-syspro/contracts";
import { revalidateSettingsViews } from "@/lib/cache-invalidation";
import type { SettingsActionResponse } from "@/features/settings/domain/model";
import {
  fetchSettingsPermissionsCatalogGateway,
  updateSettingsPermissionsMatrixVisibilityGateway,
} from "@/features/settings/permissions/infrastructure/permissions.gateway";
import { buildFallbackSettingsPermissionsCatalog } from "@/features/settings/permissions/domain/catalog";

export async function getSettingsPermissionsCatalogAction(): Promise<SettingsActionResponse<SettingsPermissionsCatalog>> {
  try {
    const response = await fetchSettingsPermissionsCatalogGateway();
    if (!response.success || !response.data) {
      return { success: false, error: response.error || "Falha ao carregar permissoes." };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Erro ao carregar catalogo de permissoes:", error);
    return { success: false, error: "Falha ao carregar permissoes." };
  }
}

export async function updateSettingsPermissionsMatrixVisibilityAction(enabled: boolean): Promise<SettingsActionResponse> {
  try {
    const response = await updateSettingsPermissionsMatrixVisibilityGateway(enabled);
    if (!response.success) {
      return { success: false, error: response.error || "Falha ao atualizar configuracao." };
    }

    revalidateSettingsViews();
    return { success: true, message: response.message ?? "Configuracao atualizada." };
  } catch (error) {
    console.error("Erro ao atualizar visibilidade da matriz RBAC:", error);
    return { success: false, error: "Erro ao atualizar configuracao." };
  }
}

export function getFallbackSettingsPermissionsCatalog(matrixEnabled = true) {
  return buildFallbackSettingsPermissionsCatalog(matrixEnabled);
}
