"use server";

import type { SefazRoutesInput } from "@dosc-syspro/contracts/sefaz-routes";
import { buildDefaultSefazRoutes } from "@dosc-syspro/contracts/sefaz-endpoints";
import {
  buildDefaultInterstateIcmsSettings,
  type InterstateIcmsSettings,
  type SettingsOutput,
  type SettingsContractsAdminView,
  type SettingsRemoteAdminView,
} from "@dosc-syspro/contracts/settings";
import {
  requireGatewayData,
  toDataActionResponse,
} from "@/lib/server-action-api";
import type { SettingsActionResponse, SettingsAdminViewData } from "@/features/settings/domain/settings.types";
import {
  getSettingsPermissionsAdminViewAction,
} from "@/features/settings/permissions/application/permissions-actions";
import {
  fetchSettingsContractsAdminViewGateway,
  fetchSettingsRemoteAdminViewGateway,
  fetchGeneralSettingsGateway,
  fetchInterstateIcmsSettingsGateway,
  fetchSefazRoutesGateway,
} from "@/features/settings/infrastructure/gateways/settings.gateway";

export async function getSettingsAction(): Promise<SettingsActionResponse<SettingsOutput>> {
  try {
    return toDataActionResponse(await fetchGeneralSettingsGateway(), "Erro ao carregar dados.");
  } catch (error) {
    console.error("Erro ao buscar configuracoes:", error);
    return { success: false, error: "Erro ao carregar dados." };
  }
}

export async function getSefazRoutesAction(): Promise<SettingsActionResponse<SefazRoutesInput>> {
  try {
    return toDataActionResponse(await fetchSefazRoutesGateway(), "Erro ao carregar rotas SEFAZ.");
  } catch (error) {
    console.error("Erro ao carregar rotas SEFAZ:", error);
    return { success: false, error: "Erro ao carregar rotas SEFAZ." };
  }
}

export async function getInterstateIcmsSettingsAction(): Promise<SettingsActionResponse<InterstateIcmsSettings>> {
  try {
    return toDataActionResponse(
      await fetchInterstateIcmsSettingsGateway(),
      "Erro ao carregar configuracao interestadual.",
    );
  } catch (error) {
    console.error("Erro ao carregar configuracao interestadual:", error);
    return { success: false, error: "Erro ao carregar configuracao interestadual." };
  }
}

export async function getSettingsAdminViewData(): Promise<SettingsAdminViewData> {
  const [settingsRes, sefazRoutesRes, interstateIcmsRes, permissionsAdminViewRes] = await Promise.all([
    getSettingsAction(),
    getSefazRoutesAction(),
    getInterstateIcmsSettingsAction(),
    getSettingsPermissionsAdminViewAction(),
  ]);

  if (!settingsRes.success) {
    throw new Error(settingsRes.error || "Falha ao carregar configuracoes.");
  }

  if (!sefazRoutesRes.success) {
    throw new Error(sefazRoutesRes.error || "Falha ao carregar rotas SEFAZ.");
  }

  if (!interstateIcmsRes.success) {
    throw new Error(interstateIcmsRes.error || "Falha ao carregar configuracao interestadual.");
  }

  const matrixEnabled = settingsRes.data.rbacMatrixEnabled;
  const canManagePermissions = permissionsAdminViewRes.success && Boolean(permissionsAdminViewRes.data);

  return {
    rbacMatrixEnabled: matrixEnabled,
    sefazRoutes: sefazRoutesRes.data ?? buildDefaultSefazRoutes(),
    interstateIcmsSettings: interstateIcmsRes.data ?? buildDefaultInterstateIcmsSettings(),
    permissionsAdminView: canManagePermissions ? permissionsAdminViewRes.data ?? null : null,
  };
}

export async function getSettingsContractsAdminViewData(): Promise<SettingsContractsAdminView> {
  return requireGatewayData(await fetchSettingsContractsAdminViewGateway(), "Falha ao carregar contratos.");
}

export async function getSettingsRemoteAdminViewData(): Promise<SettingsRemoteAdminView> {
  return requireGatewayData(
    await fetchSettingsRemoteAdminViewGateway(),
    "Falha ao carregar dados do modulo remoto.",
  );
}
