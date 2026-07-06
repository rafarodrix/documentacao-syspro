"use server";

import {
  contractsAdminViewSchema,
  contractSuspendImpactSchema,
  contractSystemParamsSchema,
} from "@dosc-syspro/contracts/contract";
import {
  canAccessServerAction,
  createWebApiRequest,
  readJsonResponse,
} from "@/lib/server-action-api";
import type {
  ContractActionResponse,
  ContractListItem,
  ContractsAdminViewData,
  ContractSuspendImpact,
  ContractSystemParams,
} from "@/features/contracts/domain/contract.types";

const apiRequest = createWebApiRequest("/api");

export async function getSystemParamsAction(): Promise<ContractActionResponse<ContractSystemParams>> {
  if (!(await canAccessServerAction("contracts:view"))) {
    return { success: false, error: "Nao autorizado." };
  }

  try {
    const response = await apiRequest("/platform/contracts/system-params");
    const payload = await readJsonResponse<any>(response);
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
  if (!(await canAccessServerAction("contracts:view"))) {
    return { success: false, error: "Nao autorizado." };
  }

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
  if (!(await canAccessServerAction("contracts:view"))) {
    return { success: false, error: "Permissao negada." };
  }

  try {
    const response = await apiRequest(`/platform/contracts/${encodeURIComponent(contractId)}/suspend-impact`);
    const payload = await readJsonResponse<any>(response);
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
    const response = await apiRequest("/platform/contracts/admin-view");
    const payload = await readJsonResponse<any>(response);
    const parsed = contractsAdminViewSchema.safeParse(payload?.data);

    if (!response.ok || !parsed.success) {
      return { contracts: [], companies: [] };
    }

    return parsed.data;
  } catch {
    return { contracts: [], companies: [] };
  }
}
