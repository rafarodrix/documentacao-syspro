"use server";

import { getProtectedSession } from "@/lib/auth-helpers";
import {
  batchReadjustContractsSchema,
  createContractSchema,
  DEFAULT_CONTRACT_TAX_RATE,
  type ContractStatusValue,
  type CreateContractOutput,
  type UpdateContractOutput,
  updateContractSchema,
} from "@dosc-syspro/contracts/contract";
import { SYSTEM_ROLES } from "@dosc-syspro/core";
import type { ContractBlockReason } from "@dosc-syspro/core";
import { callWebApi } from "@/lib/web-api";
import { revalidateContractsViews } from "@/lib/cache-invalidation";
import type { ContractActionResponse } from "@/features/contracts/domain/contract.types";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

async function apiRequest(path: string, init?: RequestInit) {
  return callWebApi(`/api${path}`, init);
}

async function parseActionResponse<T = void>(
  response: Response,
  fallbackMessage: string,
): Promise<ContractActionResponse<T>> {
  try {
    const payload = (await response.json()) as Partial<ContractActionResponse<T>>;
    if (response.ok && payload.success) {
      return payload as ContractActionResponse<T>;
    }

    if (payload.success === false && "error" in payload && typeof payload.error === "string") {
      return { success: false, error: payload.error };
    }

    return { success: false, error: fallbackMessage };
  } catch {
    return { success: false, error: fallbackMessage };
  }
}

export async function createContractAction(data: CreateContractOutput): Promise<ContractActionResponse> {
  const session = await getProtectedSession();

  if (!session || !(await currentUserHasPermission("contracts:edit"))) {
    return { success: false, error: "Permissao negada." };
  }

  const validation = createContractSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "Dados invalidos." };
  }

  try {
    const response = await apiRequest("/platform/contracts", {
      method: "POST",
      body: JSON.stringify({
        ...validation.data,
        minimumWage: validation.data.minimumWage > 0 ? validation.data.minimumWage : 1412,
        taxRate: validation.data.allowTaxOverride ? validation.data.taxRate : DEFAULT_CONTRACT_TAX_RATE,
      }),
    });

    const result = await parseActionResponse(response, "Erro interno ao salvar contrato.");
    if (result.success) {
      revalidateContractsViews();
    }

    return result;
  } catch (error) {
    console.error("Erro ao criar contrato:", error);
    return { success: false, error: "Erro interno ao salvar contrato." };
  }
}

export async function updateContractAction(data: UpdateContractOutput): Promise<ContractActionResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("contracts:edit"))) {
    return { success: false, error: "Permissao negada." };
  }

  const validation = updateContractSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "Dados invalidos." };
  }

  try {
    const parsed = validation.data;
    const response = await apiRequest(`/platform/contracts/${encodeURIComponent(parsed.id)}`, {
      method: "PUT",
      body: JSON.stringify({
        ...parsed,
        taxRate: parsed.allowTaxOverride ? parsed.taxRate : DEFAULT_CONTRACT_TAX_RATE,
      }),
    });

    const result = await parseActionResponse(response, "Erro ao atualizar contrato.");
    if (result.success) {
      revalidateContractsViews();
    }

    return result;
  } catch (error) {
    console.error("Erro ao atualizar contrato:", error);
    return { success: false, error: "Erro ao atualizar contrato." };
  }
}

export async function batchReadjustContractsAction(
  newMinimumWage: number,
): Promise<ContractActionResponse<{ affected: number }>> {
  const session = await getProtectedSession();

  if (!session || !(await currentUserHasPermission("contracts:edit"))) {
    return { success: false, error: "Permissao negada. Apenas administradores podem reajustar contratos." };
  }

  const validation = batchReadjustContractsSchema.safeParse({ minimumWage: newMinimumWage });
  if (!validation.success) {
    return { success: false, error: "Valor do novo salario minimo invalido." };
  }

  try {
    const response = await apiRequest("/platform/contracts/batch-readjust", {
      method: "POST",
      body: JSON.stringify(validation.data),
    });

    const result = await parseActionResponse<{ affected: number }>(response, "Erro ao aplicar reajuste em massa.");
    if (result.success) {
      revalidateContractsViews(false);
    }

    return result;
  } catch (error) {
    console.error("Erro ao reajustar contratos:", error);
    return { success: false, error: "Erro ao aplicar reajuste em massa." };
  }
}

export async function updateContractStatusAction(
  contractId: string,
  status: ContractStatusValue,
  reason?: ContractBlockReason | null,
  details?: string | null,
): Promise<ContractActionResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("contracts:edit"))) {
    return { success: false, error: "Permissao negada." };
  }

  try {
    const response = await apiRequest(`/platform/contracts/${encodeURIComponent(contractId)}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        reason: reason ?? null,
        details: details ?? null,
      }),
    });

    const result = await parseActionResponse(response, "Erro ao atualizar status do contrato.");
    if (result.success) {
      revalidateContractsViews();
    }

    return result;
  } catch (error) {
    console.error("Erro ao atualizar status do contrato:", error);
    return { success: false, error: "Erro ao atualizar status do contrato." };
  }
}
