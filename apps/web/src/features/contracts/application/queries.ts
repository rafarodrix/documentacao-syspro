"use server";

import { headers } from "next/headers";
import { getProtectedSession } from "@/lib/auth-helpers";
import {
  contractsAdminViewSchema,
  contractSuspendImpactSchema,
  contractSystemParamsSchema,
} from "@dosc-syspro/contracts/contract";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";
import type {
  ContractActionResponse,
  ContractListItem,
  ContractsAdminViewData,
  ContractSuspendImpact,
  ContractSystemParams,
} from "@/features/contracts/domain/model";

async function apiRequest(path: string, init?: RequestInit) {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");

  return fetch(`${getBackendApiBaseUrl()}${path}`, {
    ...init,
    headers: withInternalApiHeaders({
      ...(cookie ? { cookie } : {}),
      ...(init?.headers ?? {}),
    }),
    cache: "no-store",
  });
}

export async function getSystemParamsAction(): Promise<ContractActionResponse<ContractSystemParams>> {
  const session = await getProtectedSession();
  if (!session) return { success: false, error: "Nao autorizado." };

  try {
    const response = await apiRequest("/settings/contracts/system-params");
    const payload = await response.json().catch(() => null);
    const parsed = contractSystemParamsSchema.safeParse(payload?.data);

    if (!response.ok || !parsed.success) {
      return { success: false, error: "Erro ao carregar parametros." };
    }

    return { success: true, data: parsed.data };
  } catch (error) {
    console.error("Erro ao buscar parametros do sistema:", error);
    return { success: false, error: "Erro ao carregar parametros." };
  }
}

export async function getContractsAction(): Promise<ContractActionResponse<ContractListItem[]>> {
  const session = await getProtectedSession();
  if (!session) return { success: false, error: "Nao autorizado." };

  try {
    const adminView = await getContractsAdminViewData();
    return { success: true, data: adminView.contracts };
  } catch (error) {
    console.error("Erro ao buscar contratos:", error);
    return { success: false, error: "Erro ao carregar contratos." };
  }
}

export async function getContractSuspendImpactAction(
  contractId: string,
): Promise<ContractActionResponse<ContractSuspendImpact>> {
  const session = await getProtectedSession();
  if (!session) {
    return { success: false, error: "Permissao negada." };
  }

  try {
    const response = await apiRequest(`/settings/contracts/${encodeURIComponent(contractId)}/suspend-impact`);
    const payload = await response.json().catch(() => null);
    const parsed = contractSuspendImpactSchema.safeParse(payload?.data);

    if (!response.ok || !parsed.success) {
      return {
        success: false,
        error: typeof payload?.error === "string" ? payload.error : "Erro ao consultar impacto.",
      };
    }

    return { success: true, data: parsed.data };
  } catch (error) {
    console.error("Erro ao consultar impacto de suspensao do contrato:", error);
    return { success: false, error: "Erro ao consultar impacto." };
  }
}

export async function getContractsAdminViewData(): Promise<ContractsAdminViewData> {
  try {
    const response = await apiRequest("/settings/contracts/admin-view");
    const payload = await response.json().catch(() => null);
    const parsed = contractsAdminViewSchema.safeParse(payload?.data);

    if (!response.ok || !parsed.success) {
      return { contracts: [], companies: [] };
    }

    return parsed.data;
  } catch {
    return { contracts: [], companies: [] };
  }
}
