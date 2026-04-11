"use server";

import type {
  SettingsAccessProfileUpsertInput,
  SettingsPermissionsAdminView,
  SettingsPermissionsCatalog,
  SettingsUserAccessProfileCreateInput,
} from "@dosc-syspro/contracts";
import { revalidateSettingsViews } from "@/lib/cache-invalidation";
import type { SettingsActionResponse } from "@/features/settings/domain/model";
import {
  createSettingsUserAccessProfileGateway,
  fetchSettingsPermissionsAdminViewGateway,
  fetchSettingsPermissionsCatalogGateway,
  removeSettingsUserAccessProfileGateway,
  saveSettingsAccessProfileGateway,
  updateSettingsPermissionsMatrixVisibilityGateway,
} from "@/features/settings/permissions/infrastructure/permissions.gateway";

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

export async function getSettingsPermissionsAdminViewAction(): Promise<SettingsActionResponse<SettingsPermissionsAdminView>> {
  try {
    const response = await fetchSettingsPermissionsAdminViewGateway();
    if (!response.success || !response.data) {
      return { success: false, error: response.error || "Falha ao carregar a administracao de acessos." };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error("Erro ao carregar admin view de permissoes:", error);
    return { success: false, error: "Falha ao carregar a administracao de acessos." };
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

export async function saveSettingsAccessProfileAction(
  input: SettingsAccessProfileUpsertInput,
): Promise<SettingsActionResponse> {
  try {
    const response = await saveSettingsAccessProfileGateway(input);
    if (!response.success) {
      return { success: false, error: response.error || "Falha ao salvar perfil." };
    }

    revalidateSettingsViews();
    return { success: true, message: response.message ?? "Perfil salvo com sucesso." };
  } catch (error) {
    console.error("Erro ao salvar perfil de acesso:", error);
    return { success: false, error: "Falha ao salvar perfil." };
  }
}

export async function createSettingsUserAccessProfileAction(
  input: SettingsUserAccessProfileCreateInput,
): Promise<SettingsActionResponse> {
  try {
    const response = await createSettingsUserAccessProfileGateway(input);
    if (!response.success) {
      return { success: false, error: response.error || "Falha ao vincular perfil." };
    }

    revalidateSettingsViews();
    return { success: true, message: response.message ?? "Perfil vinculado com sucesso." };
  } catch (error) {
    console.error("Erro ao vincular perfil ao usuario:", error);
    return { success: false, error: "Falha ao vincular perfil." };
  }
}

export async function removeSettingsUserAccessProfileAction(
  assignmentId: string,
): Promise<SettingsActionResponse> {
  try {
    const response = await removeSettingsUserAccessProfileGateway(assignmentId);
    if (!response.success) {
      return { success: false, error: response.error || "Falha ao remover vinculo." };
    }

    revalidateSettingsViews();
    return { success: true, message: response.message ?? "Vinculo removido com sucesso." };
  } catch (error) {
    console.error("Erro ao remover vinculo de perfil:", error);
    return { success: false, error: "Falha ao remover vinculo." };
  }
}
