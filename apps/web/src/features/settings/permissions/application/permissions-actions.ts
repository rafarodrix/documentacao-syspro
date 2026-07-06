"use server";

import type {
  SettingsAccessProfileUpsertInput,
  SettingsPermissionsAdminView,
  SettingsPermissionsCatalog,
  SettingsUserAccessProfileCreateInput,
} from "@dosc-syspro/contracts/settings";
import { revalidateSettingsViews } from "@/lib/cache-invalidation";
import {
  toDataActionResponse,
  toMessageActionResponse,
} from "@/lib/server-action-api";
import type { SettingsActionResponse } from "@/features/settings/domain/settings.types";
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
    return toDataActionResponse(await fetchSettingsPermissionsCatalogGateway(), "Falha ao carregar permissoes.");
  } catch (error) {
    console.error("Erro ao carregar catalogo de permissoes:", error);
    return { success: false, error: "Falha ao carregar permissoes." };
  }
}

export async function getSettingsPermissionsAdminViewAction(): Promise<SettingsActionResponse<SettingsPermissionsAdminView>> {
  try {
    return toDataActionResponse(
      await fetchSettingsPermissionsAdminViewGateway(),
      "Falha ao carregar a administracao de acessos.",
    );
  } catch (error) {
    console.error("Erro ao carregar admin view de permissoes:", error);
    return { success: false, error: "Falha ao carregar a administracao de acessos." };
  }
}

export async function updateSettingsPermissionsMatrixVisibilityAction(enabled: boolean): Promise<SettingsActionResponse> {
  try {
    const result = toMessageActionResponse(
      await updateSettingsPermissionsMatrixVisibilityGateway(enabled),
      "Falha ao atualizar configuracao.",
      "Configuracao atualizada.",
    );
    if (!result.success) return result;

    revalidateSettingsViews();
    return result;
  } catch (error) {
    console.error("Erro ao atualizar visibilidade da matriz RBAC:", error);
    return { success: false, error: "Erro ao atualizar configuracao." };
  }
}

export async function saveSettingsAccessProfileAction(
  input: SettingsAccessProfileUpsertInput,
): Promise<SettingsActionResponse> {
  try {
    const result = toMessageActionResponse(
      await saveSettingsAccessProfileGateway(input),
      "Falha ao salvar perfil.",
      "Perfil salvo com sucesso.",
    );
    if (!result.success) return result;

    revalidateSettingsViews();
    return result;
  } catch (error) {
    console.error("Erro ao salvar perfil de acesso:", error);
    return { success: false, error: "Falha ao salvar perfil." };
  }
}

export async function createSettingsUserAccessProfileAction(
  input: SettingsUserAccessProfileCreateInput,
): Promise<SettingsActionResponse> {
  try {
    const result = toMessageActionResponse(
      await createSettingsUserAccessProfileGateway(input),
      "Falha ao vincular perfil.",
      "Perfil vinculado com sucesso.",
    );
    if (!result.success) return result;

    revalidateSettingsViews();
    return result;
  } catch (error) {
    console.error("Erro ao vincular perfil ao usuario:", error);
    return { success: false, error: "Falha ao vincular perfil." };
  }
}

export async function removeSettingsUserAccessProfileAction(
  assignmentId: string,
): Promise<SettingsActionResponse> {
  try {
    const result = toMessageActionResponse(
      await removeSettingsUserAccessProfileGateway(assignmentId),
      "Falha ao remover vinculo.",
      "Vinculo removido com sucesso.",
    );
    if (!result.success) return result;

    revalidateSettingsViews();
    return result;
  } catch (error) {
    console.error("Erro ao remover vinculo de perfil:", error);
    return { success: false, error: "Falha ao remover vinculo." };
  }
}
