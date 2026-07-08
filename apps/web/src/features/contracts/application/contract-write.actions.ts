"use server";

import {
  batchReadjustContractsSchema,
  createContractSchema,
  DEFAULT_CONTRACT_TAX_RATE,
  type ContractStatusValue,
  type CreateContractOutput,
  type UpdateContractOutput,
  updateContractSchema,
} from "@dosc-syspro/contracts/contract";
import type { ContractBlockReason } from "@dosc-syspro/core";
import { revalidateContractsViews } from "@/lib/cache-invalidation";
import {
  canAccessServerAction,
  createWebApiRequest,
  parseActionResponse,
} from "@/lib/server-action-api";
import type { ContractActionResponse } from "@/features/contracts/domain/contract.types";
const apiRequest = createWebApiRequest("/api");

export async function createContractAction(data: CreateContractOutput): Promise<ContractActionResponse> {
  if (!(await canAccessServerAction(["contracts:create", "contracts:edit"]))) {
    return { success: false, error: "Permissao negada." };
  }

  const validation = createContractSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: "Dados invalidos." };
  }

  try {
    const response = await apiRequest("/platform/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validation.data,
        minimumWage: validation.data.minimumWage > 0 ? validation.data.minimumWage : 1412,
        taxRate: validation.data.allowTaxOverride ? validation.data.taxRate : DEFAULT_CONTRACT_TAX_RATE,
      }),
    });

    const result = await parseActionResponse<ContractActionResponse>(response, "Erro interno ao salvar contrato.");
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
  if (!(await canAccessServerAction("contracts:edit"))) {
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...parsed,
        taxRate: parsed.allowTaxOverride ? parsed.taxRate : DEFAULT_CONTRACT_TAX_RATE,
      }),
    });

    const result = await parseActionResponse<ContractActionResponse>(response, "Erro ao atualizar contrato.");
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
  if (!(await canAccessServerAction("contracts:edit"))) {
    return { success: false, error: "Permissao negada. Apenas administradores podem reajustar contratos." };
  }

  const validation = batchReadjustContractsSchema.safeParse({ minimumWage: newMinimumWage });
  if (!validation.success) {
    return { success: false, error: "Valor do novo salario minimo invalido." };
  }

  try {
    const response = await apiRequest("/platform/contracts/batch-readjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validation.data),
    });

    const result = await parseActionResponse<ContractActionResponse<{ affected: number }>>(response, "Erro ao aplicar reajuste em massa.");
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
  if (!(await canAccessServerAction("contracts:edit"))) {
    return { success: false, error: "Permissao negada." };
  }

  try {
    const response = await apiRequest(`/platform/contracts/${encodeURIComponent(contractId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        reason: reason ?? null,
        details: details ?? null,
      }),
    });

    const result = await parseActionResponse<ContractActionResponse>(response, "Erro ao atualizar status do contrato.");
    if (result.success) {
      revalidateContractsViews();
    }

    return result;
  } catch (error) {
    console.error("Erro ao atualizar status do contrato:", error);
    return { success: false, error: "Erro ao atualizar status do contrato." };
  }
}

export async function deleteContractAction(contractId: string): Promise<ContractActionResponse> {
  if (!(await canAccessServerAction("contracts:delete"))) {
    return { success: false, error: "Permissao negada." };
  }

  try {
    const response = await apiRequest(`/platform/contracts/${encodeURIComponent(contractId)}`, {
      method: "DELETE",
    });

    const result = await parseActionResponse<ContractActionResponse>(response, "Erro ao excluir contrato.");
    if (result.success) {
      revalidateContractsViews();
    }

    return result;
  } catch (error) {
    console.error("Erro ao excluir contrato:", error);
    return { success: false, error: "Erro ao excluir contrato." };
  }
}
